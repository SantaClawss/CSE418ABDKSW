import React, { useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import Navbar from "../homepage/Navbar";
import "../pages/LoginPage.css";
import { Link } from "react-router-dom"; // ← Add this import (if using React Router)

// -----------------------------------------------------------------------------
// In-state boundary verification
// -----------------------------------------------------------------------------
// Instead of a fixed-radius check, we verify the user's GPS position actually
// falls INSIDE the reported state's real borders. We do this with a
// point-in-polygon test against U.S. state boundary polygons.
//
// The boundary data comes from the "us-atlas" 10m TopoJSON dataset — the same
// source Data.js already uses for its maps. TopoJSON is compact (~0.1 MB) and
// covers all 50 states accurately (including tricky spots like far-west Texas
// and the Hawaiian islands), so residents near a border aren't wrongly rejected.
const STATE_BOUNDARIES_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// TopoJSON identifies states by numeric FIPS code, so we map those codes to the
// full state names used elsewhere in this form (matching the US_STATES list).
const FIPS_TO_NAME = {
  "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas",
  "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware",
  "12": "Florida", "13": "Georgia", "15": "Hawaii", "16": "Idaho",
  "17": "Illinois", "18": "Indiana", "19": "Iowa", "20": "Kansas",
  "21": "Kentucky", "22": "Louisiana", "23": "Maine", "24": "Maryland",
  "25": "Massachusetts", "26": "Michigan", "27": "Minnesota", "28": "Mississippi",
  "29": "Missouri", "30": "Montana", "31": "Nebraska", "32": "Nevada",
  "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", "36": "New York",
  "37": "North Carolina", "38": "North Dakota", "39": "Ohio", "40": "Oklahoma",
  "41": "Oregon", "42": "Pennsylvania", "44": "Rhode Island", "45": "South Carolina",
  "46": "South Dakota", "47": "Tennessee", "48": "Texas", "49": "Utah",
  "50": "Vermont", "51": "Virginia", "53": "Washington", "54": "West Virginia",
  "55": "Wisconsin", "56": "Wyoming",
};

/**
 * Convert the raw us-atlas TopoJSON into a plain lookup of
 * { stateName: geometry }, where geometry is standard GeoJSON
 * (a Polygon or MultiPolygon with [longitude, latitude] coordinates).
 *
 * TopoJSON stores geometry as shared "arcs" of delta-encoded integers that must
 * be decoded and scaled back into real coordinates. This mirrors the decoding
 * already done in Data.js.
 *
 * @param {object} topo - The parsed TopoJSON document.
 * @returns {Object<string, object>} Map of state name → GeoJSON geometry.
 */
function buildStateGeometries(topo) {
  const { arcs, transform } = topo;
  const scale = transform?.scale || [1, 1];
  const translate = transform?.translate || [0, 0];

  // Decode one arc: undo the delta-encoding, then apply scale + translate.
  const decodeArc = (arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  };
  // Resolve an arc index to coordinates. A negative index means the arc is
  // shared but traversed in reverse (TopoJSON's ~index convention).
  const arcCoords = (idx) => {
    const reversed = idx < 0;
    const coords = decodeArc(arcs[reversed ? ~idx : idx]);
    return reversed ? [...coords].reverse() : coords;
  };
  // A ring is a list of arc indices; stitch them into one coordinate ring.
  const ringCoords = (ring) => ring.flatMap(arcCoords);

  const geometries = {};
  for (const geom of topo.objects.states.geometries) {
    const name = FIPS_TO_NAME[String(geom.id).padStart(2, "0")];
    if (!name) continue; // Skip territories/DC we don't offer as report options.

    geometries[name] =
      geom.type === "Polygon"
        ? { type: "Polygon", coordinates: geom.arcs.map(ringCoords) }
        : {
            type: "MultiPolygon",
            coordinates: geom.arcs.map((poly) => poly.map(ringCoords)),
          };
  }
  return geometries;
}

// Cache the boundary data as a single shared promise so we only download and
// decode it once, no matter how many times the user submits. On failure we
// reset the cache to null so a later attempt can retry the download.
let stateGeometriesPromise = null;
function loadStateGeometries() {
  if (!stateGeometriesPromise) {
    stateGeometriesPromise = fetch(STATE_BOUNDARIES_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load state boundary data.");
        return res.json();
      })
      .then(buildStateGeometries)
      .catch((err) => {
        stateGeometriesPromise = null; // Allow a retry next time.
        throw err;
      });
  }
  return stateGeometriesPromise;
}

/**
 * Ray-casting point-in-polygon test for a single ring.
 * Counts how many times a horizontal ray from the point crosses the ring's
 * edges; an odd number of crossings means the point is inside.
 *
 * @param {[number, number]} point - [longitude, latitude] to test.
 * @param {Array<[number, number]>} ring - Closed ring of [lng, lat] coords.
 * @returns {boolean} True if the point is inside the ring.
 */
function isPointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    // Does the edge (j → i) straddle the point's latitude, and is the point to
    // the left of the edge at that latitude? If so, the ray crosses this edge.
    const crosses =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Test a point against one polygon, which is an outer ring followed by zero or
 * more "hole" rings. The point is inside only if it is within the outer ring
 * and NOT within any hole.
 */
function isPointInPolygon(point, polygon) {
  if (!isPointInRing(point, polygon[0])) return false; // outside outer boundary
  for (let k = 1; k < polygon.length; k++) {
    if (isPointInRing(point, polygon[k])) return false; // inside a hole
  }
  return true;
}

/**
 * Test whether a point falls inside a state's geometry, handling both a single
 * Polygon and a MultiPolygon (e.g. states made of multiple landmasses/islands).
 *
 * @param {{lat: number, lng: number}} location - The user's coordinates.
 * @param {object} geometry - GeoJSON Polygon or MultiPolygon geometry.
 * @returns {boolean} True if the location is inside the state.
 */
function isLocationInState(location, geometry) {
  const point = [location.lng, location.lat]; // GeoJSON order is [lng, lat]
  if (geometry.type === "Polygon") {
    return isPointInPolygon(point, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    // Inside if the point is within ANY of the state's separate polygons.
    return geometry.coordinates.some((poly) => isPointInPolygon(point, poly));
  }
  return false;
}

/**
 * Ask the browser for the user's current GPS coordinates.
 * Wrapped in a Promise so we can `await` it inside the async submit handler.
 *
 * @returns {Promise<{lat: number, lng: number}>} Resolves with the user's
 *   coordinates, or rejects with an Error if location can't be obtained.
 */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    // Older browsers or insecure (non-HTTPS) contexts may not expose geolocation.
    if (!("geolocation" in navigator)) {
      reject(new Error("Location services are not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      // Success: hand back just the latitude/longitude we care about.
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      // Failure: the user denied permission, or the position was unavailable.
      (geoError) => {
        let message = "Unable to verify your location.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
          message =
            "Location permission denied. You must share your location to submit a report.";
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = "Your location is currently unavailable. Please try again.";
        } else if (geoError.code === geoError.TIMEOUT) {
          message = "Timed out while getting your location. Please try again.";
        }
        reject(new Error(message));
      },
      // Options: request high accuracy and don't wait forever / use stale data.
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

const DISEASE_OPTIONS = [
  "Bluetongue",
  "H5N1 (Avian Flu)",
  "Mad Cow Disease (BSE)",
  "Swine Flu",
  "Other"
];

export default function SelfReport() {
  const [formData, setFormData] = useState({
    diseaseType: "",
    location: "",
    affectedAnimal: "",
  });

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.diseaseType || !formData.location) {
      setError("Disease and Location are required.");
      return;
    }

    if (!US_STATES.includes(formData.location)) {
      setError("Please select a valid U.S. state.");
      return;
    }

    // Turn on the loading state now, since getting the user's GPS location can
    // take a few seconds (the browser may prompt for permission).
    setLoading(true);

    // --- In-state boundary check ---------------------------------------------
    // Before sending anything to the server, confirm the user is physically
    // located INSIDE the state they are reporting about. This helps ensure
    // reports come from people who can actually observe the outbreak firsthand.
    try {
      // Load the state boundary polygons (downloaded once, then cached) and
      // ask the browser for the user's current position, in parallel.
      const [stateGeometries, userLocation] = await Promise.all([
        loadStateGeometries(),
        getUserLocation(),
      ]);

      // Find the boundary geometry for the reported state.
      const geometry = stateGeometries[formData.location];
      if (!geometry) {
        // Shouldn't happen (we already validated the state), but guard anyway.
        setError("Could not load the boundaries for the selected state.");
        setLoading(false);
        return;
      }

      // If the user's coordinates fall outside the state's borders, reject the
      // report before submitting it.
      if (!isLocationInState(userLocation, geometry)) {
        setError(
          `You appear to be outside ${formData.location}. You must be physically located within ${formData.location} to submit a report.`
        );
        setLoading(false);
        return;
      }
    } catch (locErr) {
      // Any failure here (location denied/unavailable/timeout, or boundary data
      // failing to load) blocks submission, because we can't verify the user is
      // inside the reported state.
      setError(locErr.message || "Unable to verify your location.");
      setLoading(false);
      return;
    }
    // --- End in-state boundary check -----------------------------------------

    try {
      const response = await fetch(
        `${window.location.origin}/CSE442/2026-Spring/cse-442c/backend/public/api/create_outbreak.php`,

        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            diseaseType: formData.diseaseType,
            location: formData.location,
          }),
        }
      );

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid server response");
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit report.");
      }

      if (data.auto_rejected) {
        setError(data.message || "Too many rejected self reports. This report has been automatically rejected.");
      } else {
        setSuccess("Report submitted successfully!");
      }

      setFormData({
        diseaseType: "",
        location: "",
        affectedAnimal: "",
      });

    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Header */}
      <SiteHeader />

      <Navbar />

      <main className="login-main" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '40px', 
        padding: '40px 20px',
        maxWidth: '1200px',
        margin: '0 auto',
        flexWrap: 'wrap'
      }}>
        
        {/* Left sidebar with button */}
        <aside style={{
          flex: 1,                // ⬅️ lets it grow like the form
          minWidth: '320px',
          maxWidth: '500px',      // ⬅️ same as form box
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          height: 'fit-content'
        }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '1.3rem',
          textAlign: 'center'   // ⬅️ centers the text
        }}>
          Your Reports
        </h3>          
          <Link 
            to="/my-reports" // ← Change this to your actual route/path
            style={{ textDecoration: 'none' }}
          >
          <button 
            className="login-btn" 
            style={{ 
              width: '100%',
              padding: '14px 18px',   // ⬅️ more vertical + horizontal space
              fontSize: '1.05rem',
              background: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'    // ⬅️ prevents text wrapping/cramping
            }}
          >
            View My Reports
          </button>
          </Link>
          
          <Link 
            to="/allreports"   // ⬅️ change this route if needed
            style={{ textDecoration: 'none' }}
          >
            <button 
              className="login-btn" 
              style={{ 
                width: '100%',
                padding: '14px 18px',
                fontSize: '1.05rem',
                background: '#2ecc71',   // ⬅️ green to differentiate
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              View self reports by everyone
            </button>
          </Link>
          {/* You can add more sidebar links/buttons later */}
        </aside>

        {/* Main form section */}
        <div className="form-center-wrapper" style={{ flex: 1, minWidth: '320px', maxWidth: '500px' }}>
          <section className="card card--fixed">
            <div className="card__title">New Disease Entry</div>

            <form className="login-form" onSubmit={handleSubmit}>

              {/* Disease */}
              <label className="field">
                <span className="field__label">Disease Type</span>
                <select
                  className="field__input"
                  name="diseaseType"
                  value={formData.diseaseType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Disease</option>
                  {DISEASE_OPTIONS.map((disease) => (
                    <option key={disease} value={disease}>
                      {disease}
                    </option>
                  ))}
                </select>
              </label>

              {/* State */}
              <label className="field">
                <span className="field__label">State</span>
                <input
                  className="field__input"
                  type="text"
                  name="location"
                  list="states"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Start typing a state..."
                  required
                />
                <datalist id="states">
                  {US_STATES.map((state) => (
                    <option key={state} value={state} />
                  ))}
                </datalist>
              </label>

              {/* Optional field */}
              <label className="field">
                <span className="field__label">Affected Animal (optional)</span>
                <input
                  className="field__input"
                  type="text"
                  name="affectedAnimal"
                  value={formData.affectedAnimal}
                  onChange={handleChange}
                  placeholder="e.g. cattle, birds..."
                />
              </label>

              {/* Messages */}
              {error && (
                <div style={{ color: "red", fontWeight: 700, textAlign: "center" }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{ color: "green", fontWeight: 700, textAlign: "center" }}>
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? "Submitting..." : "Upload Report"}
              </button>
            </form>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

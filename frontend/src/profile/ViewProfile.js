import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import SiteHeader from '../components/SiteHeader';
import Navbar from '../homepage/Navbar';
import SiteFooter from '../components/SiteFooter';
import "./ViewProfile.css";

const STORAGE_KEY = "user_location";

export default function ViewProfile() {
  const HARDCODED_PROFILE_IMG = "https://www.gravatar.com/avatar/?d=mp&s=200";
  const API_BASE =
    process.env.NODE_ENV === "production"
      ? "/CSE442/2026-Spring/cse-442c/backend/public/api/index.php"
      : "/s26-jnswl-corp/backend/public/api/index.php";

  const VALID_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  ];

  const [profileImg, setProfileImg]           = useState(HARDCODED_PROFILE_IMG);
  const fileInputRef                           = useRef(null);
  const [isEditing, setIsEditing]             = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [locationStatus, setLocationStatus]   = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  // Keep a ref to the latest userData so applyLocation can always read current values
  // without stale closure issues.
  const userDataRef = useRef({});

  const [userData, setUserData] = useState({
    username: "", firstName: "", lastName: "",
    state: "", city: "", address: "", zip: "", email: "", phone: "",
  });
  const [editData, setEditData] = useState({ ...userData });
  const navigate = useNavigate();

  // Keep the ref in sync whenever userData changes
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  // ── On mount: fetch profile, overlay saved location ──────────────────────
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res  = await fetch(`${API_BASE}?r=getProfile`, { method: "GET", credentials: "include" });
        const data = await res.json();
        if (data.ok) {
          const sanitized = {
            username:  DOMPurify.sanitize(data.username  || ""),
            firstName: DOMPurify.sanitize(data.firstName || ""),
            lastName:  DOMPurify.sanitize(data.lastName  || ""),
            state:     DOMPurify.sanitize(data.state     || ""),
            city:      DOMPurify.sanitize(data.city      || ""),
            address:   DOMPurify.sanitize(data.address   || ""),
            zip:       DOMPurify.sanitize(data.zip       || ""),
            email:     DOMPurify.sanitize(data.email     || ""),
            phone:     DOMPurify.sanitize(data.phone     || ""),
          };

          let city  = sanitized.city;
          let state = sanitized.state;
          let zip   = sanitized.zip;
          if (!city || !state) {
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              if (raw) {
                const saved = JSON.parse(raw);
                if (!city  && saved.city)                    city  = saved.city;
                if (!state && (saved.region || saved.state)) state = saved.region || saved.state;
                if (!zip   && saved.zip)                     zip   = saved.zip;
              }
            } catch (_) {}
          }

          const merged = { ...sanitized, city, state, zip };
          setUserData(merged);
          setEditData(merged);
          if (data.profileImg) setProfileImg(data.profileImg);
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
    };
    fetchUserData();
  }, [API_BASE]);

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setProfileImg(base64);
      try {
        const res  = await fetch(`${API_BASE}?r=uploadImage`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (!data.ok) console.error("Image upload failed:", data.error);
      } catch (err) {
        console.error("Image upload error:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Edit / Save / Cancel ──────────────────────────────────────────────────
  const handleEditClick   = () => { setEditData({ ...userData }); setIsEditing(true); };
  const handleCancelClick = () => { setEditData({ ...userData }); setIsEditing(false); setLocationStatus(""); };

  // FIX: Added length limits for city (20) and address (60) to prevent
  // oversized input (e.g. Bee Movie script) from crashing the server.
  const handleChange = (field, value) => {
    let v = value;
    if (field === "firstName")     v = value.replace(/[^A-Za-z]/g, "").slice(0, 20);
    else if (field === "lastName") v = value.replace(/[^A-Za-z-]/g, "").slice(0, 20);
    else if (field === "phone")    v = value.replace(/\D/g, "").slice(0, 10);
    else if (field === "zip")      v = value.replace(/\D/g, "").slice(0, 5);
    else if (field === "state")    v = value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
    else if (field === "email")    v = value.replace(/\s/g, "").slice(0, 50);
    else if (field === "address")  v = value.replace(/[^A-Za-z0-9\s.,-]/g, "").slice(0, 100);
    else if (field === "city")     v = value.replace(/[^A-Za-z\s.-]/g, "").slice(0, 50);
    else if (field === "city")     v = value.replace(/[^A-Za-z\s\-']/g, "").slice(0, 20); // FIX
    else if (field === "address")  v = value.slice(0, 60);                                 // FIX
    setEditData((prev) => ({ ...prev, [field]: v }));
  };

  const handleSave = async () => {
    if (!editData.email.toLowerCase().endsWith("@buffalo.edu")) {
      alert("Registration is restricted to @buffalo.edu email addresses.");
      return;
    }
    if (!VALID_STATES.includes(editData.state.toUpperCase())) {
      alert("Please enter a valid US state abbreviation (e.g., NY, CA).");
      return;
    }
    if (!editData.firstName.trim() || !editData.lastName.trim()) {
      alert("Name fields cannot be empty.");
      return;
    }
    if (editData.zip.length !== 5) {
      alert("ZIP code must be 5 digits.");
      return;
    }

    try {
      const res  = await fetch(`${API_BASE}?r=updateProfile`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username:   editData.username,
          first_name: editData.firstName.trim(),
          last_name:  editData.lastName.trim(),
          state:      editData.state.trim(),
          city:       editData.city.trim(),
          address:    editData.address.trim(),
          zip:        editData.zip,
          email:      editData.email.trim(),
          phone:      editData.phone,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            city:   editData.city,
            region: editData.state,
            zip:    editData.zip,
          }));
        } catch (_) {}
        setUserData({ ...editData });
        setIsEditing(false);
        setLocationStatus("");
      } else {
        alert("Failed to save: " + data.error);
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    }
  };

  // ── Shared helper: apply detected city/state/zip everywhere ──────────────
  // FIX: Only writes to DB when city or state is non-empty, preventing a
  // bad updateProfile call when IP lookup returns nothing useful (e.g. on
  // a private/VPN IP that ip-api.com can't geolocate).
  const applyLocation = async (city, state, zip = "") => {
    // 1. Update UI immediately
    setUserData((prev) => ({ ...prev, city, state, ...(zip && { zip }) }));
    setEditData((prev) => ({ ...prev, city, state, ...(zip && { zip }) }));

    // 2. Persist to localStorage (fast cache for next load)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        city, region: state, zip, detectedAt: new Date().toISOString(),
      }));
    } catch (_) {}

    // 3. Only persist to DB if we got something useful — skipping this when
    //    both are empty prevents overwriting existing profile data with blanks.
    if (city || state) {
      const current = userDataRef.current;
      try {
        await fetch(`${API_BASE}?r=updateProfile`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username:   current.username,
            first_name: current.firstName,
            last_name:  current.lastName,
            state:      state,
            city:       city,
            address:    current.address,
            zip:        zip || current.zip,
            email:      current.email,
            phone:      current.phone,
          }),
        });
      } catch (err) {
        console.error("Failed to persist detected location to DB:", err);
        // Not fatal — localStorage cache will still help on same-browser refresh
      }
    }

    setLocationStatus(
      city || state
        ? `Location detected: ${[city, state, zip].filter(Boolean).join(", ")}`
        : "Location detected (city/state unavailable)."
    );
    setLocationLoading(false);
  };

  // ── Detect My Location ────────────────────────────────────────────────────
  // Primary: browser GPS → bigdatacloud reverse geocode.
  // Fallback: backend IP lookup (when GPS is denied).
  // Permission prompt fires ONLY on button click.
  const handleDetectLocation = () => {
    setLocationStatus("Detecting location…");
    setLocationLoading(true);

    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      // ── GPS allowed ───────────────────────────────────────────────────────
      ({ coords: { latitude, longitude } }) => {
        fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        )
          .then((r) => r.json())
          .then((geo) => {
            const rawCode   = geo.principalSubdivisionCode || "";
            const stateCode = rawCode.includes("-") ? rawCode.split("-")[1] : rawCode;
            const city      = geo.city || geo.locality || "";
            const state     = VALID_STATES.includes(stateCode) ? stateCode : (geo.principalSubdivision || "");
            const zip       = geo.postcode || "";
            applyLocation(city, state, zip);
          })
          .catch(() => {
            setLocationStatus("Could not look up city/state. Try again.");
            setLocationLoading(false);
          });
      },
      // ── GPS denied — fall back to IP lookup ───────────────────────────────
      (err) => {
        console.info("[Location] Geolocation denied, falling back to IP lookup.", err.message);
        fetch(`${API_BASE}?r=detectLocation`, { method: "GET", credentials: "include" })
          .then((r) => r.json())
          .then((data) => {
            if (data.ok) {
              const c = data.city   === "Unknown" ? "" : (data.city   || "");
              const s = data.region === "Unknown" ? "" : (data.region || "");
              const z = data.zip    === "Unknown" ? "" : (data.zip    || "");
              applyLocation(c, s, z);
            } else {
              setLocationStatus("Failed to detect location.");
              setLocationLoading(false);
            }
          })
          .catch(() => {
            setLocationStatus("Error detecting location.");
            setLocationLoading(false);
          });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  // ── Clear Location ────────────────────────────────────────────────────────
  const handleClearLocation = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    setUserData((prev) => ({ ...prev, city: "", state: "", zip: "" }));
    setEditData((prev) => ({ ...prev, city: "", state: "", zip: "" }));
    setLocationStatus("Location cleared.");
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleConfirmCancel = async () => {
    try {
      const res  = await fetch(`${API_BASE}?r=deleteAccount`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.ok) navigate("/");
    } catch (err) {
      console.error("Failed to delete account:", err);
    }
  };

  // FIX: Added maxLength to all fields as a second layer of browser-level
  // enforcement against oversized input.
  const fields = [
    { label: "First Name",       key: "firstName", type: "text",  maxLength: 20  },
    { label: "Last Name",        key: "lastName",  type: "text",  maxLength: 20  },
    { label: "State (2-letter)", key: "state",     type: "text",  maxLength: 2   },
    { label: "City",             key: "city",      type: "text",  maxLength: 20  },
    { label: "Address",          key: "address",   type: "text",  maxLength: 60  },
    { label: "ZIP",              key: "zip",       type: "text",  maxLength: 5   },
    { label: "E-mail",           key: "email",     type: "email", maxLength: 100 },
    { label: "Phone Number",     key: "phone",     type: "tel",   maxLength: 10  },
  ];

  return (
    <div className="vp-page">
      <SiteHeader />
      <Navbar />

      <div className="vp-content-box">

        {/* ── Top card ── */}
        <div className="vp-top-card">
          <div className="vp-top-left">
            <div className="vp-avatar-wrap" onClick={() => fileInputRef.current.click()}>
              <div className="vp-avatar">
                {profileImg
                  ? <img src={profileImg} alt="Profile" className="vp-avatar-img" />
                  : <div className="vp-avatar-default" />}
                <div className="vp-avatar-overlay">Change Photo</div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
            <div className="vp-user-info">
              <p className="vp-username">{userData.firstName} {userData.lastName}</p>
            </div>
          </div>

          <div className="vp-top-actions">
            {!isEditing ? (
              <button className="vp-edit-btn" onClick={handleEditClick}>Edit Profile</button>
            ) : (
              <div className="vp-edit-actions">
                <button className="vp-save-btn"   onClick={handleSave}>Save</button>
                <button className="vp-cancel-btn" onClick={handleCancelClick}>Cancel</button>
              </div>
            )}
            <button className="vp-cancel-subscription-btn" onClick={() => setShowCancelModal(true)}>
              Cancel Subscription
            </button>
          </div>
        </div>

        {/* ── Info card ── */}
        <div className="vp-info-card">
          <p className="vp-info-card-title">Account Information</p>

          <div className="vp-form-grid">
            {fields.map((field) => (
              <div className="vp-field" key={field.key}>
                <label className="vp-label">{field.label}</label>
                <input
                  className="vp-input"
                  type={field.type}
                  maxLength={field.maxLength}
                  value={isEditing ? editData[field.key] : userData[field.key]}
                  readOnly={!isEditing}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.key === "state" ? "e.g. NY" : ""}
                />
              </div>
            ))}
          </div>

          {/* ── Location detection — only visible in edit mode ── */}
          {isEditing && (
            <div className="vp-location-section">
              <button
                className="vp-edit-btn"
                onClick={handleDetectLocation}
                disabled={locationLoading}
                aria-busy={locationLoading}
                aria-label="Detect my current location"
              >
                {locationLoading ? "Detecting…" : "Detect My Location"}
              </button>

              <button
                className="vp-cancel-btn"
                onClick={handleClearLocation}
                disabled={locationLoading}
                style={{ marginLeft: "10px" }}
              >
                Clear Location
              </button>

              {locationStatus && (
                <p className="vp-location-status" role="status" aria-live="polite">
                  {locationStatus}
                </p>
              )}
            </div>
          )}
        </div>

      </div>

      <SiteFooter />

      {/* ── Cancel Subscription modal ── */}
      {showCancelModal && (
        <div className="vp-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="vp-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="vp-modal-icon">⚠️</div>
            <h2 className="vp-modal-title">Cancel Subscription?</h2>
            <p className="vp-modal-desc">
              Are you sure you want to cancel your subscription?
              <br /><br />
              This will <strong>permanently delete your account</strong> and all associated data.
              This action cannot be undone.
            </p>
            <div className="vp-modal-actions">
              <button className="vp-modal-keep-btn"    onClick={() => setShowCancelModal(false)}>Keep My Account</button>
              <button className="vp-modal-confirm-btn" onClick={handleConfirmCancel}>Cancel Subscription</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
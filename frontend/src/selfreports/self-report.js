import React, { useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import Navbar from "../homepage/Navbar";
import "../pages/LoginPage.css";
import { Link } from "react-router-dom"; // ← Add this import (if using React Router)

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

    setLoading(true);

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

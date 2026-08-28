import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from '../LivestockEpidemicTracker.jpeg';
import SiteFooter from "../components/SiteFooter";
import "./CreateAccount.css";

export default function CreateAccount({ onCancel }) {
  const navigate = useNavigate();
  const API_BASE =
    process.env.NODE_ENV === "production"
      ? "/CSE442/2026-Spring/cse-442c/backend/public/api/index.php"
      : "http://localhost:8000/api/index.php";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [modalType, setModalType] = useState(null); // "privacy" | "terms" | null

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    // Apply the same real-time sanitization as ViewProfile
    if (name === "firstName") {
      sanitizedValue = value.replace(/[^A-Za-z]/g, "");
    } else if (name === "lastName") {
      sanitizedValue = value.replace(/[^A-Za-z-]/g, "");
    }

    setFormData({ ...formData, [name]: sanitizedValue });
    setErrors({ ...errors, [name]: "" });
  };

  const validate = () => {
    const newErrors = {};

    // Name Validation
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required.";

    // Buffalo Email Validation
    if (!formData.email) {
      newErrors.email = "Email address is required.";
    } else if (!formData.email.toLowerCase().endsWith("@buffalo.edu")) {
      newErrors.email = "Registration is restricted to @buffalo.edu email addresses.";
    }

    // Password Validation
    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}?r=createAccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate("/profile");
      } else {
        setErrors({ email: data.message || "Account creation failed." });
      }
    } catch (err) {
      console.error(err);
      setErrors({ email: "Server error. Please try again later." });
    }
  };

  return (
    <div className="create-account-page">
      <div style={{ background: '#ffffff', color: 'black', padding: '20px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <img src={logo} alt="logo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 4 }} />
          <h1 style={{ margin: 0, fontSize: '2.4rem', letterSpacing: '1.5px', fontWeight: 'bold' }}>
            LIVESTOCK EPIDEMIC TRACKER
          </h1>
        </div>
      </div>

      <main className="ca-main">
        <section className="ca-card">
          <div className="ca-card__title">Create Account</div>

          <form className="ca-form" onSubmit={handleSubmit}>
            <label className="ca-field">
              <span className="ca-label">First Name</span>
              <input
                className={`ca-input${errors.firstName ? " error" : ""}`}
                name="firstName"
                placeholder="Letters only"
                value={formData.firstName}
                onChange={handleChange}
              />
              {errors.firstName && <span className="ca-error-msg">{errors.firstName}</span>}
            </label>

            <label className="ca-field">
              <span className="ca-label">Last Name</span>
              <input
                className={`ca-input${errors.lastName ? " error" : ""}`}
                name="lastName"
                placeholder="Letters and hyphens"
                value={formData.lastName}
                onChange={handleChange}
              />
              {errors.lastName && <span className="ca-error-msg">{errors.lastName}</span>}
            </label>

            <label className="ca-field">
              <span className="ca-label">Email</span>
              <input
                className={`ca-input${errors.email ? " error" : ""}`}
                name="email"
                type="email"
                placeholder="user@buffalo.edu"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <span className="ca-error-msg">{errors.email}</span>}
            </label>

            <label className="ca-field">
              <span className="ca-label">Password</span>
              <input
                className={`ca-input${errors.password ? " error" : ""}`}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && <span className="ca-error-msg">{errors.password}</span>}
            </label>

            <label className="ca-field">
              <span className="ca-label">Confirm Password</span>
              <input
                className={`ca-input${errors.confirmPassword ? " error" : ""}`}
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && <span className="ca-error-msg">{errors.confirmPassword}</span>}
            </label>

            <p className="ca-policy">
              By signing up for a JNWSL Corp tm account
              <br />
              you agree to our{" "}
              <button type="button" className="ca-policy-link" onClick={() => setModalType("privacy")}>
                Privacy Policy
              </button>
              {" & "}
              <button type="button" className="ca-policy-link" onClick={() => setModalType("terms")}>
                Terms of Service
              </button>
            </p>

            <button type="submit" className="ca-btn ca-btn--primary">
              Create Account
            </button>
            <button type="button" className="ca-btn ca-btn--secondary" onClick={() => navigate("/login")}>
              Already have an account?
            </button>
          </form>
        </section>
      </main>

      <SiteFooter />
      {modalType && (
        <PolicyModal type={modalType} onClose={() => setModalType(null)} />
      )}
    </div>
  );
}

// ── Policy Modal ──────────────────────────────────────────────
function PolicyModal({ type, onClose }) {
  const isPrivacy = type === "privacy";

  const privacyContent = (
    <>
      <h3>Privacy Policy</h3>
      <p><strong>Last updated: March 2026</strong></p>
      <h4>1. Information We Collect</h4>
      <p>We collect information you provide directly to us when you create an account, including your first name, last name, and email address. We also collect your password in a securely hashed format.</p>
      <h4>2. How We Use Your Information</h4>
      <p>We use the information we collect to provide and maintain our livestock epidemic tracking services, authenticate your account, and communicate important updates related to the platform.</p>
      <h4>3. Data Security</h4>
      <p>We implement industry-standard security measures to protect your personal information. Passwords are encrypted and never stored in plain text.</p>
      <h4>4. Data Retention</h4>
      <p>We retain your personal information for as long as your account is active. Upon account deletion, your data is permanently removed within 30 days.</p>
      <h4>5. Third-Party Sharing</h4>
      <p>We do not sell, trade, or otherwise transfer your personal information to outside parties without your consent.</p>
      <h4>6. Contact Us</h4>
      <p>If you have any questions, please contact us at support@jnwslcorp.com.</p>
    </>
  );

  const termsContent = (
    <>
      <h3>Terms of Service &amp; Usage Guidelines</h3>
      <p><strong>Last updated: March 2026</strong></p>
      <h4>1. Acceptance of Terms</h4>
      <p>By creating an account, you agree to be bound by these Terms of Service.</p>
      <h4>2. Permitted Use</h4>
      <p>This platform is intended solely for legitimate livestock disease tracking and agricultural research purposes.</p>
      <h4>3. Account Responsibility</h4>
      <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
      <h4>4. Prohibited Activities</h4>
      <ul>
        <li>Submitting false or misleading epidemic data</li>
        <li>Attempting to gain unauthorized access to other accounts</li>
        <li>Using the platform for commercial solicitation</li>
      </ul>
      <h4>5. Data Accuracy</h4>
      <p>Users are expected to submit accurate and truthful data.</p>
      <h4>6. Termination</h4>
      <p>We reserve the right to suspend or terminate your account at our discretion if you violate these terms.</p>
      <h4>7. Limitation of Liability</h4>
      <p>JNWSL Corp tm is not liable for any indirect or incidental damages arising from your use of the platform.</p>
    </>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <div className="modal-content">
          {isPrivacy ? privacyContent : termsContent}
        </div>
        <div className="modal-footer">
          <button className="modal-ok-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import SiteHeader from './components/SiteHeader.js';
import Navbar from '../homepage/Navbar.js';
import SiteFooter from '../components/SiteFooter.js';
import "./ViewProfile.css";

const STORAGE_KEY = "user_location";

export default function ViewProfile() {
  const HARDCODED_PROFILE_IMG = "https://www.gravatar.com/avatar/?d=mp&s=200";
  const API_BASE =
    process.env.NODE_ENV === "production"
      ? "/CSE442/2026-Spring/cse-442c/backend/public/api/index.php"
      : "/s26-jnswl-corp/backend/public/api/index.php";

  const VALID_STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
    "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
    "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
  ];

  const [profileImg, setProfileImg] = useState(HARDCODED_PROFILE_IMG);
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  const [userData, setUserData] = useState({
    username: "", firstName: "", lastName: "",
    state: "", city: "", address: "", zip: "", email: "", phone: "",
  });

  const [editData, setEditData] = useState({ ...userData });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`${API_BASE}?r=getProfile`, { credentials: "include" });
        const data = await res.json();
        if (data.ok) {
          const sanitized = {
            username: DOMPurify.sanitize(data.username || ""),
            firstName: DOMPurify.sanitize(data.firstName || ""),
            lastName: DOMPurify.sanitize(data.lastName || ""),
            state: DOMPurify.sanitize(data.state || ""),
            city: DOMPurify.sanitize(data.city || ""),
            address: DOMPurify.sanitize(data.address || ""),
            zip: DOMPurify.sanitize(data.zip || ""),
            email: DOMPurify.sanitize(data.email || ""),
            phone: DOMPurify.sanitize(data.phone || ""),
          };

          setUserData(sanitized);
          setEditData(sanitized);
          if (data.profileImg) setProfileImg(data.profileImg);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUserData();
  }, [API_BASE]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfileImg(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEditClick = () => {
    setEditData({ ...userData });
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setEditData({ ...userData });
    setIsEditing(false);
  };

  // ✅ NAME LIMIT APPLIED HERE
  const handleChange = (field, value) => {
    let v = value;

    if (field === "firstName") {
      v = value.replace(/[^A-Za-z]/g, "").slice(0, 20);
    }
    else if (field === "lastName") {
      v = value.replace(/[^A-Za-z-]/g, "").slice(0, 20);
    }
    else if (field === "phone") {
      v = value.replace(/\D/g, "");
    }
    else if (field === "zip") {
      v = value.replace(/\D/g, "").slice(0, 5);
    }
    else if (field === "state") {
      v = value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
    }

    setEditData((prev) => ({ ...prev, [field]: v }));
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`${API_BASE}?r=updateProfile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editData.username,
          first_name: editData.firstName,
          last_name: editData.lastName,
          state: editData.state,
          city: editData.city,
          address: editData.address,
          zip: editData.zip,
          email: editData.email,
          phone: editData.phone,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setUserData({ ...editData });
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fields = [
    { label: "First Name", key: "firstName", type: "text" },
    { label: "Last Name", key: "lastName", type: "text" },
    { label: "State", key: "state", type: "text" },
    { label: "City", key: "city", type: "text" },
    { label: "Address", key: "address", type: "text" },
    { label: "ZIP", key: "zip", type: "text" },
    { label: "Email", key: "email", type: "email" },
    { label: "Phone", key: "phone", type: "tel" },
  ];

  return (
    <div className="vp-page">
      <SiteHeader />
      <Navbar />

      <div className="vp-content-box">

        {/* ✅ TOP CARD RESTORED */}
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
              <p className="vp-username">
                {userData.firstName} {userData.lastName}
              </p>
            </div>
          </div>

          <div className="vp-top-actions">
            {!isEditing ? (
              <button className="vp-edit-btn" onClick={handleEditClick}>
                Edit Profile
              </button>
            ) : (
              <div className="vp-edit-actions">
                <button className="vp-save-btn" onClick={handleSave}>Save</button>
                <button className="vp-cancel-btn" onClick={handleCancelClick}>Cancel</button>
              </div>
            )}
          </div>
        </div>

        {/* FORM */}
        <div className="vp-info-card">
          <p className="vp-info-card-title">Account Information</p>

          <div className="vp-form-grid">
            {fields.map((field) => (
              <div className="vp-field" key={field.key}>
                <label className="vp-label">{field.label}</label>
                <input
                  className="vp-input"
                  type={field.type}
                  maxLength={
                    field.key === "firstName" || field.key === "lastName"
                      ? 20
                      : undefined
                  }
                  value={isEditing ? editData[field.key] : userData[field.key]}
                  readOnly={!isEditing}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      <SiteFooter />
    </div>
  );
}
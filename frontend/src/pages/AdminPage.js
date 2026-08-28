import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from '../homepage/Navbar';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import "./AdminPage.css";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [outbreaks, setOutbreaks] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loadingOutbreaks, setLoadingOutbreaks] = useState(false);
  const navigate = useNavigate();

  const FLAGGED_OUTBREAKS_URL = "https://aptitude.cse.buffalo.edu/CSE442/2026-Spring/cse-442c/backend/public/api/view_flagged_outbreak.php";

  useEffect(() => {
    setIsAdmin(true);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchOutbreaks = async () => {
      setLoadingOutbreaks(true);
      try {
        const res = await fetch(FLAGGED_OUTBREAKS_URL, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();

        if (data.ok && Array.isArray(data.outbreaks)) {
          const formatted = data.outbreaks.map((o) => ({
            id: o.id,
            // FIXED: Use 'disease' column for the actual disease name (Bluetongue, etc.)
            diseaseType: o.diseaseType || o.disease || o.disease_type || "Unknown Disease",
            userId: o.reportedBy || o.User_ID || "Unknown",
            location: o.location || o.state || "Unknown",
            timeCreated: o.date_flagged || o.created_at || o.report_date || "N/A",
          }));
          setOutbreaks(formatted);
        } else {
          setOutbreaks([]);
        }
      } catch (err) {
        console.error("Failed to fetch flagged outbreaks:", err);
        setOutbreaks([]);
      } finally {
        setLoadingOutbreaks(false);
      }
    };

    fetchOutbreaks();
  }, [isAdmin]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApprove = async (id) => {
    try {
      await fetch("https://aptitude.cse.buffalo.edu/CSE442/2026-Spring/cse-442c/backend/public/api/approveOutbreak.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setOutbreaks((prev) => prev.filter((o) => o.id !== id));
      showNotification("The outbreak has been approved");
    } catch (err) {
      console.error("Failed to approve outbreak:", err);
      showNotification("Error approving outbreak");
    }
  };

  const handleReject = async (id) => {
    try {
      await fetch("https://aptitude.cse.buffalo.edu/CSE442/2026-Spring/cse-442c/backend/public/api/rejectOutbreak.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setOutbreaks((prev) => prev.filter((o) => o.id !== id));
      showNotification("The outbreak has been rejected");
    } catch (err) {
      console.error("Failed to reject outbreak:", err);
      showNotification("Error rejecting outbreak");
    }
  };


  if (isAdmin === null) {
    return (
      <div className="ap-page">
        <SiteHeader />
        <div className="ap-loading">Checking permissions...</div>
        <SiteFooter />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="ap-page">
        <SiteHeader />
        <div className="ap-access-denied">
          <div className="ap-denied-box">
            <div className="ap-denied-icon">🚫</div>
            <h2 className="ap-denied-title">Access Denied</h2>
            <p className="ap-denied-desc">You do not have permission to view this page.</p>
            <button className="ap-home-btn" onClick={() => navigate("/home")}>
              Return to Homepage
            </button>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="ap-page">
      <SiteHeader />
      <Navbar />

      {notification && <div className="ap-notification">{notification}</div>}

      <div className="ap-content">
        <h1 className="ap-heading">Admin Dashboard</h1>

        <div className="ap-queue-card">
          <h2 className="ap-queue-title">Flagged Outbreaks Queue</h2>

          {loadingOutbreaks ? (
            <div className="ap-queue-empty">Loading...</div>
          ) : outbreaks.length === 0 ? (
            <div className="ap-queue-empty">No flagged outbreaks to review</div>
          ) : (
            <ul className="ap-queue-list">
              {outbreaks.map((outbreak) => (
                <li key={outbreak.id} className="ap-queue-item">
                  <div className="ap-item-info">
                    <span className="ap-item-disease">{outbreak.diseaseType}</span>
                    <span className="ap-item-userid">Submitted by: User #{outbreak.userId}</span>
                    <span className="ap-item-state">{outbreak.location}</span>
                    <span className="ap-item-date">{outbreak.timeCreated}</span>
                  </div>
                  <div className="ap-item-actions">
                    <button className="ap-approve-btn" onClick={() => handleApprove(outbreak.id)}>
                      Approve
                    </button>
                    <button className="ap-reject-btn" onClick={() => handleReject(outbreak.id)}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from '../homepage/Navbar';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import "./AdminPage.css";

const IS_LOCAL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

const API_ROOT = IS_LOCAL
    ? "http://localhost/s26-jnswl-corp/backend/public/api"
    : `${window.location.origin}/CSE442/2026-Spring/cse-442c/backend/public/api`;

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [outbreaks, setOutbreaks] = useState([]);
  const [publications, setPublications] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loadingOutbreaks, setLoadingOutbreaks] = useState(false);
  const [scores, setScores] = useState({});
  const [scoreFeedback, setScoreFeedback] = useState({});
  const [loadingPublications, setLoadingPublications] = useState(false);
  const navigate = useNavigate();

  const FLAGGED_OUTBREAKS_URL = `${API_ROOT}/view_flagged_outbreak.php`;
  const PENDING_PUBLICATIONS_URL = `${API_ROOT}/view_pending_publications.php`;
  const APPROVE_OUTBREAK_URL = `${API_ROOT}/approveOutbreak.php`;
  const REJECT_OUTBREAK_URL = `${API_ROOT}/rejectOutbreak.php`;
  const APPROVE_PUBLICATION_URL = `${API_ROOT}/approvePublication.php`;
  const REJECT_PUBLICATION_URL = `${API_ROOT}/rejectPublication.php`;

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
            diseaseType: o.diseaseType || o.disease || o.disease_type || "Unknown Disease",
            userId: o.reportedBy || o.User_ID || "Unknown",
            location: o.location || o.state || "Unknown",
            timeCreated: o.date_flagged || o.created_at || o.report_date || "N/A",
            confidence_score: o.confidence_score ?? null,
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

    const fetchPublications = async () => {
      setLoadingPublications(true);
      try {
        const res = await fetch(PENDING_PUBLICATIONS_URL, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();

        if (data.ok && Array.isArray(data.publications)) {
          const formatted = data.publications.map((p) => ({
            id: p.id,
            title: p.title || "Untitled Publication",
            authors: p.authors || "Unknown authors",
            journal: p.journal || "Not provided",
            publicationDate: p.publication_date || p.publication_year || "Unknown date",
            publicationType: p.publication_type || "Research publication",
            submittedAt: p.created_at || "N/A",
            submittedBy: p.submitted_by_name || `User #${p.user_id}`,
            originUrl: p.origin_url || "",
            uploadedOriginalFilename: p.uploaded_original_filename || "",
            uploadedFileUrl: p.uploaded_file_url || "",
          }));
          setPublications(formatted);
        } else {
          setPublications([]);
        }
      } catch (err) {
        console.error("Failed to fetch pending publications:", err);
        setPublications([]);
      } finally {
        setLoadingPublications(false);
      }
    };

    fetchOutbreaks();
    fetchPublications();
  }, [isAdmin, FLAGGED_OUTBREAKS_URL, PENDING_PUBLICATIONS_URL]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApprove = async (id) => {
    try {
      await fetch(APPROVE_OUTBREAK_URL, {
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
      await fetch(REJECT_OUTBREAK_URL, {
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

  const handleApprovePublication = async (id) => {
    try {
      const res = await fetch(APPROVE_PUBLICATION_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to approve publication");
      }

      setPublications((prev) => prev.filter((p) => p.id !== id));
      showNotification("The publication has been approved");
    } catch (err) {
      console.error("Failed to approve publication:", err);
      showNotification("Error approving publication");
    }
  };

  const handleRejectPublication = async (id) => {
    try {
      const res = await fetch(REJECT_PUBLICATION_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Failed to reject publication");
      }

      setPublications((prev) => prev.filter((p) => p.id !== id));
      showNotification("The publication has been rejected");
    } catch (err) {
      console.error("Failed to reject publication:", err);
      showNotification("Error rejecting publication");
    }
  };
  const handleSaveScore = async (id) => {
    const raw = scores[id];
    const score = Number(raw);

    if (raw === undefined || raw === "" || !Number.isInteger(score) || score < 0 || score > 100) {
      setScoreFeedback((prev) => ({ ...prev, [id]: { msg: "Enter a whole number 0–100.", ok: false } }));
      return;
    }

    try {
      const res = await fetch(
        "https://aptitude.cse.buffalo.edu/CSE442/2026-Spring/cse-442c/backend/public/api/index.php?r=save_confidence_score",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, confidence_score: score }),
        }
      );
      const data = await res.json();
      if (data.ok) {
        setScoreFeedback((prev) => ({ ...prev, [id]: { msg: "Saved.", ok: true } }));
        setOutbreaks((prev) =>
          prev.map((o) => o.id === id ? { ...o, confidence_score: score } : o)
        );
      } else {
        setScoreFeedback((prev) => ({ ...prev, [id]: { msg: data.error || "Error.", ok: false } }));
      }
    } catch {
      setScoreFeedback((prev) => ({ ...prev, [id]: { msg: "Network error.", ok: false } }));
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                    <label style={{ fontSize: "0.85rem", color: "#555", whiteSpace: "nowrap" }}>
                      Current score: {outbreak.confidence_score !== null && outbreak.confidence_score !== undefined
                        ? `${outbreak.confidence_score}/100`
                        : "Not set"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="0–100"
                      value={scores[outbreak.id] ?? ""}
                      onChange={(e) => setScores((prev) => ({ ...prev, [outbreak.id]: e.target.value }))}
                      style={{ width: "90px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #ccc" }}
                    />
                    <button
                      onClick={() => handleSaveScore(outbreak.id)}
                      style={{ padding: "6px 14px", borderRadius: "6px", background: "#3498db", color: "white", border: "none", cursor: "pointer", fontWeight: "600" }}
                    >
                      Save Score
                    </button>
                    {scoreFeedback[outbreak.id] && (
                      <span style={{ fontSize: "0.85rem", color: scoreFeedback[outbreak.id].ok ? "green" : "red" }}>
                        {scoreFeedback[outbreak.id].msg}
                      </span>
                    )}
                  </div>
                      </li>
                  ))}
                </ul>
            )}
          </div>

          <div className="ap-queue-card">
            <h2 className="ap-queue-title">Pending Publications Queue</h2>

            {loadingPublications ? (
                <div className="ap-queue-empty">Loading...</div>
            ) : publications.length === 0 ? (
                <div className="ap-queue-empty">No pending publications to review</div>
            ) : (
                <ul className="ap-queue-list">
                  {publications.map((publication) => (
                      <li key={publication.id} className="ap-queue-item ap-queue-item--publication">
                        <div className="ap-item-info ap-item-info--stack">
                    <span className="ap-item-disease ap-item-disease--title">
                      {publication.title}
                    </span>

                          <span className="ap-item-subline">
                      <strong>Authors:</strong> {publication.authors}
                    </span>

                          <span className="ap-item-subline">
                      <strong>Journal / Publisher:</strong> {publication.journal}
                    </span>

                          <span className="ap-item-subline">
                      <strong>Publication Date:</strong> {publication.publicationDate}
                    </span>

                          <span className="ap-item-subline">
                      <strong>Publication Type:</strong> {publication.publicationType}
                    </span>

                          <span className="ap-item-subline">
                      <strong>Submitted by:</strong> {publication.submittedBy}
                    </span>

                          <span className="ap-item-subline">
                      <strong>Submitted at:</strong> {publication.submittedAt}
                    </span>

                          <div className="ap-publication-links">
                            {publication.originUrl && (
                                <a
                                    href={publication.originUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ap-publication-link"
                                >
                                  View External Link
                                </a>
                            )}

                            {publication.uploadedFileUrl && (
                                <a
                                    href={publication.uploadedFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ap-publication-link"
                                >
                                  View Uploaded PDF
                                </a>
                            )}

                            {publication.uploadedOriginalFilename && (
                                <span className="ap-file-chip">
                          File: {publication.uploadedOriginalFilename}
                        </span>
                            )}
                          </div>
                        </div>

                        <div className="ap-item-actions">
                          <button
                              className="ap-approve-btn"
                              onClick={() => handleApprovePublication(publication.id)}
                          >
                            Approve
                          </button>
                          <button
                              className="ap-reject-btn"
                              onClick={() => handleRejectPublication(publication.id)}
                          >
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
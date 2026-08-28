import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import Navbar from "../homepage/Navbar";
import "../pages/LoginPage.css";

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Grid layout: Date, Disease, Location, Status
  const gridLayout = "1fr 1.5fr 1.5fr 1fr"; 

  useEffect(() => {
    const fetchMyReports = async () => {
      try {
        const response = await fetch(
          `${window.location.origin}/CSE442/2026-Spring/cse-442c/backend/public/api/get_all_outbreaks.php` ,
          {
            method: "GET",
            credentials: "include",
            headers: { "Accept": "application/json" },
          }
        );

        let data;
        try { 
          data = await response.json(); 
        } catch { 
          throw new Error("Invalid server response"); 
        }

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Failed to load reports");
        }

        setReports(data.reports || []);
      } catch (err) {
        setError(err.message || "Could not load your reports.");
      } finally {
        setLoading(false);
      }
    };
    fetchMyReports();
  }, []);

  // Helper function to style status
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "rejected":
        return { color: "#e74c3c", fontWeight: "600" };
      case "pending":
        return { color: "#f39c12", fontWeight: "600" };
      case "confirmed":
      case "approved":
        return { color: "#27ae60", fontWeight: "600" };
      default:
        return { color: "#333", fontWeight: "500" };
    }
  };

  const getStatusDisplay = (status) => {
    if (!status) return "Pending";
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <div className="login-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5f5f5" }}>
      <SiteHeader />
      <Navbar />

      <main style={{ flex: 1, display: "flex", justifyContent: "center", padding: "2rem 1rem" }}>
        <div style={{ width: "100%", maxWidth: "1000px", display: "flex", flexDirection: "column" }}>
          
          <button
            onClick={() => navigate("/self-report")}
            style={{ 
              alignSelf: "flex-start", 
              marginBottom: "1.5rem", 
              backgroundColor: "#3498db", 
              color: "white", 
              border: "none", 
              padding: "0.6rem 1.2rem", 
              borderRadius: "6px", 
              fontWeight: "bold", 
              cursor: "pointer" 
            }}
          >
            + Create Report
          </button>

          <section style={{ 
            background: "#ffffff", 
            borderRadius: "12px", 
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)", 
            padding: "2rem", 
            minHeight: "60vh" 
          }}>
            
            <div style={{ 
              fontSize: "1.8rem", 
              fontWeight: "bold", 
              marginBottom: "2rem", 
              color: "#333" 
            }}>
              My Submitted Reports
            </div>

            {/* Header */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: gridLayout, 
              backgroundColor: "#d1d1d1", 
              padding: "15px 20px", 
              borderRadius: "12px", 
              fontWeight: "bold", 
              fontSize: "1.2rem",
              textAlign: "center",
              marginBottom: "15px" 
            }}>
              <div>Date</div>
              <div>Disease</div>
              <div>Location</div>
              <div>Status</div>
            </div>

            {/* Report Rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {loading && <div style={{ textAlign: "center", padding: "40px" }}>Loading your reports...</div>}
              {error && <div style={{ color: "red", textAlign: "center", padding: "20px" }}>{error}</div>}
              
              {!loading && !error && reports.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  You haven't submitted any reports yet.
                </div>
              )}

              {!loading && reports.map((report) => (
                <div 
                  key={report.id}
                  style={{ 
                    display: "grid", 
                    gridTemplateColumns: gridLayout, 
                    backgroundColor: "#f2f2f2", 
                    padding: "15px 20px", 
                    borderRadius: "15px", 
                    alignItems: "center", 
                    textAlign: "center",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <div>{report.report_date || "N/A"}</div>
                  <div style={{ fontWeight: "500" }}>{report.diseaseType || "—"}</div>
                  <div>{report.location || "—"}</div>
                  
                  {/* Improved Status Display */}
                  <div style={getStatusStyle(report.status)}>
                    {getStatusDisplay(report.status)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      
      <SiteFooter />
    </div>
  );
}
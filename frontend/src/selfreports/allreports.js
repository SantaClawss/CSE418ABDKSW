import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import Navbar from "../homepage/Navbar";
import "../pages/LoginPage.css";

export default function AllReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const gridLayout = "1fr 1.5fr 1.5fr 1fr 1.2fr 1fr";

  useEffect(() => {
    const fetchAllReports = async () => {
      try {
        const response = await fetch(
          `${window.location.origin}/CSE442/2026-Spring/cse-442c/backend/public/api/get_all_outbreaks.php`,
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
        setError(err.message || "Could not load reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllReports();
  }, []);

  //create a feature that deletes a report at a certain ID
  const deleteReport = async (reportID) => {
	
	const confirmed = window.confirm("Are you sure you want to delete this report?");
	if (confirmed == false){return;}
	
	//Send a delete request to the php endpoint and wait for it to return
	try{
		const response = await fetch(
		  `${window.location.origin}/CSE442/2026-Spring/cse-442c/backend/public/api/deleteOutbreak.php`,
		   {
			method: "DELETE",
			credentials: "include",
			headers: { "Accept": "application/json" },
			//allows us to store id variable as string
			body: JSON.stringify({id: reportID}),
			}
		);
		
		let data;
		try {
		   data = await response.json();
		} catch {
	      throw new Error("Invalid server response");
	    }
		
		if (!response.ok || !data.ok) {
		  throw new Error(data.error || "Failed to delete report");
		}
		
		//iterate through each report in React to find the report to be deleted
		//once the reports been found, setReports will remove the report from the reports list
		setReports((currReports) => {
			let index = 0;
			for ( const report of currReports){
				if(report.id === reportID){
					return currReports.slice(0,index).concat(currReports.slice(index + 1));
				}
				index += 1;
			}
			return currReports;
		});
		} catch (err){
			setError(err.message || "Could not delete report.");
		}
	}
	
  
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
        <div style={{ width: "100%", maxWidth: "1100px", display: "flex", flexDirection: "column" }}>

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
            + Create New Report
          </button>

          <section style={{
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            padding: "2rem",
            minHeight: "60vh"
          }}>

            <div style={{ fontSize: "1.8rem", fontWeight: "bold", marginBottom: "2rem", color: "#333" }}>
              All Submitted Reports
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
              <div>Confidence</div>
            </div>

            {/* Report Rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {loading && <div style={{ textAlign: "center", padding: "40px" }}>Loading all reports...</div>}
              {error && <div style={{ color: "red", textAlign: "center", padding: "20px" }}>{error}</div>}

              {!loading && !error && reports.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                  No reports found.
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
                  <div style={getStatusStyle(report.status)}>
                    {getStatusDisplay(report.status)}
                  </div>
                  <div style={{ color: "#555", fontWeight: "500" }}>
                    {report.confidence_score !== null && report.confidence_score !== undefined
                      ? `${report.confidence_score}/100`
                      : "Not yet available"}
                  </div>
				  
				  {/* delete button should appear after report in app */}
				  {/* goona have to keep messing around with dimensions to get them right*/}
				  <div>
				   <button
				   	onClick={() => deleteReport(report.id)}
					style={{
						backgroundColor: "#e74c3c",
						color: "white",
						border: "none",
						borderRadius: "12px",
						padding: "0.5rem 1.0rem",
						fontWeight: "bold",
						cursor: "pointer",
					}}
					>
					Delete
					</button>
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
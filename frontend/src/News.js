import { useState } from "react";
import Navbar from './homepage/Navbar';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';

const mockNews = [
  {
  id: 1,
  title: "USDA To Host Free Biosecurity Webinars for Dairy and Poultry Producers",
  source: "USDA APHIS",
  sourceUrl: "https://www.aphis.usda.gov/news/program-update/usda-host-free-biosecurity-webinars-dairy-poultry-producers",
  date: "Jan 02 2026",
  description: "State The USDA APHIS is offering free biosecurity webinars for dairy and poultry producers to help prevent the spread of disease on farms. Sessions will cover best practices for farm biosecurity, early detection, and response protocols. health officials have confirmed additional detections of Highly Pathogenic Avian Influenza (H5N1) in commercial poultry operations across western New York. Bio-security protocols have been reinforced, and movement controls are in effect in affected counties. Producers are urged to review mitigation guidance and report unusual mortality immediately.",
  disease: "H5N1",
  location: "Washington, D.C.",
  image: "https://images.unsplash.com/photo-1593179357196-ea11a2e7c119?w=600&q=80",},
  {
  id: 2,
  title: "Update: Genetic Sequencing Results for Wisconsin Dairy Herd Detection of HPAI",
  source: "USDA APHIS",
  sourceUrl: "https://www.aphis.usda.gov/news/agency-announcements/update-genetic-sequencing-results-wisconsin-dairy-herd-detection-highly",
  date: "Dec 19, 2025",
  description: "USDA confirmed H5N1 clade 2.3.4.4b genotype D1.1 in a Wisconsin dairy herd — a new spillover event from wildlife, separate from previous outbreaks. Pasteurization continues to protect the commercial milk supply, and public health risk remains low.",
  disease: "H5N1 (Avian Flu)",
  location: "Wisconsin",
  image: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&q=80",},
  {
  id: 3,
  title: "USDA Confirms Highly Pathogenic Avian Influenza in a Dairy Herd in Wisconsin",
  source: "USDA APHIS",
  sourceUrl: "https://www.aphis.usda.gov/news/agency-announcements/usda-confirms-highly-pathogenic-avian-influenza-dairy-herd-wisconsin",
  date: "Dec 14, 2025",
  description: "USDA APHIS confirmed HPAI H5 in a Wisconsin dairy herd — the first known case in the state. Detected through routine milk testing, not pre-movement surveillance. Commercial milk supply remains safe, and public health risk is considered low.",
  disease: "H5N1 (Avian Flu)",
  location: "Wisconsin",
  image: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=80",},
  {
  id: 4,
  title: "USDA Confirms 7th Case of Atypical BSE in South Carolina Beef Cow",
  source: "USDA APHIS",
  sourceUrl: "https://www.aphis.usda.gov/news/agency-announcements/usda-announces-atypical-bovine-spongiform-encephalopathy-detection",
  date: "May 19, 2023",
  description: "USDA confirmed atypical L-type BSE in a 5-year-old beef cow at a South Carolina slaughter plant. The animal never entered the food supply and posed no risk to human health. The U.S. maintains negligible risk status for BSE.",
  disease: "Mad Cow Disease (BSE)",
  location: "South Carolina",
  image: "https://images.unsplash.com/photo-1465379944081-7f47de8d74ac?w=600&q=80",},
  {
  id: 5,
  title: "New Biosecurity Guidelines Released for Poultry Operations",
  source: "WOAH",
  sourceUrl: "https://wahis.woah.org/#/event-management",
  date: "Jan 18, 2026",
  description:"Updated biosecurity protocols have been released for commercial and backyard poultry operations. The guidelines emphasize enhanced cleaning procedures, visitor restrictions, and wildlife deterrent measures to reduce the risk of disease introduction.",
  disease: "Avian Influenza",
  location: "Nationwide",
  image: "https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?w=600&q=80",},
  {
  id: 6,
  title: "First Detection of H5N1 in U.S. Swine Reported in Oregon",
  source: "AVMA",
  sourceUrl: "https://www.avma.org/resources-tools/animal-health-and-welfare/animal-health/avian-influenza/avian-influenza-virus-type-h5n1-us-dairy-cattle",
  date: "Nov 2024",
  description: "H5N1 was confirmed in two pigs on an Oregon backyard farm where poultry and livestock were comingled — the first detection of the virus in U.S. swine. USDA confirmed no concern about the safety of the nation's pork supply.",
  disease: "Swine Flu",
  location: "Oregon",
  image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600&q=80",}
];
const diseaseOptions = ["All Diseases", "H5N1 (Avian Flu)", "Swine Flu", "Mad Cow Disease (BSE)", "Bluetongue", "Other",];
const sortOptions = ["Newest First", "Oldest First", "Source A-Z"];
const ITEMS_PER_PAGE = 3;

export default function News() {
  const [selectedDisease, setSelectedDisease] = useState("All Diseases");
  const [locationQuery, setLocationQuery] = useState("");
  const [sortBy, setSortBy] = useState("Newest First");
  const [currentPage, setCurrentPage] = useState(1);
  const [diseaseOpen, setDiseaseOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = mockNews
    .filter((n) => selectedDisease === "All Diseases" || n.disease === selectedDisease)
    .filter((n) =>
      locationQuery === "" ||
      n.location.toLowerCase().includes(locationQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "Newest First") return new Date(b.date) - new Date(a.date);
      if (sortBy === "Oldest First") return new Date(a.date) - new Date(b.date);
      return a.source.localeCompare(b.source);
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .news-page { background-color: #f0f0f0; min-height: 100vh; display: flex; flex-direction: column; }
        .news-header { background-color: #fff; border-bottom: 3px solid #4a4a8a; padding: 16px 24px; }
        .news-header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: center; gap: 12px; }
        .news-header h1 { font-size: 28px; font-weight: 900; letter-spacing: 2px; font-family: 'Arial Black', sans-serif; }
        .nav-btn { padding: 4px 14px; border: 1px solid #888; background-color: #e8e8e8; cursor: pointer; font-size: 14px; border-radius: 2px; }
        .news-content { max-width: 1100px; margin: 24px auto; padding: 0 24px; flex: 1; width: 100%; }
        .filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .dropdown-wrapper { position: relative; }
        .filter-btn { padding: 8px 16px; border: 1px solid #aaa; background-color: #e8e8e8; cursor: pointer; font-size: 14px; font-weight: bold; border-radius: 2px; display: flex; align-items: center; gap: 6px; }
        .dropdown-menu { position: absolute; top: 100%; left: 0; background: #fff; border: 1px solid #aaa; z-index: 100; min-width: 160px; box-shadow: 2px 2px 6px rgba(0,0,0,0.15); }
        .dropdown-menu.right { right: 0; left: auto; }
        .dropdown-item { padding: 8px 14px; cursor: pointer; font-size: 14px; }
        .dropdown-item:hover { background: #f0f0f0; }
        .search-wrapper { display: flex; align-items: center; border: 1px solid #aaa; background: #fff; padding: 4px 10px; border-radius: 2px; gap: 6px; flex: 1; max-width: 260px; }
        .search-wrapper input { border: none; outline: none; font-size: 14px; width: 100%; background: transparent; }
        .sort-wrapper { margin-left: auto; }
        .news-list { display: flex; flex-direction: column; gap: 12px; }
        .news-card { background: #fff; border: 1px solid #ccc; overflow: hidden; display: flex; }
        .news-card-image { width: 220px; flex-shrink: 0; overflow: hidden; min-height: 160px; }
        .news-card-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .news-card-body { padding: 20px 24px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        .card-title { font-size: 16px; font-weight: bold; color: #1a1a8a; text-decoration: underline; cursor: pointer; flex: 1; }
        .card-title:hover { color: #0000cc; }
        .card-meta { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
        .meta-tag { font-size: 12px; border: 1px solid #aaa; padding: 2px 8px; background: #f5f5f5; white-space: nowrap; }
        .card-desc { font-size: 14px; line-height: 1.6; color: #333; }
        .card-links { display: flex; gap: 12px; padding-top: 8px; border-top: 1px solid #eee; flex-wrap: wrap; }
        .card-link { font-size: 12px; color: #1a1a8a; text-decoration: none; font-family: sans-serif; }
        .card-link:hover { text-decoration: underline; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 24px; }
        .page-btn { padding: 4px 14px; border: 1px solid #aaa; background: #e8e8e8; cursor: pointer; font-size: 13px; border-radius: 2px; }
        .page-btn:disabled { opacity: 0.4; cursor: default; }
        .page-info { font-size: 13px; border: 1px solid #aaa; padding: 4px 14px; background: #f5f5f5; }
        .news-footer { background-color: #d0d0d0; border-top: 2px solid #4a4a8a; text-align: center; padding: 10px; font-size: 13px; font-weight: bold; margin-top: auto; }
        .empty { padding: 40px; text-align: center; color: #888; font-size: 15px; }

        @media (max-width: 768px) {
          .news-header h1 { font-size: 18px; letter-spacing: 1px; }
          .news-content { padding: 0 12px; margin: 16px auto; }
          .news-card { flex-direction: column; }
          .news-card-image { width: 100%; height: 180px; }
          .news-card-body { padding: 14px 16px; }
          .card-top { flex-direction: column; gap: 8px; }
          .sort-wrapper { margin-left: 0; }
          .search-wrapper { max-width: 100%; }
        }
      `}</style>

      <div className="news-page">
        {/* Header */}
        <SiteHeader />

        {/* Nav */}
        <Navbar />

        {/* Content */}
        <div className="news-content">
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="dropdown-wrapper">
              <button className="filter-btn" onClick={() => { setDiseaseOpen(!diseaseOpen); setSortOpen(false); }}>
                Disease Filter <span style={{ fontSize: 10 }}>▲</span>
              </button>
              {diseaseOpen && (
                <div className="dropdown-menu">
                  {diseaseOptions.map((d) => (
                    <div key={d} className="dropdown-item"
                      style={{ fontWeight: selectedDisease === d ? "bold" : "normal" }}
                      onClick={() => { setSelectedDisease(d); setDiseaseOpen(false); setCurrentPage(1); }}>
                      {d}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="search-wrapper">
              <span>🔍</span>
              <input
                placeholder="City, State, ZIP"
                value={locationQuery}
                onChange={(e) => { setLocationQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div className="dropdown-wrapper sort-wrapper">
              <button className="filter-btn" onClick={() => { setSortOpen(!sortOpen); setDiseaseOpen(false); }}>
                Sort By <span style={{ fontSize: 10 }}>▲</span>
              </button>
              {sortOpen && (
                <div className="dropdown-menu right">
                  {sortOptions.map((s) => (
                    <div key={s} className="dropdown-item"
                      style={{ fontWeight: sortBy === s ? "bold" : "normal" }}
                      onClick={() => { setSortBy(s); setSortOpen(false); }}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* News List */}
          <div className="news-list">
            {paginated.length === 0 ? (
              <div className="empty">No news found for the selected filters.</div>
            ) : (
              paginated.map((article) => (
                <div key={article.id} className="news-card">
                  <div className="news-card-image">
                    <img
                      src={article.image}
                      alt={article.title}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </div>
                  <div className="news-card-body">
                    <div className="card-top">
                      <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card-title"
                      >
                        {article.title}
                      </a>
                      <div className="card-meta">
                        <span className="meta-tag">Source: <strong>{article.source}</strong></span>
                        <span className="meta-tag">Date: <strong>{article.date}</strong></span>
                      </div>
                    </div>

                    <p className="card-desc">{article.description}</p>

                    <div className="card-links">
                      <a href="https://www.aphis.usda.gov/h5n1-hpai#detections-hpai" target="_blank" rel="noopener noreferrer" className="card-link">
                        → USDA APHIS H5N1 Detections
                      </a>
                      <a href="https://wahis.woah.org/#/event-management" target="_blank" rel="noopener noreferrer" className="card-link">
                        → WOAH Event Management
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button className="page-btn" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Prev.
            </button>
            <span className="page-info">
              Pg. <strong>{currentPage}</strong> OF <strong>{totalPages}</strong>
            </span>
            <button className="page-btn" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </div>

        {/* Footer */}
        <SiteFooter />
      </div>
    </>
  );
}
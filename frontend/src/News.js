import { useEffect, useState } from "react";
import Navbar from './homepage/Navbar';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const NEWS_API = IS_LOCAL
  ? 'http://localhost:8000/api/news.php'
  : '/CSE442/2026-Spring/cse-442c/backend/public/api/news.php';

const sortOptions = ["Newest First", "Oldest First", "Source A-Z"];
const ITEMS_PER_PAGE = 3;

export default function News() {
  const [sortBy, setSortBy] = useState("Newest First");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setArticles([]);
    setCurrentPage(1);
    const loadNews = async () => {
      try {
        const response = await fetch(NEWS_API, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.ok || !Array.isArray(data.articles)) {
          throw new Error('News is temporarily unavailable. Please try again.');
        }
        if (!controller.signal.aborted) setArticles(data.articles);
      } catch (err) {
        if (!controller.signal.aborted) setError('News is temporarily unavailable. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadNews();
    return () => {
      controller.abort();
    };
  }, [retry]);

  const sortedArticles = [...articles]
    .sort((a, b) => {
      if (sortBy === "Newest First") return new Date(b.date) - new Date(a.date);
      if (sortBy === "Oldest First") return new Date(a.date) - new Date(b.date);
      return a.source.localeCompare(b.source);
    });

  const totalPages = Math.max(1, Math.ceil(sortedArticles.length / ITEMS_PER_PAGE));
  const paginated = sortedArticles.slice(
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
        }
      `}</style>

      <div className="news-page">
        {/* Header */}
        <SiteHeader />

        {/* Nav */}
        <Navbar />

        {/* Content */}
        <div className="news-content">
          <h1>Agricultural News</h1>
          <p style={{ margin: "12px 0 20px" }}>Latest agricultural headlines via GNews.</p>
          {/* Sort articles */}
          <div className="filter-bar">
            <div className="dropdown-wrapper sort-wrapper">
              <button className="filter-btn" onClick={() => { setSortOpen(!sortOpen); }}>
                Sort By <span style={{ fontSize: 10 }}>▲</span>
              </button>
              {sortOpen && (
                <div className="dropdown-menu right">
                  {sortOptions.map((s) => (
                    <div key={s} className="dropdown-item"
                      style={{ fontWeight: sortBy === s ? "bold" : "normal" }}
                      onClick={() => { setSortBy(s); setSortOpen(false); setCurrentPage(1); }}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* News List */}
          <div className="news-list">
            {loading ? (
              <div className="empty" role="status">Loading news...</div>
            ) : error ? (
              <div className="empty" role="alert">
                <p>{error}</p>
                <button className="page-btn" onClick={() => setRetry((value) => value + 1)}>Try again</button>
              </div>
            ) : paginated.length === 0 ? (
              <div className="empty">No agricultural news is available right now.</div>
            ) : (
              paginated.map((article) => (
                <div key={article.id} className="news-card">
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
                        <span className="meta-tag">Date: <strong>{article.date ? new Date(article.date).toLocaleDateString() : "Date unavailable"}</strong></span>
                      </div>
                    </div>

                    <p className="card-desc">{article.description}</p>


                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && sortedArticles.length > 0 && <div className="pagination">
            <button className="page-btn" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              Prev.
            </button>
            <span className="page-info">
              Pg. <strong>{currentPage}</strong> OF <strong>{totalPages}</strong>
            </span>
            <button className="page-btn" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              Next
            </button>
          </div>}
        </div>

        {/* Footer */}
        <SiteFooter />
      </div>
    </>
  );
}
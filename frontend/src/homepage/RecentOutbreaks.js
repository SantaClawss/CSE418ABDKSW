import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_BASE = IS_LOCAL
  ? 'http://localhost:8000/api'
  : 'https://aptitude.cse.buffalo.edu/CSE442/2026-Spring/cse-442c/backend/public/api';

const MORTALITY_COLOR = {
  High:     { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  Moderate: { bg: '#ffedd5', text: '#ea580c', border: '#fdba74' },
  Low:      { bg: '#fef9c3', text: '#ca8a04', border: '#fde047' },
};

const STATUS_COLOR = {
  approved: { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  pending:  { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' },
  rejected: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
};

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  if (diffMonths < 12) return `${diffMonths} months ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
}

function buildLocation(row) {
  if (row.county && row.state) return `${row.county} County, ${row.state}`;
  if (row.state) return row.state;
  return 'Unknown Location';
}

function Badge({ label, colors }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      background: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function OutbreakCard({ row }) {
  const mortalityColors = MORTALITY_COLOR[row.mortality_status] || null;
  const statusColors    = STATUS_COLOR[row.status]              || STATUS_COLOR.pending;
  const location        = buildLocation(row);
  const timeAgo         = formatTimeAgo(row.report_date || row.created_at);
  const dateLabel       = formatDate(row.report_date);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.85rem 1rem',
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderLeft: `4px solid ${mortalityColors ? mortalityColors.border : '#3d5af1'}`,
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* Left: disease + location */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2a44', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.disease}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>📍</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          {row.cases.toLocaleString()} {row.cases === 1 ? 'case' : 'cases'} · {dateLabel}
        </div>
      </div>

      {/* Right: mortality + status + time */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
        {mortalityColors && (
          <Badge label={`${row.mortality_status} Risk`} colors={mortalityColors} />
        )}
        <Badge label={row.status || 'pending'} colors={statusColors} />
        {timeAgo && (
          <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{timeAgo}</span>
        )}
      </div>
    </div>
  );
}

function DiseaseSection({ disease, records }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? records : records.slice(0, 3);

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Section header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        background: '#1f2a44',
        color: '#fff',
      }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.3px' }}>
          Most Recent — {disease}
        </h4>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {records.length} report{records.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem' }}>
        {visible.map(row => (
          <OutbreakCard key={row.id} row={row} />
        ))}
      </div>

      {/* Show more / less */}
      {records.length > 3 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'none',
            border: 'none',
            borderTop: '1px solid #e2e8f0',
            cursor: 'pointer',
            fontSize: 12,
            color: '#3d5af1',
            fontWeight: 600,
          }}
        >
          {expanded ? 'Show less ▲' : `Show ${records.length - 3} more ▼`}
        </button>
      )}
    </div>
  );
}

const RecentOutbreaks = () => {
  const [grouped, setGrouped]   = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');

    fetch(`${API_BASE}/recentOutbreaks.php`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!mounted) return;
        if (!ok || data.error) throw new Error(data.error || 'Failed to load');
        const rows = Array.isArray(data) ? data : [];
        const map = {};
        rows.forEach(row => {
          if (!map[row.disease]) map[row.disease] = [];
          map[row.disease].push(row);
        });
        setGrouped(map);
      })
      .catch(() => {
        if (mounted) setError('Could not load outbreaks right now.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const diseases = Object.keys(grouped).sort();

  return (
    <section style={{ background: '#ffffff', border: '1px solid #ccd5df', borderRadius: 8, padding: '1.25rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <h3 style={{ margin: 0, color: '#1f2a44', fontSize: 16 }}>Recent Outbreaks by Disease</h3>
        <button
          type="button"
          onClick={() => navigate('/self-report')}
          style={{
            background: '#3d5af1',
            color: 'white',
            border: 'none',
            padding: '0.4rem 1rem',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + Self Report
        </button>
      </div>

      {/* States */}
      {isLoading && (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>
          Loading outbreaks…
        </div>
      )}

      {!isLoading && error && (
        <div style={{ color: '#dc2626', fontWeight: 600, padding: '1rem 0' }}>{error}</div>
      )}

      {!isLoading && !error && diseases.length === 0 && (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>
          No recent outbreaks found.
        </div>
      )}

      {!isLoading && !error && diseases.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {diseases.map(disease => (
            <DiseaseSection key={disease} disease={disease} records={grouped[disease]} />
          ))}
        </div>
      )}
    </section>
  );
};

export default RecentOutbreaks;

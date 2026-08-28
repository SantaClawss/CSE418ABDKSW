import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveCountyCoordinates } from './countyCoordinates';
import WindOverlay from '../components/WindOverlay';
import MapWindController from '../components/MapWindController';

const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_ROOT = IS_LOCAL
  ? 'http://localhost:8000/api'
  : 'https://aptitude.cse.buffalo.edu/CSE442/2026-Spring/cse-442c/backend/public/api';

const HOMEPAGE_API = `${API_ROOT}/homepage.php`;
const MAP_POINTS_API = `${API_ROOT}/homepageMapPoints.php`;
const WIND_API = IS_LOCAL
  ? 'http://localhost/s26-jnswl-corp/backend/public/api/index.php'
  : 'https://aptitude.cse.buffalo.edu/CSE442/2026-Spring/cse-442c/backend/public/api/index.php';

// Fixed bounds covering the continental US for cartogram wind fetch
const US_NORTH = 49.5;
const US_SOUTH = 24.5;
const US_EAST = -66.5;
const US_WEST = -124.5;

const BLUE = '#3d5af1';
const MAP_BG = '#e8f0ff';

const MOCK_BY_STATE = [
  { state: 'California', outbreaks: 8, total_cases: 8 },
  { state: 'Texas', outbreaks: 7, total_cases: 7 },
  { state: 'Pennsylvania', outbreaks: 5, total_cases: 5 },
  { state: 'Indiana', outbreaks: 5, total_cases: 5 },
  { state: 'Missouri', outbreaks: 4, total_cases: 4 },
  { state: 'Minnesota', outbreaks: 3, total_cases: 3 },
  { state: 'Alaska', outbreaks: 2, total_cases: 2 },
  { state: 'Hawaii', outbreaks: 1, total_cases: 1 },
];

const STATE_GRID = {
  Maine: [10, 0],
  Washington: [1, 0], Montana: [2, 0], 'North Dakota': [3, 0],
  Minnesota: [4, 0], Wisconsin: [5, 0], Michigan: [6, 0],
  'New Hampshire': [10, 1], Vermont: [9, 1],
  Oregon: [1, 1], Idaho: [2, 1], 'South Dakota': [3, 1],
  Iowa: [4, 1], Illinois: [5, 1], Indiana: [6, 1],
  Ohio: [7, 1], Pennsylvania: [8, 1], 'New York': [9, 1],
  'Rhode Island': [11, 2], Massachusetts: [10, 2], Connecticut: [9, 2],
  California: [1, 2], Nevada: [2, 2], Wyoming: [3, 2],
  Nebraska: [4, 2], Missouri: [5, 2], Kentucky: [6, 2],
  'West Virginia': [7, 2], Virginia: [8, 2], Maryland: [9, 3],
  'New Jersey': [10, 3],
  Utah: [2, 3], Colorado: [3, 3], Kansas: [4, 3],
  Arkansas: [5, 3], Tennessee: [6, 3], 'North Carolina': [7, 3],
  'South Carolina': [8, 3], Delaware: [9, 4],
  Arizona: [2, 4], 'New Mexico': [3, 4], Oklahoma: [4, 4],
  Louisiana: [5, 4], Mississippi: [6, 4], Georgia: [7, 4],
  Florida: [7, 5],
  Texas: [4, 5],
  Alabama: [6, 5],
  Alaska: [1, 6], Hawaii: [2, 6],
};

const STATE_ABBR = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR',
  California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS',
  Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY',
};

const MORTALITY_COLORS = {
  High: '#dc2626',
  Moderate: '#f97316',
  Low: '#fbbf24',
};

const MIN_CELL = 30;
const MAX_CELL = 72;
const GAP = 3;
const COLS = 14;
const ROWS = 7;
const NATURAL_W = COLS * (MAX_CELL + GAP);
const NATURAL_H = ROWS * (MAX_CELL + GAP);

function choroplethColor(value, max) {
  if (!value || max === 0) return '#e8eaf0';
  const t = value / max;

  if (t < 0.33) {
    return `rgb(255, ${Math.round(237 - t * 3 * 100)}, ${Math.round(160 - t * 3 * 160)})`;
  }

  if (t < 0.66) {
    const t2 = (t - 0.33) * 3;
    return `rgb(255, ${Math.round(137 - t2 * 80)}, 0)`;
  }

  const t3 = (t - 0.66) * 3;
  return `rgb(${Math.round(255 - t3 * 55)}, ${Math.round(57 - t3 * 30)}, 0)`;
}

function pointRadius(cases) {
  const n = Math.max(1, Number(cases) || 1);
  return Math.max(5, Math.min(11, 4 + Math.log10(n + 1) * 2.2));
}

function jitterCoordinate(baseLat, baseLng, id) {
  const seed = Number(id) || 0;
  const latOffset = (((seed * 17) % 9) - 4) * 0.08;
  const lngOffset = (((seed * 29) % 9) - 4) * 0.1;
  return [baseLat + latOffset, baseLng + lngOffset];
}

function formatDate(dateValue) {
  if (!dateValue) return 'Unknown';
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildLocationLabel(point) {
  if (point.county) {
    return `${point.county} County, ${point.state}`;
  }
  return `${point.state} (state-level)`;
}

function viewToggleStyle(active) {
  return {
    padding: '4px 10px',
    background: active ? BLUE : '#fff',
    color: active ? '#fff' : '#4b5563',
    border: `1px solid ${active ? BLUE : '#cbd5e1'}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}

function filterBtn(active) {
  return {
    padding: '0.4rem 0.9rem',
    border: `1px solid ${active ? BLUE : '#ccc'}`,
    borderRadius: '20px',
    cursor: 'pointer',
    background: active ? BLUE : '#fff',
    color: active ? '#fff' : '#555',
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    transition: '0.2s ease',
  };
}

function MapGrid({ stateMap, maxVal, metricLabel, onTooltip, clearTooltip }) {
  return (
    <>
      {Object.entries(STATE_GRID).map(([stateName, [col, row]]) => {
        const val = stateMap[stateName] ?? 0;
        const cellSize = val > 0 ? MIN_CELL + Math.round((val / maxVal) * (MAX_CELL - MIN_CELL)) : MIN_CELL;
        const bg = choroplethColor(val, maxVal);
        const abbr = STATE_ABBR[stateName] || stateName.slice(0, 2).toUpperCase();
        const textColor = val / maxVal > 0.5 ? '#fff' : '#1a1a2e';

        return (
          <div
            key={stateName}
            onMouseEnter={(e) => onTooltip && onTooltip({ name: stateName, val, x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => onTooltip && onTooltip({ name: stateName, val, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => clearTooltip && clearTooltip()}
            style={{
              position: 'absolute',
              left: col * (MAX_CELL + GAP) + (MAX_CELL - cellSize) / 2,
              top: row * (MAX_CELL + GAP) + (MAX_CELL - cellSize) / 2,
              width: cellSize,
              height: cellSize,
              background: bg,
              border: `1px solid rgba(0,0,0,${val > 0 ? 0.15 : 0.08})`,
              borderRadius: Math.round(cellSize * 0.12),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: Math.max(8, Math.round(cellSize * 0.25)),
              fontWeight: 700,
              color: textColor,
              userSelect: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              zIndex: 1,
            }}
          >
            <span>{abbr}</span>
            {val > 0 && cellSize >= 28 && (
              <span style={{ fontSize: Math.max(7, Math.round(cellSize * 0.18)), fontWeight: 400, marginTop: 1, opacity: 0.85 }}>
                {val.toLocaleString()}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

function FullscreenMap({ stateMap, maxVal, metricLabel, windEnabled, onWindToggle, onClose }) {
  const [tooltip, setTooltip] = useState(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.getBoundingClientRect().width;
      if (width > 0) setFitScale(width / NATURAL_W);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseScale = fitScale * 1.15;
  const scale = baseScale * zoom;
  const scaledW = NATURAL_W * scale;
  const scaledH = NATURAL_H * scale;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: MAP_BG, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #ccd5df', flexShrink: 0, gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 'clamp(13px,3vw,16px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          Outbreak Density by State
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', background: '#f8f9fa' }}>
            <button
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))}
              style={{ background: 'none', border: 'none', borderRight: '1px solid #ddd', padding: '6px 14px', fontSize: 18, cursor: 'pointer', color: '#333' }}
            >
              +
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.5).toFixed(1)))}
              style={{ background: 'none', border: 'none', padding: '6px 14px', fontSize: 18, cursor: 'pointer', color: '#333' }}
            >
              -
            </button>
          </div>
          <button
            onClick={() => setZoom(1)}
            style={{ background: '#f0f4f8', border: '1px solid #ccc', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: '#555' }}
          >
            Reset
          </button>
          <button
            onClick={onWindToggle}
            style={{ ...filterBtn(windEnabled), display: 'inline-flex', alignItems: 'center', gap: 5 }}
            title={windEnabled ? 'Turn off wind overlay' : 'Turn on wind overlay'}
          >
            <span style={{ fontSize: 14 }}>🌬</span>
            Weather {windEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onClose}
            style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            x
          </button>
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', padding: 12, display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', width: Math.max(scaledW, 100), height: scaledH, flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: NATURAL_W, height: NATURAL_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <MapGrid stateMap={stateMap} maxVal={maxVal} metricLabel={metricLabel} onTooltip={setTooltip} clearTooltip={() => setTooltip(null)} />
            <CartogramWindLayer windEnabled={windEnabled} />
          </div>
        </div>
      </div>

      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 44, background: '#1a1a2e', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10001, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <strong>{tooltip.name}</strong>
          <br />
          {tooltip.val > 0 ? `${tooltip.val.toLocaleString()} ${metricLabel}` : 'No data'}
        </div>
      )}

      <div style={{ padding: '8px 16px', background: '#fff', borderTop: '1px solid #ccd5df', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>Fewer {metricLabel}</span>
        <div style={{ display: 'flex', flex: 1, minWidth: 60, height: 10, borderRadius: 6, overflow: 'hidden' }}>
          {Array.from({ length: 50 }, (_, i) => (
            <div key={i} style={{ flex: 1, background: choroplethColor((i / 50) * maxVal, maxVal) }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>More {metricLabel}</span>
        <span style={{ fontSize: 10, color: '#555', fontWeight: 500 }}>+/- to zoom, Esc to close</span>
      </div>
    </div>
  );
}

function CartogramWindLayer({ windEnabled }) {
  const [windPoints, setWindPoints] = useState([]);

  useEffect(() => {
    if (!windEnabled) {
      setWindPoints([]);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      r: 'weather',
      north: US_NORTH.toFixed(6),
      south: US_SOUTH.toFixed(6),
      east: US_EAST.toFixed(6),
      west: US_WEST.toFixed(6),
      zoom: '4',
    });

    fetch(`${WIND_API}?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.points)) setWindPoints(data.points);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [windEnabled]);

  if (!windEnabled || windPoints.length === 0) return null;

  return (
    <>
      <style>{`
        .cgram-wind-arrow { animation: windFloat 1.8s ease-in-out infinite; }
        .cgram-delay-0 { animation-delay: 0s; }
        .cgram-delay-1 { animation-delay: 0.18s; }
        .cgram-delay-2 { animation-delay: 0.36s; }
        .cgram-delay-3 { animation-delay: 0.54s; }
        .cgram-delay-4 { animation-delay: 0.72s; }
        .cgram-delay-5 { animation-delay: 0.90s; }
        .cgram-delay-6 { animation-delay: 1.08s; }
        @keyframes windFloat {
          0%   { transform: translateY(0px); opacity: 0.7; }
          50%  { transform: translateY(-3px); opacity: 1; }
          100% { transform: translateY(0px); opacity: 0.7; }
        }
      `}</style>
      {windPoints.map((point, index) => {
        const x = ((point.lng - US_WEST) / (US_EAST - US_WEST)) * NATURAL_W;
        const y = ((US_NORTH - point.lat) / (US_NORTH - US_SOUTH)) * NATURAL_H;
        const direction = Number(point.wind_direction) || 0;
        const speed = Number(point.wind_speed) || 0;
        const scale = Math.max(0.7, Math.min(1.2, 0.7 + speed / 60));
        const opacity = Math.max(0.5, Math.min(0.9, 0.5 + speed / 60));

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                opacity,
                transform: `rotate(${(direction + 180) % 360}deg) scale(${scale})`,
                transformOrigin: 'center',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
              }}
            >
              <div className={`cgram-wind-arrow cgram-delay-${index % 7}`}>
                <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
                  <line x1="16" y1="25" x2="16" y2="10" stroke="#1f3c88" strokeWidth="3" strokeLinecap="round" />
                  <polygon points="16,4 9,13 13,13 13,18 19,18 19,13 23,13" fill="#1f3c88" />
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function DashboardMap({ stateMap, maxVal, metricLabel, windEnabled }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setScale(1);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.getBoundingClientRect().width;
      if (width > 0) setScale(width / NATURAL_W);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  return (
    <div ref={containerRef} style={{ width: '100%', overflowX: isMobile ? 'auto' : 'hidden', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ position: 'relative', width: isMobile ? NATURAL_W : NATURAL_W * scale, height: isMobile ? NATURAL_H : NATURAL_H * scale }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: NATURAL_W, height: NATURAL_H, transform: isMobile ? 'none' : `scale(${scale})`, transformOrigin: 'top left', overflow: 'visible' }}>
          <MapGrid stateMap={stateMap} maxVal={maxVal} metricLabel={metricLabel} onTooltip={setTooltip} clearTooltip={() => setTooltip(null)} />
          <CartogramWindLayer windEnabled={windEnabled} />
        </div>
      </div>
      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 44, background: '#1a1a2e', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <strong>{tooltip.name}</strong>
          <br />
          {tooltip.val > 0 ? `${tooltip.val.toLocaleString()} ${metricLabel}` : 'No data'}
        </div>
      )}
      {isMobile && <p style={{ fontSize: 10, color: '#999', textAlign: 'center', margin: '4px 0 0' }}>&lt;- Scroll to see all states -&gt;</p>}
    </div>
  );
}

function DotPlotMapInner({ points, isLoading, error, windEnabled }) {
  const [windPoints, setWindPoints] = useState([]);
  const [windLoading, setWindLoading] = useState(false);
  const [windError, setWindError] = useState('');

  return (
    <>
      <MapWindController
        enabled={windEnabled}
        onWindData={setWindPoints}
        onWindError={setWindError}
        onWindLoading={setWindLoading}
      />
      <WindOverlay enabled={windEnabled} windPoints={windPoints} />

      {points.map((point) => {
        const color = MORTALITY_COLORS[point.mortality_status] || BLUE;
        return (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={pointRadius(point.cases)}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: point.usedFallback ? 0.6 : 0.82,
              weight: point.usedFallback ? 1 : 1.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div style={{ minWidth: 170, color: '#0f172a', lineHeight: 1.35 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{point.disease}</div>
                <div>{buildLocationLabel(point)}</div>
                <div>{Number(point.cases).toLocaleString()} cases</div>
                <div>Reported {formatDate(point.report_date)}</div>
                {point.usedFallback && <div style={{ color: '#475569' }}>State-center fallback</div>}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {isLoading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(232,240,255,0.55)', pointerEvents: 'none' }}>
          <div style={{ background: '#fff', border: '1px solid #dbe2ea', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#334155' }}>
            Loading map points...
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '12px 16px', fontSize: 13, fontWeight: 700, textAlign: 'center', maxWidth: '80%' }}>
            {error}
          </div>
        </div>
      )}

      {windEnabled && windLoading && (
        <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1001, background: 'rgba(255,255,255,0.9)', border: '1px solid #dbe2ea', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#334155', pointerEvents: 'none' }}>
          Loading wind data...
        </div>
      )}

      {windEnabled && windError && !windLoading && (
        <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1001, background: 'rgba(255,255,255,0.95)', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#b91c1c', pointerEvents: 'none' }}>
          Wind Data Unavailable
        </div>
      )}
    </>
  );
}

function DotPlotMap({ points, isLoading, error, windEnabled }) {
  return (
    <div style={{ height: 500, borderRadius: 8, overflow: 'hidden', border: '1px solid #d7dfeb', position: 'relative', background: '#dce8f8' }}>
      <MapContainer center={[39.5, -98.35]} zoom={4} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <DotPlotMapInner
          points={points}
          isLoading={isLoading}
          error={error}
          windEnabled={windEnabled}
        />
      </MapContainer>

      <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(255,255,255,0.96)', border: '1px solid #dbe2ea', borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#334155', pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        Map View: one dot per outbreak entry
      </div>
    </div>
  );
}

function DotPlotFullscreenMap({ points, windEnabled, onWindToggle, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#dce8f8', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #ccd5df', flexShrink: 0 }}>
        <h3 style={{ margin: 0, fontSize: 'clamp(13px,3vw,16px)' }}>Map View: Outbreak Locations</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onWindToggle}
            style={{ ...filterBtn(windEnabled), display: 'inline-flex', alignItems: 'center', gap: 5 }}
            title={windEnabled ? 'Turn off wind overlay' : 'Turn on wind overlay'}
          >
            <span style={{ fontSize: 14 }}>🌬</span>
            Weather {windEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onClose}
            style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 8, width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            x
          </button>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={[39.5, -98.35]} zoom={4} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          <DotPlotMapInner
            points={points}
            isLoading={false}
            error=""
            windEnabled={windEnabled}
          />
        </MapContainer>
      </div>
    </div>
  );
}

const MapSection = () => {
  const [stateData, setStateData] = useState(MOCK_BY_STATE);
  const [pointRows, setPointRows] = useState([]);
  const [diseaseType, setDiseaseType] = useState('all');
  const [specificDisease, setSpecificDisease] = useState('');
  const [diseases, setDiseases] = useState([]);
  const [showListMsg, setShowListMsg] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('cartogram');
  const [pointLoading, setPointLoading] = useState(true);
  const [pointError, setPointError] = useState('');
  const [windEnabled, setWindEnabled] = useState(false);
  const listBtnRef = useRef(null);

  useEffect(() => {
    setSpecificDisease('');
    const params = diseaseType !== 'all' ? `&disease_type=${diseaseType}` : '';
    axios.get(`${HOMEPAGE_API}?r=homepage-diseases${params}`).then((r) => setDiseases(r.data)).catch(() => {});
  }, [diseaseType]);

  useEffect(() => {
    let url = `${HOMEPAGE_API}?r=homepage-by-state`;
    if (diseaseType !== 'all') url += `&disease_type=${diseaseType}`;
    if (specificDisease) url += `&disease=${encodeURIComponent(specificDisease)}`;

    axios.get(url)
      .then((r) => {
        if (!r.data || !r.data.length) {
          setStateData([]);
          return;
        }
        setStateData(r.data);
      })
      .catch(() => setStateData(MOCK_BY_STATE));
  }, [diseaseType, specificDisease]);

  useEffect(() => {
    let cancelled = false;
    let url = MAP_POINTS_API;
    const params = [];

    if (diseaseType !== 'all') params.push(`disease_type=${encodeURIComponent(diseaseType)}`);
    if (specificDisease) params.push(`disease=${encodeURIComponent(specificDisease)}`);
    if (params.length) url += `?${params.join('&')}`;

    setPointLoading(true);
    setPointError('');

    axios.get(url)
      .then((r) => {
        if (!cancelled) {
          setPointRows(Array.isArray(r.data) ? r.data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPointRows([]);
          setPointError('Map View is unavailable right now.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPointLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [diseaseType, specificDisease]);

  useEffect(() => {
    const handler = (e) => {
      if (listBtnRef.current && !listBtnRef.current.contains(e.target)) {
        setShowListMsg(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const stateMap = useMemo(() => {
    const map = {};
    (stateData || []).forEach((row) => {
      map[row.state] = diseaseType === 'human' ? Number(row.total_cases) : Number(row.outbreaks);
    });
    return map;
  }, [stateData, diseaseType]);

  const mapPoints = useMemo(() => {
    return (pointRows || []).map((row) => {
      const resolved = resolveCountyCoordinates(row.state, row.county);
      const [lat, lng] = jitterCoordinate(resolved.lat, resolved.lng, row.id);

      return {
        ...row,
        lat,
        lng,
        usedFallback: resolved.usedFallback,
      };
    });
  }, [pointRows]);

  const maxVal = useMemo(() => (Object.values(stateMap).length ? Math.max(...Object.values(stateMap)) : 1), [stateMap]);
  const metricLabel = diseaseType === 'human' ? 'cases' : 'outbreaks';
  const noCartogramData = stateData.length === 0;
  const noPointData = !pointLoading && mapPoints.length === 0;
  const showNoData = viewMode === 'cartogram' ? noCartogramData : (noPointData && !pointError);

  return (
    <>
      {fullscreen && viewMode === 'cartogram' && <FullscreenMap stateMap={stateMap} maxVal={maxVal} metricLabel={metricLabel} windEnabled={windEnabled} onWindToggle={() => setWindEnabled((v) => !v)} onClose={() => setFullscreen(false)} />}
      {fullscreen && viewMode === 'map' && <DotPlotFullscreenMap points={mapPoints} windEnabled={windEnabled} onWindToggle={() => setWindEnabled((v) => !v)} onClose={() => setFullscreen(false)} />}

      <div style={{ width: '100%', minWidth: 0, background: MAP_BG, border: '1px solid #ccd5df', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 'clamp(13px, 3vw, 18px)' }}>Outbreak Density by State</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" style={viewToggleStyle(viewMode === 'cartogram')} onClick={() => setViewMode('cartogram')}>Cartogram</button>
            <button type="button" style={viewToggleStyle(viewMode === 'map')} onClick={() => setViewMode('map')}>Map View</button>
            <button
              onClick={() => setFullscreen(true)}
              style={{ padding: '4px 8px', background: '#fff', color: '#111827', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}
            >
              Full
            </button>
            <div style={{ position: 'relative' }} ref={listBtnRef}>
              <button onClick={() => setShowListMsg((v) => !v)} style={{ padding: '4px 8px', background: '#fff', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>List</button>
              {showListMsg && (
                <div style={{ position: 'absolute', top: '110%', right: 0, background: '#1a1a2e', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', zIndex: 999 }}>
                  List View coming soon!
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem', marginTop: '0.75rem', alignItems: 'center' }}>
          <button style={filterBtn(diseaseType === 'all')} onClick={() => setDiseaseType('all')}>All Diseases</button>
          <button style={filterBtn(diseaseType === 'animal')} onClick={() => setDiseaseType('animal')}>Animal Diseases</button>
          <button style={filterBtn(diseaseType === 'human')} onClick={() => setDiseaseType('human')}>Human Diseases</button>
          <select value={specificDisease} onChange={(e) => setSpecificDisease(e.target.value)} style={{ fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer' }}>
            <option value="">All {diseaseType !== 'all' ? diseaseType : ''} diseases</option>
            {diseases.map((disease) => <option key={disease} value={disease}>{disease}</option>)}
          </select>
          <button
            style={{
              ...filterBtn(windEnabled),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
            onClick={() => setWindEnabled((v) => !v)}
            title={windEnabled ? 'Turn off wind overlay' : 'Turn on wind overlay'}
          >
            <span style={{ fontSize: 14 }}>🌬</span>
            Weather {windEnabled ? 'ON' : 'OFF'}
          </button>
          <span style={{ fontSize: 12, color: '#3d5af1', fontWeight: 600 }}>
            {viewMode === 'cartogram' ? `Metric: ${metricLabel.charAt(0).toUpperCase()}${metricLabel.slice(1)}` : 'Hover a dot to inspect a report'}
          </span>
        </div>

        {showNoData ? (
          <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14, border: '2px dashed #ccc', borderRadius: 8 }}>
            No data available for the selected filter.
          </div>
        ) : viewMode === 'cartogram' ? (
          <DashboardMap stateMap={stateMap} maxVal={maxVal} metricLabel={metricLabel} windEnabled={windEnabled} />
        ) : (
          <DotPlotMap points={mapPoints} isLoading={pointLoading} error={pointError} windEnabled={windEnabled} />
        )}

        {viewMode === 'cartogram' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>Fewer {metricLabel}</span>
              <div style={{ display: 'flex', flex: 1, minWidth: 80, height: 10, borderRadius: 6, overflow: 'hidden' }}>
                {Array.from({ length: 50 }, (_, i) => <div key={i} style={{ flex: 1, background: choroplethColor((i / 50) * maxVal, maxVal) }} />)}
              </div>
              <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>More {metricLabel}</span>
            </div>
            <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>Smaller square</span>
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((t, i) => {
                  const size = MIN_CELL + Math.round(t * (MAX_CELL - MIN_CELL));
                  return <div key={i} style={{ width: size, height: size, background: '#bbb', borderRadius: 3, flexShrink: 0 }} />;
                })}
              </div>
              <span style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>Larger = more {metricLabel}</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap', color: '#475569', fontSize: 11 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: MORTALITY_COLORS.High, display: 'inline-block' }} />
              High risk
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: MORTALITY_COLORS.Moderate, display: 'inline-block' }} />
              Moderate risk
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: MORTALITY_COLORS.Low, display: 'inline-block' }} />
              Low risk
            </span>
            <span>One dot = one outbreak entry.</span>
            <span>Missing county data falls back to the state center.</span>
          </div>
        )}
      </div>
    </>
  );
};

export default MapSection;

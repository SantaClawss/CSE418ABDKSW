import React, { useMemo } from 'react';
import L from 'leaflet';
import { Marker } from 'react-leaflet';

function buildWindIcon(direction = 0, speed = 0, index = 0) {
    const safeDirection = Number.isFinite(Number(direction)) ? Number(direction) : 0;
    const safeSpeed = Number.isFinite(Number(speed)) ? Number(speed) : 0;

    const scale = Math.max(0.8, Math.min(1.3, 0.8 + safeSpeed / 60));
    const opacity = Math.max(0.55, Math.min(0.95, 0.55 + safeSpeed / 60));
    const delayClass = `wind-delay-${index % 7}`;

    return L.divIcon({
        className: 'wind-arrow-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        html: `
      <div
        class="wind-arrow-outer"
        style="left: 50%; top: 50%; opacity: ${opacity}; transform: translate(-50%, -50%) rotate(${(safeDirection + 180) % 360}deg) scale(${scale});"
      >
        <div class="wind-arrow-inner ${delayClass}">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
            <line
              x1="16"
              y1="25"
              x2="16"
              y2="10"
              stroke="#1f3c88"
              stroke-width="3"
              stroke-linecap="round"
            />
            <polygon
              points="16,4 9,13 13,13 13,18 19,18 19,13 23,13"
              fill="#1f3c88"
            />
          </svg>
        </div>
      </div>
    `,
    });
}

export default function WindOverlay({ enabled, windPoints }) {
    const icons = useMemo(() => {
        return (windPoints || []).map((point, index) => ({
            key: `${point.lat}-${point.lng}-${index}`,
            position: [Number(point.lat), Number(point.lng)],
            icon: buildWindIcon(point.wind_direction, point.wind_speed, index),
        }));
    }, [windPoints]);

    if (!enabled) {
        return null;
    }

    return (
        <>
            <style>
                {`
          .wind-arrow-div-icon {
            background: transparent !important;
            border: none !important;
          }

          .wind-arrow-outer {
            position: absolute;
            transform-origin: center center;
            will-change: transform, opacity;
            pointer-events: none;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
          }

          .wind-arrow-inner {
            animation-name: windFloat;
            animation-duration: 1.8s;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
          }

          .wind-delay-0 { animation-delay: 0s; }
          .wind-delay-1 { animation-delay: 0.18s; }
          .wind-delay-2 { animation-delay: 0.36s; }
          .wind-delay-3 { animation-delay: 0.54s; }
          .wind-delay-4 { animation-delay: 0.72s; }
          .wind-delay-5 { animation-delay: 0.90s; }
          .wind-delay-6 { animation-delay: 1.08s; }

          @keyframes windFloat {
            0%   { transform: translateY(0px); opacity: 0.7; }
            50%  { transform: translateY(-4px); opacity: 1; }
            100% { transform: translateY(0px); opacity: 0.7; }
          }

          @media (max-width: 768px) {
            .wind-arrow-div-icon svg {
              width: 22px;
              height: 22px;
            }
          }
        `}
            </style>

            {icons.map((item) => (
                <Marker
                    key={item.key}
                    position={item.position}
                    icon={item.icon}
                    interactive={false}
                    keyboard={false}
                    zIndexOffset={1000}
                />
            ))}
        </>
    );
}
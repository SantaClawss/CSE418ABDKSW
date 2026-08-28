import { useCallback, useEffect, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';

const IS_LOCAL =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const API_BASE = IS_LOCAL
    ? 'http://localhost/s26-jnswl-corp/backend/public/api/index.php'
    : 'https://aptitude.cse.buffalo.edu/CSE442/2026-Spring/cse-442c/backend/public/api/index.php';

export default function MapWindController({
                                              enabled,
                                              onWindData,
                                              onWindError,
                                              onWindLoading,
                                          }) {
    const abortRef = useRef(null);
    const timeoutRef = useRef(null);

    const map = useMapEvents({
        moveend: () => {
            if (enabled) {
                scheduleFetch();
            }
        },
        zoomend: () => {
            if (enabled) {
                scheduleFetch();
            }
        },
    });

    const clearPending = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
    }, []);

    const fetchWind = useCallback(async () => {
        if (!enabled) {
            return;
        }

        const bounds = map.getBounds();
        const params = new URLSearchParams({
            r: 'weather',
            north: bounds.getNorth().toFixed(6),
            south: bounds.getSouth().toFixed(6),
            east: bounds.getEast().toFixed(6),
            west: bounds.getWest().toFixed(6),
            zoom: String(map.getZoom()),
        });

        clearPending();

        const controller = new AbortController();
        abortRef.current = controller;

        onWindLoading(true);

        try {
            const response = await fetch(`${API_BASE}?${params.toString()}`, {
                method: 'GET',
                signal: controller.signal,
            });

            const payload = await response.json();

            if (!response.ok || !payload.ok || !Array.isArray(payload.points)) {
                onWindData([]);
                onWindError('Wind Data Unavailable, Try Again Later');
                onWindLoading(false);
                return;
            }

            onWindData(payload.points);
            onWindError('');
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            onWindData([]);
            onWindError('Wind Data Unavailable, Try Again Later');
        } finally {
            onWindLoading(false);
        }
    }, [enabled, map, onWindData, onWindError, onWindLoading, clearPending]);

    const scheduleFetch = useCallback(() => {
        if (!enabled) {
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            fetchWind();
        }, 400);
    }, [enabled, fetchWind]);

    useEffect(() => {
        if (!enabled) {
            clearPending();
            onWindData([]);
            onWindError('');
            onWindLoading(false);
            return;
        }

        scheduleFetch();

        return () => {
            clearPending();
        };
    }, [enabled, scheduleFetch, clearPending, onWindData, onWindError, onWindLoading]);

    useEffect(() => {
        return () => {
            clearPending();
        };
    }, [clearPending]);

    return null;
}
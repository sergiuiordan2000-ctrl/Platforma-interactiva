// Limita UAT Turnu Măgurele (2.12, D6-4, T-B6): verificarea „punct în poligon”, în cod propriu.
// Sursa: OpenStreetMap, relația 10664112 (ODbL), fișierul `server/data/uat_turnu_magurele.geojson`.
// `UAT_BOUNDARY_FILE` poate indica alt fișier GeoJSON (de exemplu în teste).
// Acceptă Polygon și MultiPolygon, cu goluri (inelele interioare). Punctele de pe contur sunt
// considerate în interior (toleranță mică), ca un pin pus exact pe limită să nu fie respins.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA_DIR } from './paths.ts';

export const DEFAULT_UAT_FILE = resolve(DATA_DIR, 'uat_turnu_magurele.geojson');

type Position = [number, number]; // [lng, lat] (GeoJSON)
type Ring = Position[];
type PolygonCoords = Ring[]; // [exterior, ...goluri]

export interface UatBoundary {
  polygons: PolygonCoords[];
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  contains(lat: number, lng: number): boolean;
}

function isPosition(v: unknown): v is Position {
  return Array.isArray(v) && v.length >= 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]);
}

function toRing(v: unknown): Ring {
  if (!Array.isArray(v) || v.length < 4 || !v.every(isPosition)) {
    throw new Error('Limita UAT: inel invalid (minimum 4 poziții [lng, lat]).');
  }
  return v.map((p) => [p[0], p[1]] as Position);
}

function extractPolygons(geo: unknown): PolygonCoords[] {
  const g = geo as { type?: string; features?: unknown[]; geometry?: unknown; coordinates?: unknown };
  switch (g?.type) {
    case 'FeatureCollection':
      return (g.features ?? []).flatMap(extractPolygons);
    case 'Feature':
      return extractPolygons(g.geometry);
    case 'Polygon':
      return [(g.coordinates as unknown[]).map(toRing)];
    case 'MultiPolygon':
      return (g.coordinates as unknown[][]).map((poly) => poly.map(toRing));
    default:
      throw new Error(`Limita UAT: geometrie neacceptată (${String(g?.type)}).`);
  }
}

const EDGE_EPS = 1e-9;

function onSegment(x: number, y: number, a: Position, b: Position): boolean {
  const cross = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  if (Math.abs(cross) > EDGE_EPS) return false;
  return (
    x >= Math.min(a[0], b[0]) - EDGE_EPS &&
    x <= Math.max(a[0], b[0]) + EDGE_EPS &&
    y >= Math.min(a[1], b[1]) - EDGE_EPS &&
    y <= Math.max(a[1], b[1]) + EDGE_EPS
  );
}

/** Ray casting; `edge` = punctul este pe contur. */
function ringTest(x: number, y: number, ring: Ring): 'in' | 'out' | 'edge' {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (onSegment(x, y, a, b)) return 'edge';
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside ? 'in' : 'out';
}

function polygonContains(x: number, y: number, poly: PolygonCoords): boolean {
  const [outer, ...holes] = poly;
  const o = ringTest(x, y, outer!);
  if (o === 'out') return false;
  if (o === 'edge') return true;
  for (const h of holes) {
    const t = ringTest(x, y, h);
    if (t === 'in') return false;
  }
  return true;
}

export function parseUatBoundary(geo: unknown): UatBoundary {
  const polygons = extractPolygons(geo);
  if (polygons.length === 0) throw new Error('Limita UAT: niciun poligon.');
  const all = polygons.flatMap((p) => p[0]!);
  const bbox = {
    minLat: Math.min(...all.map((p) => p[1])),
    maxLat: Math.max(...all.map((p) => p[1])),
    minLng: Math.min(...all.map((p) => p[0])),
    maxLng: Math.max(...all.map((p) => p[0])),
  };
  return {
    polygons,
    bbox,
    contains(lat: number, lng: number): boolean {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      if (lat < bbox.minLat || lat > bbox.maxLat || lng < bbox.minLng || lng > bbox.maxLng) return false;
      return polygons.some((p) => polygonContains(lng, lat, p));
    },
  };
}

/** Citește limita UAT (la pornire). O eroare aici oprește pornirea: fără limită, 2.12 nu se poate aplica. */
export function loadUatBoundary(file: string = DEFAULT_UAT_FILE): UatBoundary {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`Limita UAT: fișierul nu poate fi citit (${file}).`);
  }
  return parseUatBoundary(JSON.parse(raw));
}

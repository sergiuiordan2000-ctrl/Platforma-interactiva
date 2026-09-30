// Geocodarea adresei (2.4, A06-5): serverul propriu întreabă OpenStreetMap Nominatim.
// - adresa vine în corpul cererii (POST), nu în URL, și nu se scrie în jurnale;
// - căutarea este limitată la dreptunghiul UAT (`viewbox` + `bounded=1`), iar rezultatul trebuie să fie
//   în poligonul UAT (2.12); altfel 404;
// - nimic nu se stochează; rezultatul este întotdeauna aproximativ (pin propus, verificat de utilizator).
// Politica Nominatim: `User-Agent` identificabil (GEOCODER_USER_AGENT), maximum o cerere pe secundă.

import type { AppContext } from '../context.ts';

export interface GeocodeCandidate {
  lat: number;
  lng: number;
}

export type GeocodeFn = (address: string) => Promise<GeocodeCandidate[]>;

export class GeocoderUnavailableError extends Error {}

/** Implementarea implicită (fetch către `GEOCODER_URL`). În teste se înlocuiește prin `ctx.geocode`. */
export function nominatimGeocoder(ctx: AppContext): GeocodeFn {
  return async (address: string) => {
    const base = ctx.config.geocoder.url;
    const agent = ctx.config.geocoder.userAgent;
    if (!base || !agent || !ctx.uat) throw new GeocoderUnavailableError('geocodarea nu este configurată');
    const { minLat, maxLat, minLng, maxLng } = ctx.uat.bbox;
    const url = new URL('search', base.endsWith('/') ? base : `${base}/`);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'ro');
    url.searchParams.set('viewbox', `${minLng},${maxLat},${maxLng},${minLat}`);
    url.searchParams.set('bounded', '1');
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': agent, Accept: 'application/json', 'Accept-Language': 'ro' },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new GeocoderUnavailableError('serviciul de geocodare nu răspunde');
    }
    if (!res.ok) throw new GeocoderUnavailableError(`serviciul de geocodare: HTTP ${res.status}`);
    const body = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    if (!Array.isArray(body)) return [];
    return body
      .map((r) => ({ lat: Number(r.lat), lng: Number(r.lon) }))
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
  };
}

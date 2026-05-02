/**
 * Bounding box del Valle del Mezquital (Hidalgo, México) con buffer razonable.
 * Cubre los municipios objetivo: Tula, Ixmiquilpan, Cardonal, Tecozautla, Tepeji,
 * Tezontepec, Tlaxcoapan, Tlahuelilpan, Atotonilco de Tula, Atitalaquia, etc.
 *
 * Las observaciones fuera del bbox se aceptan pero se marcan `flagged = true`
 * con motivo `out_of_bbox` — no se rechazan para permitir expansión futura
 * del proyecto a otras regiones donde T. recurvata es problemática.
 */
export const VALLE_BBOX = {
  latMin: 19.8,
  latMax: 21.2,
  lngMin: -99.8,
  lngMax: -98.4,
} as const;

export function isInsideMezquital(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= VALLE_BBOX.latMin &&
    lat <= VALLE_BBOX.latMax &&
    lng >= VALLE_BBOX.lngMin &&
    lng <= VALLE_BBOX.lngMax
  );
}

/**
 * Valida que `lat`/`lng` sean coordenadas WGS84 válidas (no NaN, no fuera de
 * los rangos globales). Retorna `null` si válidas, o un mensaje de error.
 */
export function validateCoords(lat: unknown, lng: unknown): string | null {
  if (typeof lat !== "number" || !Number.isFinite(lat)) {
    return "Latitud inválida";
  }
  if (typeof lng !== "number" || !Number.isFinite(lng)) {
    return "Longitud inválida";
  }
  if (lat < -90 || lat > 90) return "Latitud fuera de rango (-90, 90)";
  if (lng < -180 || lng > 180) return "Longitud fuera de rango (-180, 180)";
  return null;
}

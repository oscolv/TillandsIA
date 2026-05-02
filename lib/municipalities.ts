/**
 * Dataset estático de municipios del Valle del Mezquital, Hidalgo, México.
 *
 * Cada municipio está descrito por un bbox cuadrado simple (no polígono real).
 * Para identificación de municipio a partir de coordenadas individuales, esto
 * es suficiente — los bboxes son grandes y no se traslapan significativamente
 * en el centroide de cada municipio.
 *
 * Si la precisión a nivel polígono se vuelve necesaria, migrar a turf.js con
 * polígonos reales del INEGI. Para MVP, este enfoque es 1 KB y sin dependencias.
 *
 * Fuentes: INEGI Marco Geoestadístico 2020, redondeado a 2 decimales (~1.1 km).
 */

interface MunicipalityBox {
  name: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

export const MUNICIPALITIES: MunicipalityBox[] = [
  // Corredor Tula (Decreto ZRE Endhó)
  { name: "Tula de Allende", latMin: 20.00, latMax: 20.13, lngMin: -99.39, lngMax: -99.28 },
  { name: "Tepeji del Río", latMin: 19.85, latMax: 20.00, lngMin: -99.42, lngMax: -99.28 },
  { name: "Atotonilco de Tula", latMin: 20.00, latMax: 20.04, lngMin: -99.27, lngMax: -99.18 },
  { name: "Atitalaquia", latMin: 20.04, latMax: 20.10, lngMin: -99.26, lngMax: -99.18 },
  { name: "Tlaxcoapan", latMin: 20.07, latMax: 20.13, lngMin: -99.27, lngMax: -99.20 },
  { name: "Tlahuelilpan", latMin: 20.10, latMax: 20.16, lngMin: -99.25, lngMax: -99.18 },
  { name: "Tezontepec de Aldama", latMin: 20.16, latMax: 20.30, lngMin: -99.32, lngMax: -99.20 },
  { name: "Tepetitlán", latMin: 20.13, latMax: 20.22, lngMin: -99.42, lngMax: -99.32 },

  // Centro
  { name: "Mixquiahuala de Juárez", latMin: 20.20, latMax: 20.30, lngMin: -99.25, lngMax: -99.13 },
  { name: "Progreso de Obregón", latMin: 20.22, latMax: 20.32, lngMin: -99.23, lngMax: -99.10 },
  { name: "Chilcuautla", latMin: 20.30, latMax: 20.40, lngMin: -99.25, lngMax: -99.12 },
  { name: "Francisco I. Madero", latMin: 20.20, latMax: 20.27, lngMin: -99.10, lngMax: -99.00 },
  { name: "San Salvador", latMin: 20.25, latMax: 20.34, lngMin: -99.05, lngMax: -98.95 },
  { name: "Ajacuba", latMin: 20.05, latMax: 20.18, lngMin: -99.18, lngMax: -99.08 },

  // Norte
  { name: "Ixmiquilpan", latMin: 20.45, latMax: 20.60, lngMin: -99.30, lngMax: -99.10 },
  { name: "Cardonal", latMin: 20.55, latMax: 20.78, lngMin: -99.20, lngMax: -98.95 },
  { name: "Tasquillo", latMin: 20.50, latMax: 20.62, lngMin: -99.42, lngMax: -99.28 },
  { name: "Alfajayucan", latMin: 20.35, latMax: 20.50, lngMin: -99.42, lngMax: -99.28 },
  { name: "Tecozautla", latMin: 20.50, latMax: 20.60, lngMin: -99.65, lngMax: -99.45 },
  { name: "Huichapan", latMin: 20.30, latMax: 20.45, lngMin: -99.75, lngMax: -99.55 },
  { name: "Nopala de Villagrán", latMin: 20.20, latMax: 20.30, lngMin: -99.70, lngMax: -99.55 },

  // Sureste
  { name: "Actopan", latMin: 20.20, latMax: 20.32, lngMin: -98.98, lngMax: -98.85 },
  { name: "El Arenal", latMin: 20.18, latMax: 20.25, lngMin: -98.95, lngMax: -98.85 },
  { name: "Santiago de Anaya", latMin: 20.34, latMax: 20.45, lngMin: -98.98, lngMax: -98.85 },
];

/**
 * Devuelve el nombre del municipio cuyo bbox contiene `(lat, lng)`, o `null`.
 * Si las coordenadas caen en el traslape de dos bboxes, devuelve el primero
 * en el array (orden estable).
 */
export function municipalityFor(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const m of MUNICIPALITIES) {
    if (
      lat >= m.latMin &&
      lat <= m.latMax &&
      lng >= m.lngMin &&
      lng <= m.lngMax
    ) {
      return m.name;
    }
  }
  return null;
}

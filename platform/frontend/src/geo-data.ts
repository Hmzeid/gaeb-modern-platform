// Governorate coordinates (lon/lat of the capital or centre) for the
// Geographic Intelligence plot, plus name aliases so the API's governorate
// names match regardless of transliteration. The plot is schematic by
// design; it is not a boundary map.
export const GOV_COORDS: Record<string, [number, number]> = {
  "cairo": [31.25, 30.05], "al qahirah": [31.25, 30.05], "qahira": [31.25, 30.05],
  "giza": [31.05, 29.95], "al jizah": [31.05, 29.95], "jizah": [31.05, 29.95],
  "alexandria": [29.92, 31.20], "al iskandariyah": [29.92, 31.20], "iskandariya": [29.92, 31.20],
  "dakahlia": [31.38, 31.04], "ad daqahliyah": [31.38, 31.04], "mansoura": [31.38, 31.04],
  "red sea": [33.81, 27.26], "al bahr al ahmar": [33.81, 27.26], "hurghada": [33.81, 27.26],
  "beheira": [30.40, 31.00], "al buhayrah": [30.40, 31.00], "buhaira": [30.40, 31.00], "damanhur": [30.40, 31.00],
  "fayoum": [30.84, 29.31], "al fayyum": [30.84, 29.31], "fayyum": [30.84, 29.31],
  "gharbia": [30.95, 30.85], "al gharbiyah": [30.95, 30.85], "tanta": [30.95, 30.85],
  "ismailia": [32.27, 30.60], "al ismailiyah": [32.27, 30.60],
  "monufia": [31.01, 30.55], "al munufiyah": [31.01, 30.55], "menoufia": [31.01, 30.55], "shibin el kom": [31.01, 30.55],
  "minya": [30.73, 28.11], "al minya": [30.73, 28.11],
  "qalyubia": [31.20, 30.45], "al qalyubiyah": [31.20, 30.45], "kalyubia": [31.20, 30.45], "benha": [31.20, 30.45],
  "new valley": [30.55, 25.45], "al wadi al jadid": [30.55, 25.45], "kharga": [30.55, 25.45],
  "suez": [32.55, 29.97], "as suways": [32.55, 29.97],
  "aswan": [32.90, 24.09],
  "assiut": [31.18, 27.18], "asyut": [31.18, 27.18],
  "beni suef": [31.10, 29.07], "bani suwayf": [31.10, 29.07],
  "port said": [32.30, 31.26], "bur said": [32.30, 31.26],
  "damietta": [31.82, 31.42], "dumyat": [31.82, 31.42],
  "sharqia": [31.50, 30.59], "ash sharqiyah": [31.50, 30.59], "zagazig": [31.50, 30.59],
  "south sinai": [34.33, 27.86], "janub sina": [34.33, 27.86], "sharm el sheikh": [34.33, 27.86],
  "kafr el sheikh": [30.94, 31.11], "kafr ash shaykh": [30.94, 31.11],
  "matruh": [27.24, 31.35], "matrouh": [27.24, 31.35], "marsa matruh": [27.24, 31.35],
  "luxor": [32.64, 25.69], "al uqsur": [32.64, 25.69],
  "qena": [32.72, 26.16], "qina": [32.72, 26.16],
  "north sinai": [33.80, 31.13], "shamal sina": [33.80, 31.13], "arish": [33.80, 31.13], "el arish": [33.80, 31.13],
  "sohag": [31.70, 26.56], "suhaj": [31.70, 26.56],
};

export function govCoords(nameEn: string): [number, number] | null {
  const key = nameEn.toLowerCase().replace(/governorate/g, "").replace(/[^a-z ]/g, "").trim().replace(/\s+/g, " ");
  return GOV_COORDS[key] ?? null;
}

/** Simplified Egypt outline (schematic) + Nile path, lon/lat. */
export const EGYPT_OUTLINE: [number, number][] = [
  [25.0, 31.6], [27.5, 31.4], [29.9, 31.25], [30.4, 31.45], [31.8, 31.42], [32.3, 31.26], [33.2, 31.2], [33.8, 31.15],
  [34.27, 31.28], [34.9, 29.4], [34.6, 28.4], [34.33, 27.86], [34.0, 27.7], [33.81, 27.26], [34.3, 26.3], [35.1, 24.6],
  [35.6, 23.9], [33.0, 22.05], [29.0, 22.0], [25.0, 22.0], [25.0, 31.6],
];
export const NILE_PATH: [number, number][] = [
  [31.0, 22.0], [31.6, 24.0], [31.9, 25.7], [31.7, 26.6], [31.2, 27.2], [30.8, 28.1], [30.9, 29.1],
  [31.15, 30.0], [31.3, 30.6], [30.9, 30.9], [31.5, 31.2],
];

import type { WasteCategory } from './types';

// The same rules as the API (src/common/taxonomy.ts). The form uses them to show a live preview.
// The server works the figures out again and is the source of truth, so a change here never
// changes what is stored.

const DENSITY_KG_M3: Record<WasteCategory, number | null> = {
  ORGANIC: 400,
  PLASTIC: 60,
  PAPER_CARDBOARD: 90,
  GLASS_METAL: 300,
  OTHER_INORGANIC: 600,
  HUMAN_SEWAGE: 1000,
  MIXED_UNKNOWN: 250,
  HAZARDOUS_MEDICAL: null,
};

export type PileShape = 'BOX' | 'HEAP';

export function volumeFromDimensions(l: number, w: number, h: number, shape: PileShape): number {
  return Math.round(l * w * h * (shape === 'BOX' ? 1 : 0.5) * 100) / 100;
}

export function compositionTotal(composition: Record<string, number>): number {
  return Object.values(composition).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

export function previewMass(
  volumeM3: number | null,
  category: WasteCategory,
  composition: Record<string, number>,
  isMixed: boolean,
): { massKg: number; densityKgM3: number } | null {
  if (!volumeM3 || volumeM3 <= 0 || category === 'HAZARDOUS_MEDICAL') return null;
  const total = compositionTotal(composition);
  if (Math.abs(total - 100) <= 0.5) {
    let weighted = 0;
    for (const [key, pct] of Object.entries(composition)) {
      const d = DENSITY_KG_M3[key as WasteCategory];
      if (d == null) return null;
      weighted += (pct / 100) * d;
    }
    return { massKg: Math.round(volumeM3 * weighted), densityKgM3: Math.round(weighted) };
  }
  if (category !== 'MIXED_UNKNOWN' && !isMixed) {
    const d = DENSITY_KG_M3[category]!;
    return { massKg: Math.round(volumeM3 * d), densityKgM3: d };
  }
  return null;
}

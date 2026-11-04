// Single source of truth for colour, in two themes. Tailwind reads it (tailwind.config.ts writes each
// theme as CSS variables), and the map reads it for paint expressions, which cannot use CSS classes.
//
// Text and background pairs were checked against WCAG AA (4.5:1 for text, 3:1 for control edges and
// map marks) in both themes. Hotspot severity follows the reference design in the brief: green, yellow,
// orange and red. Each band is also named in words wherever it is shown, never colour alone.

export type ThemeName = 'light' | 'dark';

export interface Theme {
  canvas: string; panel: string; panel2: string; panel3: string;
  line: string; lineStrong: string;
  fg: string; fgMuted: string; fgSubtle: string;
  accent: string; accentHover: string; accentPressed: string; accentFg: string; accentSoft: string;
  success: string; successSoft: string; warning: string; warningSoft: string; danger: string; dangerSoft: string;
  shadow: string;
  // How sure we are that a site is real. Brightness and size rise with certainty.
  tierLow: string; tierMedium: string; tierHigh: string;
  // Hotspot severity, from least to most
  severity: [string, string, string, string];
  // Map layers
  collectionPoint: string; waterSource: string;
  waterway: string; drain: string; school: string; health: string;
  area: string; mapHalo: string;
}

export const themes: Record<ThemeName, Theme> = {
  light: {
    canvas: '#F3F4F2', panel: '#FFFFFF', panel2: '#F7F8F7', panel3: '#E8EBE9',
    line: '#DCE0DD', lineStrong: '#75807A',
    fg: '#111816', fgMuted: '#46514C', fgSubtle: '#5A6560',
    accent: '#1B7348', accentHover: '#15603B', accentPressed: '#104D30', accentFg: '#FFFFFF', accentSoft: '#DDF0E5',
    success: '#1B6F41', successSoft: '#DDF1E5', warning: '#7C5200', warningSoft: '#FFF0CC', danger: '#B3261E', dangerSoft: '#FCE5E3',
    shadow: '#14211A',
    tierLow: '#8A948C', tierMedium: '#D98E04', tierHigh: '#1B7348',
    severity: ['#3E9B4F', '#E0AE1A', '#E8741A', '#D1322A'],
    collectionPoint: '#1B7348', waterSource: '#0E7C8F',
    waterway: '#2C7FB8', drain: '#B8860B', school: '#4F6BD8', health: '#0F8F7A',
    area: '#1B7348', mapHalo: '#FFFFFF',
  },
  dark: {
    canvas: '#0C0F0E', panel: '#141817', panel2: '#191E1C', panel3: '#232A27',
    line: '#2A312E', lineStrong: '#78837E',
    fg: '#E8EDEA', fgMuted: '#AEB8B3', fgSubtle: '#929D98',
    accent: '#5BD08F', accentHover: '#7DDBA6', accentPressed: '#45B777', accentFg: '#08130D', accentSoft: '#15291E',
    success: '#62C08F', successSoft: '#15291F', warning: '#E3B04B', warningSoft: '#2C2410', danger: '#F08478', dangerSoft: '#341A1B',
    shadow: '#000000',
    tierLow: '#A3AD74', tierMedium: '#E0A63E', tierHigh: '#5BD08F',
    severity: ['#5FCB6B', '#F2CB45', '#F59A3A', '#EF5B4A'],
    collectionPoint: '#62C08F', waterSource: '#4FC4D6',
    waterway: '#5AB0E8', drain: '#E3B04B', school: '#8EA2FF', health: '#4FD0B8',
    area: '#5BD08F', mapHalo: '#0C0F0E',
  },
};

/** "#RRGGBB" as "R G B", the form Tailwind needs to apply opacity to a CSS variable. */
export function triplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

// ── Older names, kept so existing imports keep working. They follow the dark theme. ──
export const palette = themes.dark;

export const tierColors = { low: themes.dark.tierLow, medium: themes.dark.tierMedium, high: themes.dark.tierHigh } as const;

export const dataColors = {
  collectionPoint: themes.dark.collectionPoint,
  facility: {
    COLLECTION_POINT: '#62C08F',
    TRANSFER_STATION: '#E3B04B',
    RECYCLING: '#6CA9E6',
    LANDFILL: '#8E9AA8',
    INCINERATION: '#F08478',
  },
  waterSource: themes.dark.waterSource,
  waterAnomaly: { LEAK: '#4FC4D6', ILLEGAL_EXTRACTION: '#F0903C', CONTAMINATION: '#D96FA0' },
  floodRisk: { LOW: '#62C08F', MEDIUM: '#E3B04B', HIGH: '#F08478' },
  flowStatus: { PENDING: '#8E9AA8', COLLECTED: '#62C08F', IN_TRANSIT: '#E3B04B', DELIVERED: '#6CA9E6', PROCESSED: '#4FC4B0' },
  heat: ['#A3AD74', '#E0A63E', '#F0903C', '#F08478'],
  neutralLine: '#68758A',
  reference: { waterway: themes.dark.waterway, drain: themes.dark.drain, school: themes.dark.school, health: themes.dark.health },
  areaCheck: themes.dark.area,
} as const;

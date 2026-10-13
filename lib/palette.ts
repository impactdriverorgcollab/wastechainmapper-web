// Single source of truth for colour. Tailwind reads this file (tailwind.config.ts), and the
// map reads it for paint expressions, which cannot use CSS classes.
//
// Every text and background pair below was checked against WCAG AA (4.5:1 for text,
// 3:1 for control edges and map marks) on the dark canvas.

export const palette = {
  // Surfaces, from the page background up to raised panels
  canvas: '#0E1218',
  panel: '#151B24',
  panel2: '#1B222D',
  panel3: '#242C39',

  // Dividers are quiet. Control edges (inputs, checkboxes) use the stronger line.
  line: '#2A3342',
  lineStrong: '#68758A',

  // Text
  fg: '#E7EBF0',
  fgMuted: '#AAB4C0',
  fgSubtle: '#8E9AA8',

  // The one accent: primary action, links, current page, focus ring
  accent: '#6CA9E6',
  accentHover: '#8DBBEE',
  accentPressed: '#5592CC',
  accentFg: '#0E1218',
  accentSoft: '#14283B',

  // Semantic colours, only for their meaning
  success: '#62C08F',
  successSoft: '#15291F',
  warning: '#E3B04B',
  warningSoft: '#2C2410',
  danger: '#F08478',
  dangerSoft: '#341A1B',
} as const;

// Confidence tiers encode how sure we are that a dump site is real. Brightness rises with
// certainty, so unconfirmed sites recede and field-verified sites stand out. Red is kept for
// errors and danger, so a verified site is never shown in the colour of an error.
export const tierColors = {
  low: '#A3AD74',
  medium: '#E0A63E',
  high: '#F1EDE2',
} as const;

// Categorical colours for map layers and status labels. Each is paired with a text label
// wherever it is shown, never used as the only signal.
export const dataColors = {
  collectionPoint: '#62C08F',
  facility: {
    COLLECTION_POINT: '#62C08F',
    TRANSFER_STATION: '#E3B04B',
    RECYCLING: '#6CA9E6',
    LANDFILL: '#8E9AA8',
    INCINERATION: '#F08478',
  },
  waterSource: '#4FC4D6',
  waterAnomaly: {
    LEAK: '#4FC4D6',
    ILLEGAL_EXTRACTION: '#F0903C',
    CONTAMINATION: '#D96FA0',
  },
  floodRisk: {
    LOW: '#62C08F',
    MEDIUM: '#E3B04B',
    HIGH: '#F08478',
  },
  flowStatus: {
    PENDING: '#8E9AA8',
    COLLECTED: '#62C08F',
    IN_TRANSIT: '#E3B04B',
    DELIVERED: '#6CA9E6',
    PROCESSED: '#4FC4B0',
  },
  heat: ['#A3AD74', '#E0A63E', '#F0903C', '#F08478'],
  neutralLine: '#68758A',
} as const;

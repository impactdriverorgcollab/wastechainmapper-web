import type { ConfidenceTier, WasteType } from './types';

// Confidence tier color system.
// These hex values are the single functional accent in the design system —
// used only for data encoding, not for decoration or branding.
export const TIER_COLORS: Record<ConfidenceTier, { hex: string; label: string; description: string }> = {
  LOW: {
    hex: '#8B9467',
    label: 'Unconfirmed',
    description: 'Single unverified source mention',
  },
  MEDIUM: {
    hex: '#C9913B',
    label: 'Corroborated',
    description: 'Multiple sources or cross-referenced reports',
  },
  HIGH: {
    hex: '#B94040',
    label: 'Field-verified',
    description: 'Confirmed by field investigation',
  },
};

export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  MUNICIPAL: 'Municipal / Household',
  INDUSTRIAL: 'Industrial',
  MEDICAL: 'Medical / Clinical',
  ELECTRONIC: 'Electronic (E-waste)',
  CONSTRUCTION: 'Construction / Rubble',
  MIXED: 'Mixed',
  UNKNOWN: 'Unknown',
};

export const SOURCE_TYPE_LABELS = {
  NEWS_SCRAPE: 'News report',
  TWITTER_SCRAPE: 'Social media',
  WHATSAPP_CITIZEN: 'Citizen report',
  MANUAL_ENTRY: 'Manual entry',
} as const;

// Rivers State centre coordinates for map initial view
export const RIVERS_STATE_CENTER: [number, number] = [7.0134, 4.8396]; // [lng, lat]
export const RIVERS_STATE_ZOOM = 9;

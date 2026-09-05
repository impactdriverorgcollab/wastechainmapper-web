import type { ConfidenceTier, WasteType, FacilityType, WaterSourceType, WaterAnomalyType, FloodRiskLevel } from './types';

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
  ORGANIC: 'Organic',
  PLASTIC: 'Plastic',
  INDUSTRIAL: 'Industrial',
  MEDICAL: 'Medical / Clinical',
  ELECTRONIC: 'Electronic (E-waste)',
  CONSTRUCTION: 'Construction / Rubble',
  MIXED: 'Mixed',
  UNKNOWN: 'Unknown',
};

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  COLLECTION_POINT: 'Collection Point',
  TRANSFER_STATION: 'Transfer Station',
  RECYCLING: 'Recycling Facility',
  LANDFILL: 'Landfill',
  INCINERATION: 'Incineration Plant',
};

export const FACILITY_TYPE_COLORS: Record<FacilityType, string> = {
  COLLECTION_POINT: '#22c55e',
  TRANSFER_STATION: '#f59e0b',
  RECYCLING: '#3b82f6',
  LANDFILL: '#6b7280',
  INCINERATION: '#ef4444',
};

export const WATER_SOURCE_LABELS: Record<WaterSourceType, string> = {
  EXTRACTION: 'Water Extraction',
  DISTRIBUTION: 'Distribution Network',
  CONSUMPTION: 'Consumption Point',
  WASTEWATER: 'Wastewater Outfall',
};

export const WATER_ANOMALY_LABELS: Record<WaterAnomalyType, string> = {
  LEAK: 'Pipeline Leak',
  ILLEGAL_EXTRACTION: 'Illegal Extraction',
  CONTAMINATION: 'Contamination Hotspot',
};

export const WATER_ANOMALY_COLORS: Record<WaterAnomalyType, string> = {
  LEAK: '#60a5fa',
  ILLEGAL_EXTRACTION: '#f97316',
  CONTAMINATION: '#a855f7',
};

export const FLOOD_RISK_COLORS: Record<FloodRiskLevel, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
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

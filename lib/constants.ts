import type {
  ConfidenceTier, WasteType, FacilityType, WaterSourceType, WaterAnomalyType,
  FloodRiskLevel, FlowStatus, SiteStatus, VerificationStatus, GeocodeStatus, ReportSourceType,
} from './types';
import { tierColors, dataColors } from './palette';

// Confidence tiers. Colour is paired with a label and description wherever it is shown.
export const TIER_INFO: Record<ConfidenceTier, { hex: string; label: string; description: string; textClass: string; dotClass: string }> = {
  LOW: {
    hex: tierColors.low,
    label: 'Unconfirmed',
    description: 'One source, not yet checked',
    textClass: 'text-tier-low',
    dotClass: 'bg-tier-low',
  },
  MEDIUM: {
    hex: tierColors.medium,
    label: 'Corroborated',
    description: 'A reviewer checked the source and location',
    textClass: 'text-tier-medium',
    dotClass: 'bg-tier-medium',
  },
  HIGH: {
    hex: tierColors.high,
    label: 'Field-verified',
    description: 'Confirmed by field investigation',
    textClass: 'text-tier-high',
    dotClass: 'bg-tier-high',
  },
};

// Kept for existing imports that expect the older name.
export const TIER_COLORS = TIER_INFO;

export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  MUNICIPAL: 'Municipal or household',
  ORGANIC: 'Organic',
  PLASTIC: 'Plastic',
  INDUSTRIAL: 'Industrial',
  MEDICAL: 'Medical or clinical',
  ELECTRONIC: 'Electronic',
  CONSTRUCTION: 'Construction or rubble',
  MIXED: 'Mixed',
  UNKNOWN: 'Unknown',
};

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  UNVERIFIED: 'Unverified',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  REMEDIATED: 'Remediated',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: 'Unverified',
  CORROBORATED: 'Corroborated',
  FIELD_VERIFIED: 'Field-verified',
  REJECTED: 'Rejected',
};

export const GEOCODE_STATUS_LABELS: Record<GeocodeStatus, string> = {
  PENDING: 'Not placed yet',
  RESOLVED_GAZETTEER: 'Matched in the community list',
  RESOLVED_NOMINATIM: 'Matched on OpenStreetMap',
  UNRESOLVED: 'Could not be placed',
};

export const SOURCE_TYPE_LABELS: Record<ReportSourceType, string> = {
  NEWS_SCRAPE: 'News report',
  TWITTER_SCRAPE: 'Social media',
  WHATSAPP_CITIZEN: 'Citizen report',
  MANUAL_ENTRY: 'Manual entry',
};

export const FLOW_STATUS_LABELS: Record<FlowStatus, string> = {
  PENDING: 'Pending',
  COLLECTED: 'Collected',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  PROCESSED: 'Processed',
};
export const FLOW_STATUS_ORDER: FlowStatus[] = ['PENDING', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED', 'PROCESSED'];
export const FLOW_STATUS_COLORS = dataColors.flowStatus;

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  COLLECTION_POINT: 'Collection point',
  TRANSFER_STATION: 'Transfer station',
  RECYCLING: 'Recycling facility',
  LANDFILL: 'Landfill',
  INCINERATION: 'Incineration plant',
};
export const FACILITY_TYPE_COLORS = dataColors.facility;

export const WATER_SOURCE_LABELS: Record<WaterSourceType, string> = {
  EXTRACTION: 'Water extraction',
  DISTRIBUTION: 'Distribution network',
  CONSUMPTION: 'Consumption point',
  WASTEWATER: 'Wastewater outfall',
};

export const WATER_ANOMALY_LABELS: Record<WaterAnomalyType, string> = {
  LEAK: 'Pipeline leak',
  ILLEGAL_EXTRACTION: 'Illegal extraction',
  CONTAMINATION: 'Contamination hotspot',
};
export const WATER_ANOMALY_COLORS = dataColors.waterAnomaly;

export const FLOOD_RISK_LABELS: Record<FloodRiskLevel, string> = {
  LOW: 'Low risk',
  MEDIUM: 'Medium risk',
  HIGH: 'High risk',
};
export const FLOOD_RISK_COLORS = dataColors.floodRisk;

// The 23 local government areas of Rivers State. One list, used by every filter.
export const RIVERS_STATE_LGAS = [
  'Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru',
  'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana', 'Ikwerre', 'Khana',
  'Obio-Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro',
  'Oyigbo', 'Port Harcourt', 'Tai',
] as const;

// Rivers State centre coordinates for map initial view
export const RIVERS_STATE_CENTER: [number, number] = [7.0134, 4.8396]; // [lng, lat]
export const RIVERS_STATE_ZOOM = 9;

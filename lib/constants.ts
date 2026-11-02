import type {
  ConfidenceTier, WasteType, FacilityType, WaterSourceType, WaterAnomalyType,
  FloodRiskLevel, FlowStatus, SiteStatus, VerificationStatus, GeocodeStatus, ReportSourceType,
  WasteCategory, SiteSetting, SiteClass, EstimateBasis, WasteLevelTrend, JourneyStage, UserRole, Confidence,
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
  SUBMITTED_COORDINATES: 'Position sent by the reporter',
};

export const SOURCE_TYPE_LABELS: Record<ReportSourceType, string> = {
  NEWS_SCRAPE: 'News report',
  TWITTER_SCRAPE: 'Social media',
  WHATSAPP_CITIZEN: 'Citizen report',
  MANUAL_ENTRY: 'Manual entry',
  WEB_FORM: 'Community report (web form)',
  EMAIL: 'Community report (email)',
  SOCIAL_SUBMISSION: 'Community report (social media)',
  AMBASSADOR: 'Field ambassador',
  PARTNER_RECORD: 'Partner record',
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

// ── Waste taxonomy (brief section 5) ─────────────────────────────────────────

export const WASTE_CATEGORY_INFO: Record<WasteCategory, { label: string; examples: string }> = {
  ORGANIC: { label: 'Organic or biodegradable', examples: 'Food waste, vegetation, agricultural residues' },
  PLASTIC: { label: 'Plastics', examples: 'PET bottles, HDPE containers, films, bags, mixed plastics' },
  PAPER_CARDBOARD: { label: 'Paper and cardboard', examples: 'Packaging, paper products' },
  GLASS_METAL: { label: 'Glass and metals', examples: 'Bottles, cans, scrap metal' },
  OTHER_INORGANIC: { label: 'Other inorganic waste', examples: 'Textiles, construction debris, mixed materials' },
  HUMAN_SEWAGE: { label: 'Human waste and sewage', examples: 'Sanitary waste, sewage discharge, sludge' },
  MIXED_UNKNOWN: { label: 'Mixed or unknown', examples: 'Mixed refuse or material that cannot be classified reliably' },
  HAZARDOUS_MEDICAL: { label: 'Hazardous or medical', examples: 'Clinical waste, sharps, chemicals, batteries. Do not touch.' },
};
export const WASTE_CATEGORY_ORDER = Object.keys(WASTE_CATEGORY_INFO) as WasteCategory[];

export const SETTING_LABELS: Record<SiteSetting, string> = {
  LAND: 'On land',
  DRAIN: 'In a drain',
  WATERWAY: 'In a river, creek or other waterway',
  COASTAL: 'On the coast or shore',
  DISPOSAL_FACILITY: 'At a disposal facility',
};

export const SITE_CLASS_LABELS: Record<SiteClass, string> = {
  OFFICIAL: 'Official, designated site',
  OBSERVED: 'Observed dumping',
  INFORMAL: 'Informal site',
  UNAUTHORISED: 'Unauthorised dumping',
};

export const LEVEL_TREND_LABELS: Record<WasteLevelTrend, string> = {
  INCREASING: 'Growing',
  STABLE: 'About the same',
  DECREASING: 'Shrinking',
  CLEARED: 'Cleared',
  UNKNOWN: 'Not known',
};

export const RISK_LABELS: Record<'normal' | 'elevated' | 'high', string> = {
  normal: 'No flag',
  elevated: 'Elevated',
  high: 'High',
};

/** What kind of number it is. The brief insists these are never mixed up. */
export const BASIS_INFO: Record<EstimateBasis, { label: string; description: string; tone: 'success' | 'accent' | 'warning' | 'neutral' }> = {
  MEASURED: { label: 'Measured', description: 'Measured directly on site', tone: 'success' },
  OFFICIAL: { label: 'Official figure', description: 'Reported by an authority or operator', tone: 'accent' },
  FIELD_ESTIMATE: { label: 'Field estimate', description: 'Estimated by a person, by eye or from a photo', tone: 'warning' },
  AI_PREDICTION: { label: 'Software suggestion', description: 'Suggested by software. A person has not confirmed it', tone: 'neutral' },
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = { LOW: 'Low confidence', MEDIUM: 'Medium confidence', HIGH: 'High confidence' };

export const JOURNEY_STAGE_LABELS: Record<JourneyStage, string> = {
  GENERATION: 'Generated',
  COLLECTION: 'Collected',
  TRANSPORT: 'In transport',
  TRANSFER_SORTING: 'Transfer or sorting',
  TREATMENT_RECYCLING: 'Treatment or recycling',
  FINAL_DISPOSAL: 'Final disposal',
};
export const JOURNEY_STAGE_ORDER = Object.keys(JOURNEY_STAGE_LABELS) as JourneyStage[];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  FIELD_VERIFIER: 'Verifier',
  AMBASSADOR: 'LGA ambassador',
  PARTNER: 'Institutional partner',
  PUBLIC_VIEWER: 'Public account',
};

export const REFERENCE_KIND_LABELS = {
  WATERWAY: 'River, creek or canal',
  DRAIN: 'Drain or culvert',
  SCHOOL: 'School',
  HEALTH_FACILITY: 'Health facility',
} as const;

/** The three kinds of statement the platform keeps apart (brief section 16). */
export const KNOWN_REPORTED_ESTIMATED = [
  { title: 'Known', body: 'A reviewer checked the source and the place, or someone visited. The site carries a corroborated or field-verified label.' },
  { title: 'Reported', body: 'Someone said waste is there: a news story, a community report, a post. It is marked unconfirmed until a reviewer checks it. A mapped site does not prove waste is still there.' },
  { title: 'Estimated', body: 'Sizes, weights and mixes are estimates. Each says who made it, how, and how sure they are. A photo does not give an exact volume.' },
] as const;

export const PROXIMITY_NOTICE =
  'These figures show where reported waste sits in relation to other features. They show association only. They do not show that waste causes flooding, blocked drains or illness.';

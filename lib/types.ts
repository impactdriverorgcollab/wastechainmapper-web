export type ConfidenceTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type WasteType =
  | 'MUNICIPAL' | 'ORGANIC' | 'PLASTIC'
  | 'INDUSTRIAL' | 'MEDICAL' | 'ELECTRONIC'
  | 'CONSTRUCTION' | 'MIXED' | 'UNKNOWN';
export type SiteStatus = 'UNVERIFIED' | 'ACTIVE' | 'INACTIVE' | 'REMEDIATED';
export type VerificationStatus = 'UNVERIFIED' | 'CORROBORATED' | 'FIELD_VERIFIED' | 'REJECTED';
export type ReportSourceType = 'NEWS_SCRAPE' | 'TWITTER_SCRAPE' | 'WHATSAPP_CITIZEN' | 'MANUAL_ENTRY';
export type GeocodeStatus = 'PENDING' | 'RESOLVED_GAZETTEER' | 'RESOLVED_NOMINATIM' | 'UNRESOLVED';
export type FlowStatus = 'PENDING' | 'COLLECTED' | 'IN_TRANSIT' | 'DELIVERED' | 'PROCESSED';
export type FacilityType = 'COLLECTION_POINT' | 'TRANSFER_STATION' | 'RECYCLING' | 'LANDFILL' | 'INCINERATION';
export type WaterSourceType = 'EXTRACTION' | 'DISTRIBUTION' | 'CONSUMPTION' | 'WASTEWATER';
export type WaterAnomalyType = 'LEAK' | 'ILLEGAL_EXTRACTION' | 'CONTAMINATION';
export type FloodRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DumpSite {
  id: string;
  latitude: number | null;
  longitude: number | null;
  status: SiteStatus;
  wasteType: WasteType;
  confidenceTier: ConfidenceTier;
  communityName: string | null;
  ward: string | null;
  lga: string | null;
  description: string | null;
  firstSeenAt: string;
  lastConfirmedAt: string | null;
  sourceReportIds: string[];
}

export interface Report {
  id: string;
  rawText: string;
  sourceUrl: string | null;
  sourceType: ReportSourceType;
  extractedLocationText: string | null;
  extractedWasteType: WasteType | null;
  extractedSeverity: string | null;
  extractedUrgency: string | null;
  geocodeStatus: GeocodeStatus;
  geocodedLatitude: number | null;
  geocodedLongitude: number | null;
  confidenceScore: number | null;
  verificationStatus: VerificationStatus;
  linkedSiteId: string | null;
  scrapedAt: string;
}

export interface CollectionPoint {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  operator: string | null;
  ward: string | null;
  lga: string | null;
  isActive: boolean;
  coverageRadiusM: number | null;
}

export interface Facility {
  id: string;
  name: string;
  facilityType: FacilityType;
  latitude: number | null;
  longitude: number | null;
  operator: string | null;
  capacityTpd: number | null;
  ward: string | null;
  lga: string | null;
  isActive: boolean;
  description: string | null;
}

export interface WasteFlow {
  id: string;
  wasteType: WasteType;
  status: FlowStatus;
  estimatedTonnage: number | null;
  originLat: number | null;
  originLng: number | null;
  lga: string | null;
  ward: string | null;
  createdAt: string;
  collectedAt: string | null;
  inTransitAt: string | null;
  deliveredAt: string | null;
  processedAt: string | null;
  destinationFacility?: { latitude: number | null; longitude: number | null; name: string; facilityType: FacilityType } | null;
}

export type ImportKind = 'dump-sites' | 'facilities' | 'waste-flows' | 'water-readings';

export interface ImportResult {
  kind: ImportKind;
  committed: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface WaterSource {
  id: string;
  sourceRef?: string | null;
  name: string;
  sourceType: WaterSourceType;
  latitude: number | null;
  longitude: number | null;
  operator: string | null;
  ward: string | null;
  lga: string | null;
  isActive: boolean;
  /** Set for points imported from public datasets (WPDx). Null for hand-entered sources. */
  dataSource?: string | null;
  surveyedAt?: string | null;
  condition?: string | null;
  technology?: string | null;
  populationServed?: number | null;
}

export interface WaterAnomaly {
  id: string;
  anomalyType: WaterAnomalyType;
  latitude: number | null;
  longitude: number | null;
  severity: string | null;
  description: string | null;
  detectedAt: string;
  resolvedAt: string | null;
}

export interface FloodZone {
  id: string;
  name: string | null;
  riskLevel: FloodRiskLevel;
  ward: string | null;
  lga: string | null;
  description: string | null;
  source: string | null;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  wasteType: WasteType;
}

export interface PlatformSummary {
  totalSites: number;
  totalFlows: number;
  processedFlows: number;
  processingRate: number;
  totalTonnageTracked: number;
  openWaterAnomalies: number;
  activeFacilities: number;
  activeWaterSources: number;
  activeVehicles: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'ADMIN' | 'FIELD_VERIFIER' | 'PUBLIC_VIEWER';
}

// ── Shapes returned by the aggregate endpoints ───────────────────────────────

export interface FlowStatRow {
  status: FlowStatus;
  wasteType: WasteType;
  _count: { id: number };
  _sum: { estimatedTonnage: number | null };
}

export interface BenchmarkRow {
  lga: string;
  total: number;
  processed: number;
  tonnage: number;
  rate: number; // 0 to 1
}

export interface RecyclableRow {
  wasteType: WasteType;
  _count: { id: number };
  _sum: { estimatedTonnage: number | null };
}

export interface WaterReading {
  id: string;
  sourceId: string;
  volumeM3: number | null;
  qualityScore: number | null;
  ph: number | null;
  turbidityNtu: number | null;
  isSensor: boolean;
  recordedAt: string;
  source?: { name: string; sourceType: WaterSourceType };
}

export interface WaterDashboard {
  sourceCount: number;
  openAnomalies: number;
  recentReadings: WaterReading[];
}

export type ApiKeyTier = 'FREE' | 'PROFESSIONAL' | 'ENTERPRISE' | 'INTERNAL';

export interface ApiKeyTierInfo {
  tier: ApiKeyTier;
  dailyLimit: number;
  description: string;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  tier: ApiKeyTier;
  callsToday: number;
  callsTotal: number;
  dailyLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface IssuedApiKey {
  key: string;
  tier: ApiKeyTier;
  dailyLimit: number;
  warning: string;
}

export interface GazetteerEntry {
  id: string;
  communityName: string;
  ward: string;
  lga: string;
  centroidLat: number | null;
  centroidLng: number | null;
  aliases: string[];
}

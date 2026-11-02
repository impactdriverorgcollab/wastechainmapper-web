export type ConfidenceTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type WasteType =
  | 'MUNICIPAL' | 'ORGANIC' | 'PLASTIC'
  | 'INDUSTRIAL' | 'MEDICAL' | 'ELECTRONIC'
  | 'CONSTRUCTION' | 'MIXED' | 'UNKNOWN';
export type SiteStatus = 'UNVERIFIED' | 'ACTIVE' | 'INACTIVE' | 'REMEDIATED';
export type VerificationStatus = 'UNVERIFIED' | 'CORROBORATED' | 'FIELD_VERIFIED' | 'REJECTED';
export type ReportSourceType =
  | 'NEWS_SCRAPE' | 'TWITTER_SCRAPE' | 'WHATSAPP_CITIZEN' | 'MANUAL_ENTRY'
  | 'WEB_FORM' | 'EMAIL' | 'SOCIAL_SUBMISSION' | 'AMBASSADOR' | 'PARTNER_RECORD';
export type GeocodeStatus = 'PENDING' | 'RESOLVED_GAZETTEER' | 'RESOLVED_NOMINATIM' | 'UNRESOLVED' | 'SUBMITTED_COORDINATES';
export type FlowStatus = 'PENDING' | 'COLLECTED' | 'IN_TRANSIT' | 'DELIVERED' | 'PROCESSED';
export type FacilityType = 'COLLECTION_POINT' | 'TRANSFER_STATION' | 'RECYCLING' | 'LANDFILL' | 'INCINERATION';
export type WaterSourceType = 'EXTRACTION' | 'DISTRIBUTION' | 'CONSUMPTION' | 'WASTEWATER';
export type WaterAnomalyType = 'LEAK' | 'ILLEGAL_EXTRACTION' | 'CONTAMINATION';
export type FloodRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type UserRole = 'ADMIN' | 'FIELD_VERIFIER' | 'PUBLIC_VIEWER' | 'AMBASSADOR' | 'PARTNER' | 'REPORTER';

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
  // Added by the versioned API. Older records may not have them.
  category?: WasteCategory;
  setting?: SiteSetting;
  siteClass?: SiteClass;
  risk?: 'normal' | 'elevated' | 'high';
  isHazardous?: boolean;
  lastObservedAt?: string | null;
  observationCount?: number;
  photoCount?: number;
  latestVolumeM3?: number | null;
  latestVolumeBasis?: EstimateBasis | null;
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
  // Community and field submissions
  observedAt?: string | null;
  setting?: SiteSetting | null;
  extentNote?: string | null;
  conditionsNote?: string | null;
  gpsAccuracyM?: number | null;
  locationOrigin?: string | null;
  contactName?: string | null;
  contactDetail?: string | null;
  consentToUse?: boolean;
  possibleDuplicateOf?: string | null;
  duplicateReason?: string | null;
  duplicateResolved?: boolean;
  observation?: ObservationDetail | null;
  evidence?: EvidenceItem[];
  pins?: ReportPin[];
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
  isOfficial?: boolean;
  verificationStatus?: VerificationStatus;
  schedule?: string | null;
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

export interface ReportPin {
  id: string;
  name: string | null;
  lga: string | null;
  confidenceTier: ConfidenceTier;
  main: boolean;
  removable: boolean;
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone?: string | null;
  emailConfirmed?: boolean;
  displayName: string | null;
  role: UserRole;
  ambassadorCode?: string | null;
  assignedLgas?: string[];
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

// ── Waste taxonomy and estimates (brief sections 5 and 6) ────────────────────

export type WasteCategory =
  | 'ORGANIC' | 'PLASTIC' | 'PAPER_CARDBOARD' | 'GLASS_METAL' | 'OTHER_INORGANIC'
  | 'HUMAN_SEWAGE' | 'MIXED_UNKNOWN' | 'HAZARDOUS_MEDICAL';
export type SiteSetting = 'LAND' | 'DRAIN' | 'WATERWAY' | 'COASTAL' | 'DISPOSAL_FACILITY';
export type SiteClass = 'OFFICIAL' | 'OBSERVED' | 'INFORMAL' | 'UNAUTHORISED';
export type EstimateBasis = 'MEASURED' | 'OFFICIAL' | 'FIELD_ESTIMATE' | 'AI_PREDICTION';
export type CompositionStatus = 'FULL' | 'PARTIAL' | 'UNKNOWN';
export type WasteLevelTrend = 'INCREASING' | 'STABLE' | 'DECREASING' | 'CLEARED' | 'UNKNOWN';
export type JourneyStage = 'GENERATION' | 'COLLECTION' | 'TRANSPORT' | 'TRANSFER_SORTING' | 'TREATMENT_RECYCLING' | 'FINAL_DISPOSAL';
export type Confidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Provenance { basis: EstimateBasis; method: string; confidence: Confidence; at: string }
export type ProvenanceMap = Partial<Record<'category' | 'composition' | 'volume' | 'moisture' | 'mass', Provenance>>;

export interface ObservationDetail {
  id: string;
  reportId?: string | null;
  observedAt: string;
  setting: SiteSetting;
  primaryCategory: WasteCategory;
  composition: Record<string, number> | null;
  compositionStatus: CompositionStatus;
  isMixed: boolean | null;
  isHazardous: boolean;
  lengthM?: number | null;
  widthM?: number | null;
  heightM?: number | null;
  volumeM3: number | null;
  moisturePct: number | null;
  massKg: number | null;
  densityKgM3?: number | null;
  provenance: ProvenanceMap;
  siteExists: boolean | null;
  siteActive: boolean | null;
  levelTrend: WasteLevelTrend;
  collectionStatus: string | null;
  blockedDrain: boolean;
  overflowingPoint: boolean;
  entersWaterway: boolean;
  notes?: string | null;
  verificationStatus?: VerificationStatus;
  verification?: VerificationStatus;
  sourceType?: ReportSourceType;
}

export interface EvidenceItem {
  id: string;
  reportId?: string;
  mimeType?: string;
  publicApproved?: boolean;
  containsPeople?: boolean;
  caption?: string | null;
  capturedAt?: string | null;
  uploadedAt?: string;
  url?: string;
}

export interface Paged<T> { data: T[]; meta: { page: number; limit: number; total: number; view?: string } }

export interface WasteSite {
  id: string;
  latitude: number;
  longitude: number;
  status: SiteStatus;
  category: WasteCategory;
  wasteType: WasteType;
  siteClass: SiteClass;
  setting: SiteSetting;
  isHazardous: boolean;
  risk: 'normal' | 'elevated' | 'high';
  confidenceTier: ConfidenceTier;
  verification: VerificationStatus;
  communityName: string | null;
  ward: string | null;
  lga: string | null;
  description: string | null;
  firstSeenAt: string;
  lastConfirmedAt: string | null;
  lastObservedAt: string | null;
  latestObservation: { observedAt: string; volumeM3: number | null; massKg: number | null; levelTrend: WasteLevelTrend; provenance: ProvenanceMap } | null;
  observationCount: number;
  photoCount: number;
  distanceM?: number;
}

export interface SiteDetail extends WasteSite {
  history: {
    observations: ObservationDetail[];
    verifications: { id: string; fromStatus: VerificationStatus; toStatus: VerificationStatus; notes?: string | null; createdAt: string; verifier: { displayName: string | null } }[];
    collection: { id: string; status: FlowStatus; wasteType: WasteType; estimatedTonnage: number | null; collectedAt: string | null; deliveredAt: string | null; processedAt: string | null; createdAt: string }[];
  };
  sources: { id: string; sourceType: ReportSourceType; sourceUrl: string | null; excerpt: string | null; publishedAt: string | null; recordedAt: string; verification: VerificationStatus }[];
  evidence: EvidenceItem[];
  journeyIds: string[];
}

export interface SiteContext {
  siteId: string;
  nearestFeatures: { kind: 'WATERWAY' | 'DRAIN' | 'SCHOOL' | 'HEALTH_FACILITY'; name: string | null; distanceM: number }[];
  floodZones: { name: string | null; riskLevel: FloodRiskLevel; inside: boolean; distanceM: number }[];
  collectionPoints: { id: string; name: string; operator: string | null; official: boolean; schedule: string | null; distanceM: number }[];
  notice: string;
}

export interface Journey {
  id: string;
  label: string;
  category: WasteCategory;
  siteId: string | null;
  events: { id: string; stage: JourneyStage; occurredAt: string; placeName: string | null; quantityKg: number | null; quantityBasis: EstimateBasis | null; operator: string | null; evidenceNote: string | null }[];
  lastKnown: { stage: JourneyStage; at: string; place: string | null } | null;
  tracking: string;
}

export interface Hotspot {
  rank: number;
  centre: { latitude: number; longitude: number };
  radiusM: number;
  lga: string | null;
  communities: string[];
  siteCount: number;
  verifiedSiteCount: number;
  observationCount: number;
  observationDays: number;
  recurring: boolean;
  hazardous: boolean;
  waterContact: boolean;
  totalEstimatedVolumeM3: number;
  lastObservedAt: string;
  score: number;
  siteIds: string[];
}

export interface CoverageRow {
  lga: string;
  status: 'no_data' | 'thin' | 'covered';
  sites: number;
  checkedSites: number;
  fieldVerifiedSites: number;
  observations: number;
  collectionPoints: number;
  officialCollectionPoints: number;
  facilities: number;
  awaitingReview: number;
  lastRecordAt: string | null;
}

export interface ProximitySummary {
  totalSites: number;
  byKind: Record<string, { featuresLoaded: number; within250: number; within500: number; within1000: number }>;
  floodZones: { zonesLoaded: number; sitesInside: { risk: string; sites: number }[] };
  notice: string;
}

export interface AreaCheck {
  centre: { latitude: number; longitude: number };
  radiusM: number;
  sites: WasteSite[];
  nearest: { kind: string; name: string | null; distanceM: number }[];
  floodZones: { name: string | null; riskLevel: FloodRiskLevel; inside: boolean; distanceM: number }[];
  collectionPoints: { id: string; name: string; official: boolean; distanceM: number }[];
  notice: string;
}

export interface SummaryV1 {
  generatedAt: string;
  sites: { total: number; reported: number; corroborated: number; fieldVerified: number };
  observations: { approved: number; lastObservedAt: string | null };
  collectionPoints: number;
  facilities: number;
  byCategory: { category: WasteCategory; sites: number }[];
  bySetting: { setting: SiteSetting; sites: number }[];
  byLga: { lga: string; sites: number }[];
  estimatedVolume: { totalM3: number | null; sitesWithEstimate: number; note: string };
  lastUpdated: string | null;
  notice: string;
}

export interface AreaMention {
  lga: string;
  stories: number;
  latestAt: string;
  recent: { title: string; url: string; at: string }[];
}

export interface DataQualityItem { key: string; label: string; count: number; href: string }

export interface DataSourceRow {
  id: string;
  name: string;
  kind: string;
  url: string | null;
  termsNote: string | null;
  accessMethod: string | null;
  isActive: boolean;
  notes: string | null;
  reportCount: number;
  lastReportAt: string | null;
}

export interface UserRow {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: UserRole;
  isActive: boolean;
  ambassadorCode: string | null;
  organisation: string | null;
  assignedLgas: string[];
  createdAt: string;
}

export interface AuditRow {
  id: string;
  at: string;
  action: string;
  path: string | null;
  statusCode: number | null;
  entityId: string | null;
  ip: string | null;
  actorRole: string | null;
  actor: { email: string; displayName: string | null } | null;
}

export interface SubmitResult {
  id: string;
  observationId: string | null;
  uploadToken: string;
  status: string;
  placed: boolean;
  possibleDuplicate?: boolean;
  repeat?: boolean;
  /** True when the report is tied to a signed-in account, so it can count towards that person's record. */
  credited?: boolean;
}

// ── Contributors ──────────────────────────────────────────────────────────────

export type ContributorKind = 'AMBASSADOR' | 'REPORTER';
export type ProfileStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'WITHDRAWN';

export interface LeaderboardRow {
  code: string;
  name: string;
  kind: ContributorKind;
  rank: number;
  points: number;
  deskChecked: number;
  fieldVerified: number;
  lastActive: string | null;
}

export interface LeaderboardResponse {
  data: LeaderboardRow[];
  meta: { period: 'all' | 'recent'; recentDays: number; people: number; points: { deskChecked: number; fieldVerified: number } };
}

export interface PublicContributor {
  code: string;
  name: string;
  kind: ContributorKind;
  ambassadorCode: string | null;
  memberSince: string;
  reviewedAt: string | null;
  rank: number | null;
  points: number;
  deskChecked: number;
  fieldVerified: number;
  lastActive: string | null;
  areas: { lga: string; records: number }[];
  records: { reference: string; date: string; lga: string | null; status: VerificationStatus }[];
}

export interface OwnProfile {
  code: string;
  publicName: string;
  status: ProfileStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface MyRecord {
  canHaveProfile: boolean;
  email: string | null;
  emailConfirmed: boolean;
  mailEnabled: boolean;
  needsEmailConfirmation: boolean;
  points: number;
  deskChecked: number;
  fieldVerified: number;
  lastActive: string | null;
  submitted: number;
  rank: number | null;
  pointValues: { deskChecked: number; fieldVerified: number };
  profile: OwnProfile | null;
  records: { id: string; reference: string; date: string; lga: string | null; place: string | null; status: VerificationStatus; counted: boolean }[];
}

export interface ProfileReviewRow {
  userId: string;
  code: string;
  publicName: string;
  status: ProfileStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  user: { displayName: string | null; email: string | null; emailVerifiedAt: string | null; phone: string | null; role: UserRole; isActive: boolean; createdAt: string };
  points: number;
  deskChecked: number;
  fieldVerified: number;
  lastActive: string | null;
  submitted: number;
}

/** The body of a submission, shared by the public form and the field app. */
export interface SubmissionInput {
  description?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracyM?: number;
  locationOrigin?: 'gps' | 'map_pin' | 'photo' | 'typed';
  communityName?: string;
  lga?: string;
  observedAt?: string;
  setting: SiteSetting;
  extentNote?: string;
  conditionsNote?: string;
  primaryCategory?: WasteCategory;
  composition?: Record<string, number>;
  compositionStatus?: CompositionStatus;
  isMixed?: boolean;
  isHazardous?: boolean;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  shape?: 'BOX' | 'HEAP';
  volumeM3?: number;
  volumeBasis?: EstimateBasis;
  moisturePct?: number;
  moistureBasis?: EstimateBasis;
  siteId?: string;
  siteExists?: boolean;
  siteActive?: boolean;
  levelTrend?: WasteLevelTrend;
  collectionStatus?: string;
  blockedDrain?: boolean;
  overflowingPoint?: boolean;
  entersWaterway?: boolean;
  contactName?: string;
  contactDetail?: string;
  consentToUse?: boolean;
  clientRef?: string;
  website?: string;
}

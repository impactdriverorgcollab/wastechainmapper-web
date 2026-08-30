export type ConfidenceTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type WasteType = 'MUNICIPAL' | 'INDUSTRIAL' | 'MEDICAL' | 'ELECTRONIC' | 'CONSTRUCTION' | 'MIXED' | 'UNKNOWN';
export type SiteStatus = 'UNVERIFIED' | 'ACTIVE' | 'INACTIVE' | 'REMEDIATED';
export type VerificationStatus = 'UNVERIFIED' | 'CORROBORATED' | 'FIELD_VERIFIED' | 'REJECTED';
export type ReportSourceType = 'NEWS_SCRAPE' | 'TWITTER_SCRAPE' | 'WHATSAPP_CITIZEN' | 'MANUAL_ENTRY';
export type GeocodeStatus = 'PENDING' | 'RESOLVED_GAZETTEER' | 'RESOLVED_NOMINATIM' | 'UNRESOLVED';

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

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'ADMIN' | 'FIELD_VERIFIER' | 'PUBLIC_VIEWER';
}

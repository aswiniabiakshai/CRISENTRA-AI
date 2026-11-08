export type ReportStatus =
  | "Submitted"
  | "Processing"
  | "In Progress"
  | "Completed";


export interface CitizenReport {
  id: string;
  message: string;
  disaster: string;
  location: string;
  contact: string;
  submittedAt: string;
  status: ReportStatus;
  imageName?: string;
  videoName?: string;
  photoUrl?: string;
  photoName?: string;
  videoUrl?: string;
  evidenceStatus?: "valid" | "invalid" | "requires_verification";
  evidenceValid?: boolean;
  evidenceMessage?: string;
  evidenceReason?: string;
  detectedVisual?: string;
  requiresManualVerification?: boolean;

  // AI analysis fields
  timestamp?: string;
  category?: string;
  modelCategory?: string;
  confidence?: number;
  need?: string;
  specificNeed?: string;
  urgency?: string;
  people?: string | number;
  trapped?: string | number;
  injured?: string | number;
  deaths?: string | number;
  priority?: string;
  priorityScore?: number;
  actionability?: number | null;
  actionabilityScore?: number | null;
  actionabilityLevel?: string;
  actionabilityReasons?: string[];
  priorityReasons?: string[];
  completeness?: number | null;
  completenessScore?: number | null;
  missingFields?: string[];
}


export interface UserFeedback {
  id: string;
  reportId: string;
  rating: number;
  category: string;
  message: string;
  submittedAt: string;
}

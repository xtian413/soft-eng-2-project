export type EvidenceAudience = 'beginner' | 'intermediate' | 'advanced' | 'general';

export type EvidenceLevel = 'high' | 'moderate' | 'limited';

export type EvidenceSourceType =
  | 'guideline'
  | 'position_stand'
  | 'systematic_review'
  | 'meta_analysis'
  | 'study'
  | 'textbook'
  | 'clinical_report'
  | 'consensus_statement'
  | 'internal';

export type EvidenceSource = {
  title: string;
  organization?: string;
  year?: number;
  sourceType: EvidenceSourceType;
  doi?: string;
  pmid?: string;
  url?: string;
  scope?: string;
  note?: string;
};

export type EvidenceDosage = {
  setsPerWeek?: string;
  reps?: string;
  intensity?: string;
  frequency?: string;
  protein?: string;
  calories?: string;
  carbohydrates?: string;
};

export type EvidenceCard = {
  id: string;
  topic: string;
  tags: string[];
  audience: EvidenceAudience;
  applicablePopulation?: string[];
  excludedPopulation?: string[];
  claim: string;
  practicalAdvice: string[];
  dosage?: EvidenceDosage;
  contraindications?: string[];
  escalationRules?: string[];
  limitations?: string[];
  source: EvidenceSource;
  evidenceLevel: EvidenceLevel;
  lastReviewedAt: string;
};

export type EvidenceCardPack = {
  schemaVersion: string;
  name: string;
  description: string;
  generatedAt: string;
  reviewPolicy?: {
    reviewInterval?: string;
    manualReviewRequired?: boolean;
    importantNote?: string;
  };
  sources: EvidenceSource[];
  cards: EvidenceCard[];
};

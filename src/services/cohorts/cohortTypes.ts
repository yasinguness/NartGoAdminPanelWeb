export interface CohortRow {
  cohortWeek?: string;
  cohortSize: number;
  w1Pct?: number | null;
  w2Pct?: number | null;
  w4Pct?: number | null;
  w8Pct?: number | null;
  w12Pct?: number | null;
}

export interface CohortSummary {
  avgW1Pct?: number;
  avgW2Pct?: number;
  avgW4Pct?: number;
  avgW8Pct?: number;
  avgW12Pct?: number;
  totalCohortSize: number;
}

export interface CohortRetentionResponse {
  generatedAt: string;
  weeksAnalyzed: number;
  cohorts: CohortRow[];
  summary?: CohortSummary;
}

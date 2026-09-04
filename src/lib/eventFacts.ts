export type EventImportance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EventSource = "STATE_CHANGE" | "PROJECT" | "OPERATION" | "CONGRESS" | "FISCAL" | "ECONOMY" | "SECURITY" | "POLITICS" | "WORLD" | "MEDIA" | "RANDOM";
export type EventCategory = "government" | "economy" | "security" | "politics" | "social" | "international";
export type EventType =
  | "LEGISLATION_INTRODUCED" | "LEGISLATION_PASSED" | "LEGISLATION_FAILED" | "LEGISLATION_WITHDRAWN"
  | "PROJECT_STARTED" | "PROJECT_STALLED" | "PROJECT_RESUMED" | "PROJECT_MILESTONE" | "PROJECT_COMPLETED" | "PROJECT_FAILED" | "PROJECT_CANCELLED"
  | "OPERATION_LAUNCHED" | "OPERATION_DEVELOPMENT" | "OPERATION_BREAKTHROUGH" | "OPERATION_CASUALTIES" | "OPERATION_COMPLETED" | "OPERATION_FAILED" | "OPERATION_CANCELLED"
  | "MAJOR_EXPENDITURE" | "DEBT_THRESHOLD" | "FISCAL_BALANCE_SHIFT" | "DISCRETIONARY_CAPACITY_CRITICAL"
  | "INFLATION_SHIFT" | "RECESSION_BEGAN" | "RECESSION_ENDED" | "UNEMPLOYMENT_SHIFT" | "CREDIT_RATING_CHANGED"
  | "APPROVAL_THRESHOLD" | "APPROVAL_SHIFT" | "COALITION_THRESHOLD"
  | "SECURITY_INDEX_SHIFT" | "CRIMINAL_CAPACITY_SHIFT" | "CRIMINAL_THREAT_CHANGED"
  | "WORLD_EVENT" | "INTERVIEW_ACCEPTED" | "INTERVIEW_DECLINED" | "MEDIA_INTERVIEW_COMPLETED" | "MAJOR_PUBLIC_COMMITMENT";

export interface EventSubject { id: string; type: "PROJECT" | "OPERATION" | "ORGANISATION" | "PROCEEDING" | "COUNTRY" | "STATE" | "INSTITUTION"; name: string; }

export interface EventFact {
  id: string;
  turn: number;
  date?: string;
  type: EventType;
  category: EventCategory;
  source: EventSource;
  importance: EventImportance;
  headlineKey?: string;
  subjects: EventSubject[];
  previousValues?: Record<string, number | string | boolean>;
  currentValues?: Record<string, number | string | boolean>;
  metrics?: Record<string, number | string | boolean>;
  causes?: string[];
  consequences?: string[];
  geography?: string[];
  relatedActionIds?: string[];
  relatedProjectIds?: string[];
  relatedOperationIds?: string[];
  relatedProceedingIds?: string[];
  dedupeKey: string;
  occurredTurn: number;
  surfacedToPresident: boolean;
  debug?: { significanceScore: number; templateIds?: string[]; llmEnriched?: boolean };
}

export const EVENT_THRESHOLDS = {
  approvalSharpChange: 5,
  approvalBands: [30, 40, 60],
  coalitionBands: [25, 40, 60],
  inflationChange: 1,
  inflationSevere: 8,
  unemploymentChange: 0.8,
  securityChange: 5,
  criminalCapacityChange: 5,
  debtBands: [90, 100, 110],
  fiscalBalanceShift: 100,
  majorExpenditure: 5,
  majorAssetSeizure: 0.1,
  projectNewsBudget: 1,
} as const;

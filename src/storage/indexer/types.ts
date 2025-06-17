export type SourceType = "local" | "exported";

export interface IndexEntry {
  alias: string;
  did: string;
  kid: string; // Reference to Veramo key
  description?: string; // Optional description for the DID
  tags?: string[]; // Optional tags for categorization
  createdAt: string;
  meta?: Record<string, unknown>; // Additional metadata
  source?: SourceType | "local";
}

export interface IndexRecord {
  [alias: string]: IndexEntry;
}

export interface Index {
  entries: IndexRecord;
  version: string;
}

export interface IndexEntry {
  id: string;
  alias: string;
  type: string[];
  createdAt: string;
  issuerId?: string;      // Add the issuer ID for filtering
  subjectId?: string;     // Add the subject ID for filtering
  expirationDate?: string; // Track expiration for validity checks
}
export interface IndexRecord {
  [id: string]: IndexEntry;
}

export interface Index {
  entries: IndexRecord;
  version: string;
}

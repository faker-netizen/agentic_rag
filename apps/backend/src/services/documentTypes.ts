export type DocumentIndexingStatus = "none" | "pending" | "indexed" | "failed";
export type DocumentSummaryStatus = "none" | "pending" | "ready" | "failed";

/** SQL fragment: only documents eligible for vector retrieval */
export const INDEXED_DOCUMENT_SQL = "(d.indexing_status = 'indexed' OR d.indexing_status IS NULL)";

/** Named constants for backend services (AI guardrails: no magic numbers). */

export const RANDOM_TOKEN_BYTES = 32;
export const REFRESH_TOKEN_RAW_BYTES = 48;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

export const MAX_CHAT_TITLE_LENGTH = 255;
export const SESSION_TITLE_PREVIEW_LENGTH = 80;
export const CHAT_HISTORY_LIMIT = 30;
export const RAG_TOP_K = 5;

export const BYTES_PER_GB = 1e9;
export const FLOAT_EPSILON = 1e-9;

export const RAG_CONTEXT_MAX_CHARS = 2000;
export const RAG_KEYWORD_TOP_K = 24;
export const RAG_VECTOR_TOP_K = 8;
export const RAG_SCORE_THRESHOLD = 0.15;
export const RAG_RRF_K = 40;
export const RAG_MIN_SCORE = 0.001;
export const RAG_TEMPERATURE = 0.2;
export const RAG_HISTORY_LIMIT = 3;

export const BCRYPT_COST = 10;
export const DOCUMENT_LIST_DEFAULT_LIMIT = 5;
export const RRF_FUSION_K = 60;
export const KEYWORD_TERM_MAX_LEN = 32;
export const RANK_DECAY_STEP = 0.001;
export const SQL_TITLE_RECALL_LIMIT = 40;
export const EMBEDDING_CANDIDATE_LIMIT = 2000;
export const DEFAULT_RETRIEVAL_K = 5;
export const DEFAULT_MIN_SCORE = 0.2;
export const INGEST_CHUNK_SIZE = 300;
export const INGEST_CHUNK_OVERLAP = 100;
export const SCORE_DECIMAL_PLACES = 3;

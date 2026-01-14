export interface RankHistoryItem {
  date: string; // ISO Date string
  rank: number; // 0 means not found or > 100
  timestamp: number;
}

export interface Project {
  id: string;
  name: string;
  domain: string; // Default domain for the project
  createdAt: number;
}

export interface KeywordTrack {
  id: string;
  projectId: string; // Foreign key linking to Project
  keyword: string;
  domain: string;
  currentRank: number;
  lastChecked: number | null; // Timestamp
  history: RankHistoryItem[];
  isUpdating: boolean;
  lastError?: string;
}

export interface CheckResult {
  rank: number;
  found: boolean;
  snippet?: string;
}

export enum SortOption {
  DATE_ADDED = 'DATE_ADDED',
  RANK_ASC = 'RANK_ASC',
  RANK_DESC = 'RANK_DESC',
  ALPHABETICAL = 'ALPHABETICAL'
}

export interface SeoArticleResponse {
  meta: {
    title: string;
    slug: string;
    description: string;
    focus_keyword: string;
  };
  outline: {
    h2: string;
    h3: string[];
  }[];
  content_markdown: string;
  faq_schema_jsonld: string;
  seo_checklist: {
    word_count_target: number;
    target_occurrences: number;
    occurrences_est: number;
    density_est: number;
    cta_included: boolean;
    internal_links: string[];
  };
  notes_missing: string[];
}

export interface AnalyticsData {
  users: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: string;
  chartData: { date: string; users: number; sessions: number }[];
}

export interface AnalyticsReport {
  summary: string;
  key_insights: string[];
  recommendations: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

// --- GA4 Types ---
export interface GA4AccountSummary {
  name: string; // "accountSummaries/123"
  account: string; // "accounts/123"
  displayName: string;
  propertySummaries: GA4PropertySummary[];
}

export interface GA4PropertySummary {
  property: string; // "properties/123456"
  displayName: string;
  propertyType: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}
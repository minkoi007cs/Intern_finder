export type Opportunity = {
  id: string;
  title: string;
  organization: string;
  description: string;
  opportunity_type: string;
  location: string | null;
  remote_type: string;
  posted_date: string | null;
  deadline: string | null;
  application_url: string | null;
  source_name: string;
  source_url: string | null;
  is_demo: boolean;
  skills: { name: string; required: boolean }[];
};

export type Match = {
  overall_score: number;
  score_label: string;
  score_version: string;
  components: Record<string, number>;
  matched_skills: string[];
  missing_required_skills: string[];
  missing_preferred_skills: string[];
  reasons: string[];
  next_action: string;
};

export type Recommendation = { opportunity: Opportunity; match: Match };

export type RecommendationPage = {
  items: Recommendation[];
  total: number;
  limit: number;
  offset: number;
  next_offset: number | null;
};

export type FeedFilters = {
  q: string;
  opportunityType: string;
  remoteOnly: boolean;
  sort: "match" | "deadline";
};

export type Place = { label: string; city: string; state: string; latitude: number; longitude: number };

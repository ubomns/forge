export type Stage = 'idea' | 'validation' | 'growth';

export interface ExecutiveSummary {
  tagline: string;
  elevator_pitch: string;
}

export interface Problem {
  description: string;
  pain_points: string[];
}

export interface Solution {
  description: string;
  key_features: string[];
}

export interface Market {
  tam: string;
  sam: string;
  som: string;
  segments: string[];
}

export interface Competition {
  overview: string;
  advantages: string[];
  competitors: string[];
}

export interface GoToMarket {
  strategy: string;
  channels: string[];
  milestones: string[];
}

export interface BusinessModel {
  revenue_streams: string[];
  pricing: string;
  unit_economics: string;
}

export interface Team {
  needed_roles: string[];
  current_gaps: string[];
}

export interface Financials {
  revenue_projection: string;
  key_costs: string[];
  break_even: string;
}

export interface Ask {
  amount: string;
  use_of_funds: string[];
  vision: string;
}

export type SectionId =
  | 'executive_summary'
  | 'problem'
  | 'solution'
  | 'market'
  | 'competition'
  | 'go_to_market'
  | 'business_model'
  | 'team'
  | 'financials'
  | 'ask';

export interface BusinessPlan {
  executive_summary: ExecutiveSummary;
  problem: Problem;
  solution: Solution;
  market: Market;
  competition: Competition;
  go_to_market: GoToMarket;
  business_model: BusinessModel;
  team: Team;
  financials: Financials;
  ask: Ask;
}

export const SECTION_DISPLAY_NAMES: Record<SectionId, string> = {
  executive_summary: 'Executive Summary',
  problem: 'Problem',
  solution: 'Solution',
  market: 'Market',
  competition: 'Competition',
  go_to_market: 'Go-to-Market',
  business_model: 'Business Model',
  team: 'Team',
  financials: 'Financials',
  ask: 'The Ask',
};

export const SECTION_ORDER: SectionId[] = [
  'executive_summary',
  'problem',
  'solution',
  'market',
  'competition',
  'go_to_market',
  'business_model',
  'team',
  'financials',
  'ask',
];

export interface GenerateRequest {
  description: string;
  industry?: string;
  stage?: Stage;
  market_context?: string;
}

export type ApiErrorCode = 'MISSING_API_KEY' | 'UPSTREAM_ERROR' | 'INVALID_REQUEST';

export interface ApiError {
    code: ApiErrorCode;
    message: string;
}

export type SectionStatus = 'pending' | 'streaming' | 'done';

export type SectionState =
    | { status: 'pending' }
    | { status: 'streaming'; data: Partial<BusinessPlan[SectionId]> }
    | { status: 'done'; data: BusinessPlan[SectionId] };

export type SectionsState = Record<SectionId, SectionState>;

export type Severity = 'low' | 'medium' | 'high';

export interface Critique {
    section_id: SectionId;
    severity: Severity;
    claim: string;
    suggestion: string;
}

export interface CritiqueResponse {
    critiques: Critique[];
}

export interface CritiqueWithId extends Critique {
    id: string;
}

export interface InvestorQuestion {
    question: string;
    why_it_matters: string;
    section_id: SectionId;
}

export interface InvestorQuestionsResponse {
    questions: InvestorQuestion[];
}
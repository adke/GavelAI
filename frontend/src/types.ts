// Core types matching backend models

export type VerdictType = "pass" | "fail" | "inconclusive";

export interface Judge {
  id: number;
  name: string;
  system_prompt: string;
  model_name: string;
  active: boolean;
  created_at: string;
}

export interface JudgeCreate {
  name: string;
  system_prompt: string;
  model_name: string;
  active?: boolean;
}

export interface JudgeUpdate {
  name?: string;
  system_prompt?: string;
  model_name?: string;
  active?: boolean;
}

export interface Queue {
  queue_id: string;
  submission_count: number;
  uploaded_at?: number;
}

export interface QueueSubmission {
  id: string;
  labeling_task_id: string;
  created_at: number;
  question_count: number;
  evaluation_count: number;
}

export interface QuestionTemplate {
  question_template_id: string;
  question_text: string;
  question_type: string;
  assigned_judge_ids: number[];
}

export interface JudgeAssignment {
  queue_id: string;
  question_template_id: string;
  judge_ids: number[];
}

export interface Evaluation {
  id: number;
  submission_id: string;
  question_template_id: string;
  judge_id: number;
  judge_name: string;
  verdict: VerdictType;
  reasoning: string;
  confidence_score: number;
  created_at: string;
  question_text?: string;
  answer_choice?: string;
  answer_reasoning?: string;
}

export interface EvaluationStats {
  total: number;
  pass_count: number;
  fail_count: number;
  inconclusive_count: number;
  pass_rate: number;
  avg_confidence: number;
}

export interface RunEvaluationResponse {
  planned: number;
  completed: number;
  failed: number;
  errors: string[];
}

export interface QueueJudgeStats {
  judge_id: number;
  judge_name: string;
  pass: number;
  fail: number;
  inconclusive: number;
  total: number;
  pass_rate: number;
}

export interface QueueStatsResponse {
  [queueId: string]: QueueJudgeStats[];
}


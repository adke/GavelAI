import type {
  Judge,
  JudgeCreate,
  JudgeUpdate,
  Queue,
  QueueSubmission,
  QuestionTemplate,
  JudgeAssignment,
  Evaluation,
  EvaluationStats,
  RunEvaluationResponse,
} from "./types";

const API_BASE = "/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(response.status, error || response.statusText);
  }

  return response.json();
}

// Submissions API
export async function uploadSubmissions(file: File): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/submissions/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ApiError(response.status, error || response.statusText);
  }

  return response.json();
}

export async function getQueues(): Promise<Queue[]> {
  return fetchApi<Queue[]>("/queues");
}

export async function getQueueQuestions(queueId: string): Promise<QuestionTemplate[]> {
  return fetchApi<QuestionTemplate[]>(`/queues/${queueId}/questions`);
}

export async function getQueueSubmissions(queueId: string): Promise<QueueSubmission[]> {
  return fetchApi<QueueSubmission[]>(`/queues/${queueId}/submissions`);
}

export async function deleteQueue(queueId: string): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(`/queues/${queueId}`, {
    method: "DELETE",
  });
}

// Judges API
export async function getJudges(): Promise<Judge[]> {
  return fetchApi<Judge[]>("/judges");
}

export async function getJudge(id: number): Promise<Judge> {
  return fetchApi<Judge>(`/judges/${id}`);
}

export async function createJudge(judge: JudgeCreate): Promise<Judge> {
  return fetchApi<Judge>("/judges", {
    method: "POST",
    body: JSON.stringify(judge),
  });
}

export async function updateJudge(id: number, judge: JudgeUpdate): Promise<Judge> {
  return fetchApi<Judge>(`/judges/${id}`, {
    method: "PUT",
    body: JSON.stringify(judge),
  });
}

export async function deleteJudge(id: number): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(`/judges/${id}`, {
    method: "DELETE",
  });
}

// Assignments API
export async function assignJudges(assignment: JudgeAssignment): Promise<{ message: string }> {
  return fetchApi<{ message: string }>("/assignments", {
    method: "POST",
    body: JSON.stringify(assignment),
  });
}

// Evaluations API
export async function runEvaluations(queueId: string): Promise<RunEvaluationResponse> {
  return fetchApi<RunEvaluationResponse>("/evaluations/run", {
    method: "POST",
    body: JSON.stringify({ queue_id: queueId }),
  });
}

export async function getEvaluations(filters: {
  judge_ids?: number[];
  question_ids?: string[];
  verdict?: string;
}): Promise<Evaluation[]> {
  const params = new URLSearchParams();
  
  if (filters.judge_ids && filters.judge_ids.length > 0) {
    params.append("judge_ids", filters.judge_ids.join(","));
  }
  if (filters.question_ids && filters.question_ids.length > 0) {
    params.append("question_ids", filters.question_ids.join(","));
  }
  if (filters.verdict) {
    params.append("verdict", filters.verdict);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/evaluations?${queryString}` : "/evaluations";
  
  return fetchApi<Evaluation[]>(endpoint);
}

export async function getEvaluationStats(filters: {
  judge_ids?: number[];
  question_ids?: string[];
  verdict?: string;
}): Promise<EvaluationStats> {
  const params = new URLSearchParams();
  
  if (filters.judge_ids && filters.judge_ids.length > 0) {
    params.append("judge_ids", filters.judge_ids.join(","));
  }
  if (filters.question_ids && filters.question_ids.length > 0) {
    params.append("question_ids", filters.question_ids.join(","));
  }
  if (filters.verdict) {
    params.append("verdict", filters.verdict);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/evaluations/stats?${queryString}` : "/evaluations/stats";
  
  return fetchApi<EvaluationStats>(endpoint);
}

export async function getQueueStats(): Promise<import("./types").QueueStatsResponse> {
  return fetchApi<import("./types").QueueStatsResponse>("/evaluations/stats/by-queue");
}

// Ollama API
export async function getOllamaModels(): Promise<string[]> {
  const response = await fetchApi<{ models: string[] }>("/ollama/models");
  return response.models;
}

export { ApiError };


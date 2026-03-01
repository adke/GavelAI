from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime


# Submission models
class QuestionData(BaseModel):
    id: str
    questionType: str
    questionText: str
    content: Optional[str] = None


class Question(BaseModel):
    rev: int
    data: QuestionData


class Answer(BaseModel):
    choice: str
    reasoning: Optional[str] = None


class Submission(BaseModel):
    id: str
    queueId: str
    labelingTaskId: str
    createdAt: int
    questions: List[Question]
    answers: Dict[str, Answer]


# Judge models
class JudgeCreate(BaseModel):
    name: str
    system_prompt: str
    model_name: str
    active: bool = True


class JudgeUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    model_name: Optional[str] = None
    active: Optional[bool] = None


class JudgeResponse(BaseModel):
    id: int
    name: str
    system_prompt: str
    model_name: str
    active: bool
    created_at: str


# Assignment models
class JudgeAssignment(BaseModel):
    queue_id: str
    question_template_id: str
    judge_ids: List[int]


class AssignmentResponse(BaseModel):
    id: int
    queue_id: str
    question_template_id: str
    judge_id: int
    created_at: str


# Evaluation models
VerdictType = Literal["pass", "fail", "inconclusive"]


class EvaluationResponse(BaseModel):
    id: int
    submission_id: str
    question_template_id: str
    judge_id: int
    judge_name: str
    verdict: VerdictType
    reasoning: str
    confidence_score: int = 50
    created_at: str
    question_text: Optional[str] = None
    answer_choice: Optional[str] = None
    answer_reasoning: Optional[str] = None


class EvaluationStats(BaseModel):
    total: int
    pass_count: int
    fail_count: int
    inconclusive_count: int
    pass_rate: float
    avg_confidence: float = 50.0


class RunEvaluationRequest(BaseModel):
    queue_id: str


class RunEvaluationResponse(BaseModel):
    planned: int
    completed: int
    failed: int
    errors: List[str]


# Queue models
class QueueInfo(BaseModel):
    queue_id: str
    submission_count: int
    question_templates: List[Dict[str, Any]]


class QuestionTemplate(BaseModel):
    question_template_id: str
    question_text: str
    question_type: str
    assigned_judge_ids: List[int]


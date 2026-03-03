import json
from datetime import datetime
from typing import Optional, List, Tuple

from models import EvaluationResponse, ReviewItemResponse, ReviewQueueStats


CONFIDENCE_THRESHOLD_DEFAULT = 60


async def check_and_escalate(
    db,
    submission_id: str,
    question_template_id: str,
    confidence_threshold: int = CONFIDENCE_THRESHOLD_DEFAULT,
) -> bool:
    """Check escalation triggers and create/update a review_queue entry if needed.

    Returns True if the item was escalated (inserted or updated).
    """
    cursor = await db.execute(
        """SELECT verdict, confidence_score
           FROM evaluations
           WHERE submission_id = ? AND question_template_id = ?""",
        (submission_id, question_template_id),
    )
    rows = await cursor.fetchall()
    if not rows:
        return False

    reasons: list[str] = []

    verdicts = [r[0] for r in rows]
    confidences = [r[1] for r in rows]

    if any(c < confidence_threshold for c in confidences):
        reasons.append("low_confidence")

    if "inconclusive" in verdicts:
        reasons.append("inconclusive")

    unique_verdicts = set(verdicts)
    if len(rows) > 1 and len(unique_verdicts) > 1:
        reasons.append("judge_disagreement")

    if not reasons:
        return False

    reasons_json = json.dumps(reasons)
    now = datetime.now().isoformat()

    existing = await db.execute(
        """SELECT id, status, escalation_reasons
           FROM review_queue
           WHERE submission_id = ? AND question_template_id = ?""",
        (submission_id, question_template_id),
    )
    row = await existing.fetchone()

    if row is None:
        await db.execute(
            """INSERT INTO review_queue
               (submission_id, question_template_id, escalation_reasons, status, created_at)
               VALUES (?, ?, ?, 'pending', ?)""",
            (submission_id, question_template_id, reasons_json, now),
        )
        await db.commit()
        return True

    if row[1] == "pending":
        existing_reasons = set(json.loads(row[2]))
        merged = sorted(existing_reasons | set(reasons))
        await db.execute(
            "UPDATE review_queue SET escalation_reasons = ? WHERE id = ?",
            (json.dumps(merged), row[0]),
        )
        await db.commit()
        return False  # already existed, just updated reasons

    return False


async def get_review_queue_items(
    db,
    status: Optional[str] = None,
    reason: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[ReviewItemResponse]:
    """Fetch review queue items with full context."""
    query = """
        SELECT rq.id, rq.submission_id, rq.question_template_id,
               rq.escalation_reasons, rq.status, rq.human_verdict,
               rq.human_comment, rq.reviewed_by, rq.created_at, rq.reviewed_at,
               q.question_text, a.choice, a.reasoning
        FROM review_queue rq
        LEFT JOIN questions q ON rq.submission_id = q.submission_id
                             AND rq.question_template_id = q.question_template_id
        LEFT JOIN answers a ON rq.submission_id = a.submission_id
                           AND rq.question_template_id = a.question_template_id
        WHERE 1=1
    """
    params: list = []

    if status:
        query += " AND rq.status = ?"
        params.append(status)

    if reason:
        query += " AND rq.escalation_reasons LIKE ?"
        params.append(f"%{reason}%")

    query += " ORDER BY rq.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()

    items: list[ReviewItemResponse] = []
    for row in rows:
        evals = await _fetch_evaluations_for_pair(db, row[1], row[2])
        items.append(
            ReviewItemResponse(
                id=row[0],
                submission_id=row[1],
                question_template_id=row[2],
                escalation_reasons=json.loads(row[3]),
                status=row[4],
                human_verdict=row[5],
                human_comment=row[6],
                reviewed_by=row[7],
                created_at=row[8],
                reviewed_at=row[9],
                question_text=row[10],
                answer_choice=row[11],
                answer_reasoning=row[12],
                evaluations=evals,
            )
        )
    return items


async def get_review_item(db, review_id: int) -> Optional[ReviewItemResponse]:
    """Fetch a single review queue item by ID."""
    cursor = await db.execute(
        """SELECT rq.id, rq.submission_id, rq.question_template_id,
                  rq.escalation_reasons, rq.status, rq.human_verdict,
                  rq.human_comment, rq.reviewed_by, rq.created_at, rq.reviewed_at,
                  q.question_text, a.choice, a.reasoning
           FROM review_queue rq
           LEFT JOIN questions q ON rq.submission_id = q.submission_id
                                AND rq.question_template_id = q.question_template_id
           LEFT JOIN answers a ON rq.submission_id = a.submission_id
                              AND rq.question_template_id = a.question_template_id
           WHERE rq.id = ?""",
        (review_id,),
    )
    row = await cursor.fetchone()
    if not row:
        return None

    evals = await _fetch_evaluations_for_pair(db, row[1], row[2])
    return ReviewItemResponse(
        id=row[0],
        submission_id=row[1],
        question_template_id=row[2],
        escalation_reasons=json.loads(row[3]),
        status=row[4],
        human_verdict=row[5],
        human_comment=row[6],
        reviewed_by=row[7],
        created_at=row[8],
        reviewed_at=row[9],
        question_text=row[10],
        answer_choice=row[11],
        answer_reasoning=row[12],
        evaluations=evals,
    )


async def submit_verdict(
    db,
    review_id: int,
    verdict: str,
    comment: Optional[str],
    reviewed_by: str,
) -> bool:
    """Submit a human verdict for a review queue item.

    Returns True if the item was found and updated.
    """
    cursor = await db.execute(
        "SELECT id, status FROM review_queue WHERE id = ?", (review_id,)
    )
    row = await cursor.fetchone()
    if not row:
        return False

    now = datetime.now().isoformat()
    status = "approved" if verdict == row[1] else "overridden"
    # If the item already has evaluations, determine if the human agrees with AI majority
    evals_cursor = await db.execute(
        """SELECT verdict FROM evaluations
           WHERE submission_id = (SELECT submission_id FROM review_queue WHERE id = ?)
             AND question_template_id = (SELECT question_template_id FROM review_queue WHERE id = ?)""",
        (review_id, review_id),
    )
    eval_rows = await evals_cursor.fetchall()
    if eval_rows:
        ai_verdicts = [r[0] for r in eval_rows]
        from collections import Counter
        most_common = Counter(ai_verdicts).most_common(1)[0][0]
        status = "approved" if verdict == most_common else "overridden"

    await db.execute(
        """UPDATE review_queue
           SET status = ?, human_verdict = ?, human_comment = ?,
               reviewed_by = ?, reviewed_at = ?
           WHERE id = ?""",
        (status, verdict, comment, reviewed_by, now, review_id),
    )
    await db.commit()
    return True


async def get_review_stats(db) -> ReviewQueueStats:
    """Get aggregate stats for the review queue."""
    cursor = await db.execute(
        """SELECT
               SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),
               SUM(CASE WHEN status != 'pending' THEN 1 ELSE 0 END),
               SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END),
               SUM(CASE WHEN status = 'overridden' THEN 1 ELSE 0 END)
           FROM review_queue"""
    )
    row = await cursor.fetchone()
    return ReviewQueueStats(
        total_pending=row[0] or 0,
        total_reviewed=row[1] or 0,
        approved_count=row[2] or 0,
        overridden_count=row[3] or 0,
    )


async def _fetch_evaluations_for_pair(
    db, submission_id: str, question_template_id: str
) -> List[EvaluationResponse]:
    """Fetch all evaluations for a (submission, question) pair."""
    cursor = await db.execute(
        """SELECT e.id, e.submission_id, e.question_template_id, e.judge_id,
                  j.name, e.verdict, e.reasoning, e.confidence_score, e.created_at,
                  q.question_text, a.choice, a.reasoning
           FROM evaluations e
           JOIN judges j ON e.judge_id = j.id
           LEFT JOIN questions q ON e.submission_id = q.submission_id
                                AND e.question_template_id = q.question_template_id
           LEFT JOIN answers a ON e.submission_id = a.submission_id
                              AND e.question_template_id = a.question_template_id
           WHERE e.submission_id = ? AND e.question_template_id = ?
           ORDER BY e.created_at DESC""",
        (submission_id, question_template_id),
    )
    rows = await cursor.fetchall()
    return [
        EvaluationResponse(
            id=r[0],
            submission_id=r[1],
            question_template_id=r[2],
            judge_id=r[3],
            judge_name=r[4],
            verdict=r[5],
            reasoning=r[6],
            confidence_score=r[7],
            created_at=r[8],
            question_text=r[9],
            answer_choice=r[10],
            answer_reasoning=r[11],
        )
        for r in rows
    ]

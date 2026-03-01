from fastapi import FastAPI, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from contextlib import asynccontextmanager
import json
from datetime import datetime
import httpx

from database import init_db, get_db
from models import (
    Submission, JudgeCreate, JudgeUpdate, JudgeResponse,
    JudgeAssignment, AssignmentResponse, EvaluationResponse,
    EvaluationStats, RunEvaluationRequest, RunEvaluationResponse,
    QueueInfo, QuestionTemplate
)
from ollama_client import OllamaClient, parse_verdict


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown (if needed in the future)


app = FastAPI(title="AI Judge API", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ollama_client = OllamaClient()


# ==================== Submissions Endpoints ====================

@app.post("/api/submissions/upload")
async def upload_submissions(file: UploadFile):
    """Upload and parse submissions JSON file."""
    try:
        content = await file.read()
        submissions_data = json.loads(content)
        
        if not isinstance(submissions_data, list):
            raise HTTPException(status_code=400, detail="Expected JSON array")
        
        db = await get_db()
        inserted_count = 0
        
        try:
            for sub_data in submissions_data:
                submission = Submission(**sub_data)
                
                # Insert submission
                await db.execute(
                    """INSERT OR REPLACE INTO submissions 
                       (id, queue_id, labeling_task_id, created_at, raw_data)
                       VALUES (?, ?, ?, ?, ?)""",
                    (submission.id, submission.queueId, submission.labelingTaskId,
                     submission.createdAt, json.dumps(sub_data))
                )
                
                # Insert questions
                for question in submission.questions:
                    await db.execute(
                        """INSERT INTO questions 
                           (submission_id, question_template_id, question_type, question_text, content, rev)
                           VALUES (?, ?, ?, ?, ?, ?)""",
                        (submission.id, question.data.id, question.data.questionType,
                         question.data.questionText, question.data.content, question.rev)
                    )
                
                # Insert answers
                for q_id, answer in submission.answers.items():
                    await db.execute(
                        """INSERT INTO answers 
                           (submission_id, question_template_id, choice, reasoning)
                           VALUES (?, ?, ?, ?)""",
                        (submission.id, q_id, answer.choice, answer.reasoning)
                    )
                
                inserted_count += 1
            
            await db.commit()
            return {"message": f"Successfully uploaded {inserted_count} submissions"}
        finally:
            await db.close()
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/api/queues")
async def get_queues():
    """Get all queues with submission counts."""
    db = await get_db()
    try:
        cursor = await db.execute("""
            SELECT queue_id, COUNT(*) as count, MIN(created_at) as first_uploaded
            FROM submissions
            GROUP BY queue_id
            ORDER BY first_uploaded DESC
        """)
        rows = await cursor.fetchall()
        queues = [{"queue_id": row[0], "submission_count": row[1], "uploaded_at": row[2]} for row in rows]
        return queues
    finally:
        await db.close()


@app.get("/api/queues/{queue_id}/submissions")
async def get_queue_submissions(queue_id: str):
    """Get all submissions in a queue with their details."""
    db = await get_db()
    try:
        cursor = await db.execute("""
            SELECT id, labeling_task_id, created_at
            FROM submissions
            WHERE queue_id = ?
            ORDER BY created_at DESC
        """, (queue_id,))
        rows = await cursor.fetchall()
        
        if not rows:
            return []
        
        submissions = []
        for row in rows:
            sub_id = row[0]
            
            # Count questions for this submission
            cursor2 = await db.execute(
                "SELECT COUNT(*) FROM questions WHERE submission_id = ?",
                (sub_id,)
            )
            question_count = (await cursor2.fetchone())[0]
            
            # Count evaluations for this submission
            cursor3 = await db.execute(
                "SELECT COUNT(*) FROM evaluations WHERE submission_id = ?",
                (sub_id,)
            )
            evaluation_count = (await cursor3.fetchone())[0]
            
            submissions.append({
                "id": sub_id,
                "labeling_task_id": row[1],
                "created_at": row[2],
                "question_count": question_count,
                "evaluation_count": evaluation_count
            })
        
        return submissions
    finally:
        await db.close()


@app.delete("/api/queues/{queue_id}")
async def delete_queue(queue_id: str):
    """Delete a queue and all its associated data."""
    db = await get_db()
    try:
        # Get submission IDs for this queue
        cursor = await db.execute(
            "SELECT id FROM submissions WHERE queue_id = ?",
            (queue_id,)
        )
        submission_rows = await cursor.fetchall()
        submission_ids = [row[0] for row in submission_rows]
        
        if not submission_ids:
            raise HTTPException(status_code=404, detail="Queue not found")
        
        # Delete evaluations for these submissions
        placeholders = ','.join('?' * len(submission_ids))
        await db.execute(
            f"DELETE FROM evaluations WHERE submission_id IN ({placeholders})",
            submission_ids
        )
        
        # Delete answers for these submissions
        await db.execute(
            f"DELETE FROM answers WHERE submission_id IN ({placeholders})",
            submission_ids
        )
        
        # Delete questions for these submissions
        await db.execute(
            f"DELETE FROM questions WHERE submission_id IN ({placeholders})",
            submission_ids
        )
        
        # Delete judge assignments for this queue
        await db.execute(
            "DELETE FROM judge_assignments WHERE queue_id = ?",
            (queue_id,)
        )
        
        # Delete submissions
        await db.execute(
            "DELETE FROM submissions WHERE queue_id = ?",
            (queue_id,)
        )
        
        await db.commit()
        return {"message": f"Queue '{queue_id}' and all associated data deleted successfully"}
    finally:
        await db.close()


@app.get("/api/queues/{queue_id}/questions")
async def get_queue_questions(queue_id: str):
    """Get all unique question templates in a queue with assigned judges and sample answers."""
    db = await get_db()
    try:
        # Get unique questions
        cursor = await db.execute("""
            SELECT DISTINCT q.question_template_id, q.question_text, q.question_type, q.content
            FROM questions q
            JOIN submissions s ON q.submission_id = s.id
            WHERE s.queue_id = ?
        """, (queue_id,))
        rows = await cursor.fetchall()
        
        questions = []
        for row in rows:
            q_template_id = row[0]
            
            # Get assigned judges for this question
            cursor2 = await db.execute("""
                SELECT judge_id
                FROM judge_assignments
                WHERE queue_id = ? AND question_template_id = ?
            """, (queue_id, q_template_id))
            judge_rows = await cursor2.fetchall()
            judge_ids = [r[0] for r in judge_rows]
            
            # Get the answer for this question template
            cursor3 = await db.execute("""
                SELECT a.choice, a.reasoning
                FROM answers a
                JOIN submissions s ON a.submission_id = s.id
                WHERE s.queue_id = ? AND a.question_template_id = ?
                LIMIT 1
            """, (queue_id, q_template_id))
            answer_row = await cursor3.fetchone()
            answer = {"choice": answer_row[0], "reasoning": answer_row[1]} if answer_row else None
            
            questions.append({
                "question_template_id": q_template_id,
                "question_text": row[1],
                "question_type": row[2],
                "content": row[3],
                "assigned_judge_ids": judge_ids,
                "answer": answer
            })
        
        return questions
    finally:
        await db.close()


# ==================== Judges Endpoints ====================

@app.post("/api/judges", response_model=JudgeResponse)
async def create_judge(judge: JudgeCreate):
    """Create a new AI judge."""
    db = await get_db()
    try:
        created_at = datetime.now().isoformat()
        cursor = await db.execute(
            """INSERT INTO judges (name, system_prompt, model_name, active, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (judge.name, judge.system_prompt, judge.model_name, judge.active, created_at)
        )
        await db.commit()
        judge_id = cursor.lastrowid
        
        return JudgeResponse(
            id=judge_id,
            name=judge.name,
            system_prompt=judge.system_prompt,
            model_name=judge.model_name,
            active=judge.active,
            created_at=created_at
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating judge: {str(e)}")
    finally:
        await db.close()


@app.get("/api/judges", response_model=List[JudgeResponse])
async def get_judges():
    """Get all judges."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM judges ORDER BY created_at DESC")
        rows = await cursor.fetchall()
        
        return [
            JudgeResponse(
                id=row[0],
                name=row[1],
                system_prompt=row[2],
                model_name=row[3],
                active=bool(row[4]),
                created_at=row[5]
            )
            for row in rows
        ]
    finally:
        await db.close()


@app.get("/api/judges/{judge_id}", response_model=JudgeResponse)
async def get_judge(judge_id: int):
    """Get a specific judge."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM judges WHERE id = ?", (judge_id,))
        row = await cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Judge not found")
        
        return JudgeResponse(
            id=row[0],
            name=row[1],
            system_prompt=row[2],
            model_name=row[3],
            active=bool(row[4]),
            created_at=row[5]
        )
    finally:
        await db.close()


@app.put("/api/judges/{judge_id}", response_model=JudgeResponse)
async def update_judge(judge_id: int, judge_update: JudgeUpdate):
    """Update a judge."""
    db = await get_db()
    try:
        # Get existing judge
        cursor = await db.execute("SELECT * FROM judges WHERE id = ?", (judge_id,))
        row = await cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Judge not found")
        
        # Build update query
        updates = []
        params = []
        
        if judge_update.name is not None:
            updates.append("name = ?")
            params.append(judge_update.name)
        if judge_update.system_prompt is not None:
            updates.append("system_prompt = ?")
            params.append(judge_update.system_prompt)
        if judge_update.model_name is not None:
            updates.append("model_name = ?")
            params.append(judge_update.model_name)
        if judge_update.active is not None:
            updates.append("active = ?")
            params.append(judge_update.active)
        
        if updates:
            params.append(judge_id)
            await db.execute(
                f"UPDATE judges SET {', '.join(updates)} WHERE id = ?",
                params
            )
            await db.commit()
        
        # If judge is being deactivated, remove all assignments
        if judge_update.active is not None and judge_update.active is False:
            await db.execute(
                "DELETE FROM judge_assignments WHERE judge_id = ?",
                (judge_id,)
            )
            await db.commit()
        
        # Return updated judge
        cursor = await db.execute("SELECT * FROM judges WHERE id = ?", (judge_id,))
        row = await cursor.fetchone()
        
        return JudgeResponse(
            id=row[0],
            name=row[1],
            system_prompt=row[2],
            model_name=row[3],
            active=bool(row[4]),
            created_at=row[5]
        )
    finally:
        await db.close()


@app.delete("/api/judges/{judge_id}")
async def delete_judge(judge_id: int):
    """Delete a judge."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM judges WHERE id = ?", (judge_id,))
        await db.commit()
        return {"message": "Judge deleted successfully"}
    finally:
        await db.close()


# ==================== Judge Assignments Endpoints ====================

@app.post("/api/assignments")
async def assign_judges(assignment: JudgeAssignment):
    """Assign judges to a question in a queue."""
    db = await get_db()
    try:
        # Delete existing assignments for this question in queue
        await db.execute(
            """DELETE FROM judge_assignments 
               WHERE queue_id = ? AND question_template_id = ?""",
            (assignment.queue_id, assignment.question_template_id)
        )
        
        # Insert new assignments
        created_at = datetime.now().isoformat()
        for judge_id in assignment.judge_ids:
            await db.execute(
                """INSERT INTO judge_assignments 
                   (queue_id, question_template_id, judge_id, created_at)
                   VALUES (?, ?, ?, ?)""",
                (assignment.queue_id, assignment.question_template_id, judge_id, created_at)
            )
        
        await db.commit()
        return {"message": "Judges assigned successfully"}
    finally:
        await db.close()


# ==================== Evaluations Endpoints ====================

@app.post("/api/evaluations/run", response_model=RunEvaluationResponse)
async def run_evaluations(request: RunEvaluationRequest):
    """Run AI judges on all submissions in a queue."""
    db = await get_db()
    planned = 0
    completed = 0
    failed = 0
    errors = []
    
    try:
        # Get all submissions in queue
        cursor = await db.execute(
            "SELECT id FROM submissions WHERE queue_id = ?",
            (request.queue_id,)
        )
        submission_rows = await cursor.fetchall()
        submission_ids = [row[0] for row in submission_rows]
        
        for sub_id in submission_ids:
            # Get questions for this submission
            cursor = await db.execute(
                """SELECT question_template_id, question_text, content 
                   FROM questions WHERE submission_id = ?""",
                (sub_id,)
            )
            question_rows = await cursor.fetchall()
            
            for q_row in question_rows:
                q_template_id = q_row[0]
                q_text = q_row[1]
                q_content = q_row[2]  # Per-question context (may be None)
                
                # Get assigned judges
                cursor = await db.execute(
                    """SELECT j.id, j.name, j.system_prompt, j.model_name
                       FROM judges j
                       JOIN judge_assignments ja ON j.id = ja.judge_id
                       WHERE ja.queue_id = ? AND ja.question_template_id = ?
                       AND j.active = 1""",
                    (request.queue_id, q_template_id)
                )
                judge_rows = await cursor.fetchall()
                
                # Get answer
                cursor = await db.execute(
                    """SELECT choice, reasoning FROM answers
                       WHERE submission_id = ? AND question_template_id = ?""",
                    (sub_id, q_template_id)
                )
                answer_row = await cursor.fetchone()
                
                if not answer_row:
                    continue
                
                answer_text = f"Choice: {answer_row[0]}"
                if answer_row[1]:
                    answer_text += f"\nReasoning: {answer_row[1]}"
                
                # Run each judge
                for judge_row in judge_rows:
                    planned += 1
                    judge_id = judge_row[0]
                    judge_name = judge_row[1]
                    system_prompt = judge_row[2]
                    model_name = judge_row[3]
                    
                    try:
                        # Build prompt with optional content context
                        context_section = ""
                        if q_content:
                            context_section = f"""
=== CONTEXT ===
The following is the source material that the question and answer refer to. You MUST use this context to verify the accuracy of the answer. Do not evaluate the answer in isolation — ground your judgment in the specific details provided here.

{q_content}

"""
                        
                        prompt = f"""{context_section}=== QUESTION BEING EVALUATED ===
{q_text}

=== HUMAN ANALYST'S ANSWER ===
{answer_text}

=== YOUR EVALUATION TASK ===
You are evaluating whether the human analyst's answer above is correct and well-reasoned. Analyze it against the following criteria:

1. **Factual Accuracy**: Does the chosen answer correctly reflect what is shown in the context? Are specific values, thresholds, and facts cited accurately?
2. **Reasoning Consistency**: Does the reasoning logically support the stated choice? If the reasoning contradicts the choice (e.g., the reasoning describes a violation but the choice says "compliant"), this is a FAIL regardless of whether either part is independently correct.
3. **Completeness**: Does the reasoning address the key factors relevant to the question, or does it overlook critical details present in the context?
4. **Domain Correctness**: Are domain-specific terms, standards, and thresholds applied correctly?

IMPORTANT RULES:
- A contradictory answer (where reasoning contradicts the choice) is always a FAIL.
- If the context provides specific data that clearly supports or refutes the answer, use it. Do not speculate beyond what is given.
- If there is insufficient context to make a determination, verdict should be INCONCLUSIVE.
- Be precise in your reasoning — cite specific values, thresholds, or code patterns from the context.

Respond in EXACTLY this format (three lines, no extra text):
VERDICT: pass|fail|inconclusive
REASONING: [Your detailed explanation citing specific evidence from the context]
CONFIDENCE: [0-100, where 100 means absolute certainty in your verdict]"""
                        
                        # Call Ollama
                        response = await ollama_client.generate(
                            model=model_name,
                            prompt=prompt,
                            system=system_prompt
                        )
                        
                        # Parse verdict
                        verdict, reasoning, confidence = parse_verdict(response)
                        
                        # Store evaluation
                        created_at = datetime.now().isoformat()
                        await db.execute(
                            """INSERT INTO evaluations 
                               (submission_id, question_template_id, judge_id, verdict, reasoning, confidence_score, created_at)
                               VALUES (?, ?, ?, ?, ?, ?, ?)""",
                            (sub_id, q_template_id, judge_id, verdict, reasoning, confidence, created_at)
                        )
                        await db.commit()
                        completed += 1
                        
                    except httpx.HTTPError as e:
                        failed += 1
                        error_msg = f"HTTP error for judge '{judge_name}': {str(e)}"
                        errors.append(error_msg)
                    except Exception as e:
                        failed += 1
                        error_msg = f"Error running judge '{judge_name}': {str(e)}"
                        errors.append(error_msg)
        
        return RunEvaluationResponse(
            planned=planned,
            completed=completed,
            failed=failed,
            errors=errors[:10]  # Limit error messages
        )
    finally:
        await db.close()


@app.get("/api/evaluations", response_model=List[EvaluationResponse])
async def get_evaluations(
    judge_ids: Optional[str] = Query(None),
    question_ids: Optional[str] = Query(None),
    verdict: Optional[str] = Query(None)
):
    """Get evaluations with optional filters."""
    db = await get_db()
    try:
        query = """
            SELECT e.id, e.submission_id, e.question_template_id, e.judge_id,
                   j.name as judge_name, e.verdict, e.reasoning, e.confidence_score,
                   e.created_at, q.question_text, a.choice, a.reasoning
            FROM evaluations e
            JOIN judges j ON e.judge_id = j.id
            LEFT JOIN questions q ON e.submission_id = q.submission_id 
                                 AND e.question_template_id = q.question_template_id
            LEFT JOIN answers a ON e.submission_id = a.submission_id
                                AND e.question_template_id = a.question_template_id
            WHERE 1=1
        """
        params = []
        
        if judge_ids:
            ids = [int(id.strip()) for id in judge_ids.split(',')]
            placeholders = ','.join('?' * len(ids))
            query += f" AND e.judge_id IN ({placeholders})"
            params.extend(ids)
        
        if question_ids:
            ids = [id.strip() for id in question_ids.split(',')]
            placeholders = ','.join('?' * len(ids))
            query += f" AND e.question_template_id IN ({placeholders})"
            params.extend(ids)
        
        if verdict:
            query += " AND e.verdict = ?"
            params.append(verdict)
        
        query += " ORDER BY e.created_at DESC LIMIT 1000"
        
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        
        return [
            EvaluationResponse(
                id=row[0],
                submission_id=row[1],
                question_template_id=row[2],
                judge_id=row[3],
                judge_name=row[4],
                verdict=row[5],
                reasoning=row[6],
                confidence_score=row[7],
                created_at=row[8],
                question_text=row[9],
                answer_choice=row[10],
                answer_reasoning=row[11]
            )
            for row in rows
        ]
    finally:
        await db.close()


@app.get("/api/evaluations/stats", response_model=EvaluationStats)
async def get_evaluation_stats(
    judge_ids: Optional[str] = Query(None),
    question_ids: Optional[str] = Query(None),
    verdict: Optional[str] = Query(None)
):
    """Get evaluation statistics with optional filters."""
    db = await get_db()
    try:
        query = """
            SELECT verdict, COUNT(*) as count
            FROM evaluations
            WHERE 1=1
        """
        params = []
        
        if judge_ids:
            ids = [int(id.strip()) for id in judge_ids.split(',')]
            placeholders = ','.join('?' * len(ids))
            query += f" AND judge_id IN ({placeholders})"
            params.extend(ids)
        
        if question_ids:
            ids = [id.strip() for id in question_ids.split(',')]
            placeholders = ','.join('?' * len(ids))
            query += f" AND question_template_id IN ({placeholders})"
            params.extend(ids)
        
        if verdict:
            query += " AND verdict = ?"
            params.append(verdict)
        
        query += " GROUP BY verdict"
        
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        
        stats = {"pass": 0, "fail": 0, "inconclusive": 0}
        for row in rows:
            stats[row[0]] = row[1]
        
        total = sum(stats.values())
        pass_rate = (stats["pass"] / total * 100) if total > 0 else 0.0
        
        # Calculate average confidence
        avg_query = "SELECT AVG(confidence_score) FROM evaluations WHERE 1=1"
        avg_params = []
        if judge_ids:
            ids = [int(id.strip()) for id in judge_ids.split(',')]
            placeholders = ','.join('?' * len(ids))
            avg_query += f" AND judge_id IN ({placeholders})"
            avg_params.extend(ids)
        if question_ids:
            ids = [id.strip() for id in question_ids.split(',')]
            placeholders = ','.join('?' * len(ids))
            avg_query += f" AND question_template_id IN ({placeholders})"
            avg_params.extend(ids)
        if verdict:
            avg_query += " AND verdict = ?"
            avg_params.append(verdict)
        
        avg_cursor = await db.execute(avg_query, avg_params)
        avg_row = await avg_cursor.fetchone()
        avg_confidence = round(float(avg_row[0]), 1) if avg_row and avg_row[0] is not None else 50.0
        
        return EvaluationStats(
            total=total,
            pass_count=stats["pass"],
            fail_count=stats["fail"],
            inconclusive_count=stats["inconclusive"],
            pass_rate=round(pass_rate, 2),
            avg_confidence=avg_confidence
        )
    finally:
        await db.close()


@app.get("/api/evaluations/stats/by-queue")
async def get_queue_stats():
    """Get evaluation statistics grouped by queue and judge."""
    db = await get_db()
    try:
        # Get stats by queue and judge
        query = """
            SELECT 
                s.queue_id,
                e.judge_id,
                j.name as judge_name,
                e.verdict,
                COUNT(*) as count
            FROM evaluations e
            JOIN judges j ON e.judge_id = j.id
            JOIN submissions s ON e.submission_id = s.id
            GROUP BY s.queue_id, e.judge_id, j.name, e.verdict
            ORDER BY s.queue_id, e.judge_id, e.verdict
        """
        
        cursor = await db.execute(query)
        rows = await cursor.fetchall()
        
        # Organize data by queue
        queue_stats = {}
        for row in rows:
            queue_id, judge_id, judge_name, verdict, count = row
            
            if queue_id not in queue_stats:
                queue_stats[queue_id] = {}
            
            if judge_id not in queue_stats[queue_id]:
                queue_stats[queue_id][judge_id] = {
                    'judge_id': judge_id,
                    'judge_name': judge_name,
                    'pass': 0,
                    'fail': 0,
                    'inconclusive': 0,
                    'total': 0
                }
            
            queue_stats[queue_id][judge_id][verdict] = count
            queue_stats[queue_id][judge_id]['total'] += count
        
        # Calculate pass rates
        result = {}
        for queue_id, judges in queue_stats.items():
            result[queue_id] = []
            for judge_data in judges.values():
                total = judge_data['total']
                pass_rate = (judge_data['pass'] / total * 100) if total > 0 else 0
                result[queue_id].append({
                    'judge_id': judge_data['judge_id'],
                    'judge_name': judge_data['judge_name'],
                    'pass': judge_data['pass'],
                    'fail': judge_data['fail'],
                    'inconclusive': judge_data['inconclusive'],
                    'total': total,
                    'pass_rate': round(pass_rate, 2)
                })
        
        return result
    finally:
        await db.close()


# ==================== Ollama Endpoints ====================

@app.get("/api/ollama/models")
async def get_ollama_models():
    """Get available Ollama models."""
    try:
        models = await ollama_client.list_models()
        return {"models": [m.get("name", "") for m in models]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama not available: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


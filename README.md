# GavelAI - Automated Submission Evaluation System

A full-stack web application that uses AI to automatically evaluate human-annotated answers using configurable AI judges powered by local LLMs via Ollama.

## Overview

GavelAI provides an automated evaluation system for assessing student answers, quiz responses, or any human-annotated submissions. The system allows you to create multiple AI judges with custom evaluation criteria, assign them to specific questions, and run batch evaluations across submissions. Results are stored and can be analyzed through a comprehensive dashboard with filtering and statistics.

## Problem Statement

Manually evaluating large volumes of student answers or submissions is:
- **Time-consuming**: Requires significant human effort for each submission
- **Inconsistent**: Different evaluators may apply different standards
- **Not scalable**: Difficult to handle large batches efficiently
- **Expensive**: Requires dedicated human evaluators

## Why This Project Exists

This project was created to provide:
- **Automated evaluation** using AI judges that can be configured with custom evaluation criteria
- **Local execution** via Ollama, ensuring privacy and eliminating API costs
- **Flexibility** to create multiple judges with different evaluation styles (strict, lenient, domain-specific)
- **Scalability** to handle large batches of submissions efficiently
- **Transparency** with detailed reasoning for each evaluation decision

## Technology Stack

- **Frontend**: Vite + React 18 + TypeScript
- **Backend**: FastAPI + Python
- **Database**: SQLite (persistent, file-based)
- **LLM Integration**: Ollama (local, no API keys required)

## Prerequisites

1. **Python 3.8+** installed
2. **Node.js 18+** and npm installed
3. **Ollama** installed and running
   ```bash
   # Install Ollama from https://ollama.ai
   # Pull a model (e.g., llama2)
   ollama pull llama2
   ```

## Installation & Setup

### Backend Setup

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python main.py
```

Backend will start on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

Frontend will start on `http://localhost:5173`

### Verify Ollama is Running

```bash
# Check if Ollama is accessible
curl http://localhost:11434/api/tags
```

## Usage

1. **Upload Submissions**: Navigate to the Upload Data page and upload a JSON file with submissions (see `sample_input.json` for format)

2. **Create AI Judges**: Go to the Judges page and create judges with custom system prompts and model selection

3. **Assign Judges**: On the Assignments page, assign judges to specific questions within queues

4. **Run Evaluations**: Execute AI judges on all submissions in a queue

5. **View Results**: Analyze evaluation results with filtering, statistics, and detailed reasoning

## Database Schema

```
submissions (id, queue_id, labeling_task_id, created_at, raw_data)
questions (id, submission_id, question_template_id, question_type, question_text, rev)
answers (id, submission_id, question_template_id, choice, reasoning)
judges (id, name, system_prompt, model_name, active, created_at)
judge_assignments (id, queue_id, question_template_id, judge_id, created_at)
evaluations (id, submission_id, question_template_id, judge_id, verdict, reasoning, created_at)
```

## API Endpoints

**Submissions**
- `POST /api/submissions/upload` - Upload JSON file
- `GET /api/queues` - List all queues
- `GET /api/queues/{id}/questions` - Get questions in queue

**Judges**
- `GET /api/judges` - List all judges
- `POST /api/judges` - Create judge
- `PUT /api/judges/{id}` - Update judge
- `DELETE /api/judges/{id}` - Delete judge

**Assignments**
- `POST /api/assignments` - Assign judges to question

**Evaluations**
- `POST /api/evaluations/run` - Run AI judges on queue
- `GET /api/evaluations` - Get evaluations (with filters)
- `GET /api/evaluations/stats` - Get aggregate statistics

**Ollama**
- `GET /api/ollama/models` - List available models

## Notes

- **First Run**: May be slow as Ollama loads the model into memory
- **Model Size**: Larger models (70B) require significant RAM
- **Recommended Models**: llama2, mistral, phi (smaller, faster)
- **Database Location**: `backend/ai_judge.db` (can be deleted to reset)

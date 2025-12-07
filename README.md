# AI Judge - Automated Submission Evaluation System

A full-stack web application that uses AI to automatically evaluate human-annotated answers using configurable AI judges powered by local LLMs via Ollama.

## 🚀 Quick Start

### Prerequisites

1. **Python 3.8+** installed
2. **Node.js 18+** and npm installed
3. **Ollama** installed and running
   ```bash
   # Install Ollama from https://ollama.ai
   # Pull a model (e.g., llama2)
   ollama pull llama2
   ```

### Installation & Setup

#### 1. Backend Setup

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

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

Frontend will start on `http://localhost:5173`

### 3. Verify Ollama is Running

```bash
# Check if Ollama is accessible
curl http://localhost:11434/api/tags
```

## 📖 Usage Guide

### Step 1: Upload Submissions

1. Navigate to **Upload Data** page
2. Upload a JSON file with submissions (see `sample_input.json` for format)
3. Data is persisted to SQLite database

### Step 2: Create AI Judges

1. Go to **Judges** page
2. Click **+ New Judge**
3. Configure:
   - **Name**: Descriptive name (e.g., "Strict Evaluator")
   - **Model**: Select from available Ollama models
   - **System Prompt**: Instructions for evaluation (must output `VERDICT:` and `REASONING:`)
   - **Active**: Enable/disable judge

### Step 3: Assign Judges to Questions

1. Go to **Assignments** page
2. Select a queue
3. For each question, check which judges should evaluate it
4. Assignments are saved automatically

### Step 4: Run Evaluations

1. On **Assignments** page, click **▶️ Run AI Judges**
2. The system will:
   - Iterate through all submissions in the queue
   - Call Ollama for each (question × assigned judge) pair
   - Parse verdicts (pass/fail/inconclusive) and reasoning
   - Store results in database

### Step 5: View Results

1. Go to **Results** page
2. View aggregate statistics (pass rate, counts)
3. Filter by:
   - Judge (multi-select)
   - Question (multi-select)
   - Verdict (pass/fail/inconclusive)
4. See detailed evaluation table with reasoning

## 🏗️ Architecture & Design Decisions

### Technology Stack

- **Frontend**: Vite + React 18 + TypeScript
- **Backend**: FastAPI + Python
- **Database**: SQLite (persistent, file-based)
- **LLM Integration**: Ollama (local, no API keys required)

### Key Design Decisions

#### 1. **SQLite for Persistence**
- **Why**: Lightweight, zero-config, file-based database perfect for this use case
- **Trade-off**: Not suitable for high-concurrency production (would use PostgreSQL)
- **Benefit**: Simple setup, no external database service needed

#### 2. **Ollama for LLM Integration**
- **Why**: Local execution, no API costs, easy setup, supports multiple models
- **Trade-off**: Requires local installation and model downloads
- **Benefit**: Complete privacy, no rate limits, cost-effective

#### 3. **Judge Assignment Schema**
- **Design**: Many-to-many relationship between judges and question templates
- **Level**: Assignments at queue + question_template level (not per submission)
- **Why**: Same question appears across submissions - assign once, apply to all
- **Benefit**: Efficient, scalable, easy to manage

#### 4. **Component Structure**
- **Pattern**: Page components + reusable form components
- **Pages**: Upload, Judges, Assignments, Results
- **Why**: Clear separation of concerns, easy to maintain
- **TypeScript**: Strong types throughout, minimal `any` usage

#### 5. **Error Handling**
- **Backend**: Try-catch with proper HTTP status codes
- **Frontend**: User-friendly error messages, loading states
- **LLM Calls**: Graceful degradation with error tracking
- **Why**: Robust system that handles timeouts, network issues, API failures

#### 6. **UX Considerations**
- **Loading States**: Spinners during async operations
- **Empty States**: Helpful messages when no data exists
- **Optimistic Updates**: Immediate UI feedback for assignments
- **Success Messages**: Clear confirmation of actions
- **Filters**: Multi-select with auto-refresh

### Database Schema

```
submissions (id, queue_id, labeling_task_id, created_at, raw_data)
questions (id, submission_id, question_template_id, question_type, question_text, rev)
answers (id, submission_id, question_template_id, choice, reasoning)
judges (id, name, system_prompt, model_name, active, created_at)
judge_assignments (id, queue_id, question_template_id, judge_id, created_at)
evaluations (id, submission_id, question_template_id, judge_id, verdict, reasoning, created_at)
```

### API Endpoints

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

## 🎯 Features Implemented

✅ **Data Ingestion**
- JSON file upload with validation
- Persistent storage in SQLite
- Support for multiple queues

✅ **Judge Management**
- Full CRUD operations
- Active/inactive status
- Custom system prompts
- Model selection

✅ **Judge Assignments**
- Queue-level assignment UI
- Multiple judges per question
- Real-time updates

✅ **Evaluation Engine**
- Real Ollama API integration
- Parallel evaluation execution
- Error handling & reporting
- Progress tracking

✅ **Results Dashboard**
- Aggregate statistics (pass rate)
- Multi-filter support
- Detailed evaluation table
- Verdict badges

✅ **Code Quality**
- TypeScript with strong types
- Idiomatic React patterns
- Small, focused components
- Clear naming conventions

✅ **UX Polish**
- Loading spinners
- Empty states
- Error messages
- Success feedback
- Responsive layout

## 📊 Sample Data

A sample JSON file (`sample_input.json`) is provided with:
- 3 submissions across 2 queues
- 3 different question templates
- Mix of correct and incorrect answers

## 🔧 Troubleshooting

### Ollama Connection Issues
```bash
# Ensure Ollama is running
ollama serve

# Verify models are available
ollama list
```

### Backend Port Issues
If port 8000 is in use, modify `main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=8001)  # Change port
```

### Frontend Port Issues
If port 5173 is in use, Vite will automatically try 5174.

## 🎬 Demo Flow

1. Start backend and frontend servers
2. Upload `sample_input.json`
3. Create 2 judges with different prompts (e.g., "Strict" and "Lenient")
4. Assign both judges to questions in queue_1
5. Run evaluations
6. View results with filters

## 📝 Notes

- **First Run**: May be slow as Ollama loads the model into memory
- **Model Size**: Larger models (70B) require significant RAM
- **Recommended Models**: llama2, mistral, phi (smaller, faster)
- **Database Location**: `backend/ai_judge.db` (can be deleted to reset)

## 🚧 Future Enhancements (Out of Scope)

- Batch evaluation with progress bar
- Evaluation history and versioning
- Judge performance analytics
- Export results to CSV
- Real-time WebSocket updates
- Multi-user authentication
- Cloud deployment configuration

## 📄 License

This project is for evaluation purposes.


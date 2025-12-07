# 🚀 AI Judge - Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:

- [ ] **Python 3.8+** - Run: `python3 --version`
- [ ] **Node.js 18+** - Run: `node --version`
- [ ] **Ollama** - Run: `ollama --version`

## Step-by-Step Setup (5 minutes)

### 1. Install Ollama (if not installed)

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Or download from https://ollama.ai
```

### 2. Pull an Ollama Model

```bash
# Start Ollama service
ollama serve

# In a new terminal, pull a model (choose one):
ollama pull llama2        # Recommended: ~4GB, good balance
ollama pull mistral       # Alternative: ~4GB, fast
ollama pull phi          # Lightweight: ~1.5GB, fastest
```

### 3. Start the Application

#### Option A: Automatic (Recommended)

```bash
cd /Users/adish/AI_Judge
chmod +x start.sh
./start.sh
```

#### Option B: Manual

**Terminal 1 - Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the Application

Visit: **http://localhost:5173**

## 🎯 Quick Demo (2 minutes)

Follow these steps to see the complete workflow:

### 1. Upload Sample Data
- Click **"📤 Upload Data"** in sidebar
- Upload the `sample_input.json` file
- Wait for success message

### 2. Create an AI Judge
- Click **"👨‍⚖️ Judges"** in sidebar
- Click **"+ New Judge"**
- Fill in:
  - **Name**: `Strict Evaluator`
  - **Model**: Select `llama2` (or whichever you pulled)
  - **System Prompt**: (default is pre-filled - keep it)
  - **Active**: ✅ Checked
- Click **"Create Judge"**

### 3. Assign Judge to Questions
- Click **"🔗 Assignments"** in sidebar
- Select **queue_1** from dropdown
- For each question, check the box next to **"Strict Evaluator"**
- Assignments save automatically (watch for success message)

### 4. Run Evaluations
- Still on Assignments page
- Click **"▶️ Run AI Judges"** button
- Confirm the dialog
- Wait for completion (may take 30-60 seconds for first run as model loads)
- You'll see: "Successfully completed X evaluations!"

### 5. View Results
- Click **"📊 Results"** in sidebar
- See aggregate statistics:
  - Total evaluations
  - Pass rate
  - Pass/Fail/Inconclusive counts
- Scroll down to see detailed evaluation table
- Try using filters:
  - Filter by Judge
  - Filter by Question
  - Filter by Verdict (Pass/Fail/Inconclusive)

## 🎨 Sample Judge Prompts

Try creating multiple judges with different personalities:

### Strict Judge
```
You are a strict evaluator. Only mark answers as "pass" if they are completely accurate.
Be critical and look for any inaccuracies.

Respond in the following format:
VERDICT: pass|fail|inconclusive
REASONING: Brief explanation of your decision
```

### Lenient Judge
```
You are a lenient evaluator. Mark answers as "pass" if they show general understanding,
even if not 100% accurate. Give the benefit of the doubt.

Respond in the following format:
VERDICT: pass|fail|inconclusive
REASONING: Brief explanation of your decision
```

### Technical Judge
```
You are a technical expert evaluator. Evaluate answers based on technical accuracy,
precision, and completeness. Consider edge cases.

Respond in the following format:
VERDICT: pass|fail|inconclusive
REASONING: Brief explanation of your decision
```

## 🔍 Troubleshooting

### "Ollama not available" error

**Problem**: Backend can't connect to Ollama

**Solution**:
```bash
# Make sure Ollama is running
ollama serve

# In another terminal, verify it works:
curl http://localhost:11434/api/tags

# Should return list of models
```

### "No models available" in dropdown

**Problem**: No Ollama models pulled yet

**Solution**:
```bash
ollama pull llama2
# Wait for download to complete, then refresh page
```

### Port already in use

**Backend (8000)**:
```bash
# Find what's using port 8000
lsof -ti:8000 | xargs kill

# Or change port in backend/main.py (last line)
```

**Frontend (5173)**:
- Vite will automatically try 5174, 5175, etc.
- Or set in `frontend/vite.config.ts`

### Slow evaluations

**Cause**: Large model + first run loads model into memory

**Solutions**:
- First evaluation is always slower (model loading)
- Use smaller models: `phi` or `mistral`
- Ensure adequate RAM (8GB+ recommended)

### Import errors in backend

```bash
cd backend
source venv/bin/activate  # Make sure venv is activated
pip install -r requirements.txt --upgrade
```

### Module not found in frontend

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📊 Understanding the Results

### Verdict Types

- **Pass** 🟢: Answer is correct/acceptable
- **Fail** 🔴: Answer is incorrect/unacceptable  
- **Inconclusive** 🟡: Cannot determine or ambiguous

### Pass Rate Calculation

```
Pass Rate = (Pass Count / Total Evaluations) × 100%
```

Example: 15 pass, 5 fail, 0 inconclusive = 75% pass rate

## 🎓 Advanced Usage

### Multiple Judges on Same Question

Assign 2+ judges to the same question to get:
- Multiple perspectives
- Judge agreement analysis
- Consensus building

### Custom JSON Format

Your JSON must match this structure:
```json
[
  {
    "id": "unique_submission_id",
    "queueId": "queue_identifier",
    "labelingTaskId": "task_id",
    "createdAt": 1690000000000,
    "questions": [
      {
        "rev": 1,
        "data": {
          "id": "question_template_id",
          "questionType": "type",
          "questionText": "The question?"
        }
      }
    ],
    "answers": {
      "question_template_id": {
        "choice": "answer",
        "reasoning": "explanation"
      }
    }
  }
]
```

### Deactivating Judges

- Edit a judge and uncheck "Active"
- Deactivated judges won't run in evaluations
- Useful for A/B testing different prompts

### Filtering Results

Combine multiple filters:
1. Select 2 judges
2. Select 1 question
3. Select "pass" verdict
→ See only passing evaluations from those 2 judges on that question

## 🎬 Video Demo

*Create a Loom recording showing:*
1. Starting the app
2. Uploading sample_input.json
3. Creating a judge
4. Assigning judges to questions
5. Running evaluations
6. Viewing filtered results

## 🆘 Need Help?

- Check `README.md` for architecture details
- View backend API docs: http://localhost:8000/docs
- Check Ollama docs: https://ollama.ai
- Verify Ollama models: `ollama list`

## ✅ Success Criteria

You should be able to:
- [x] Upload JSON submissions
- [x] Create/edit/delete AI judges
- [x] Assign judges to questions
- [x] Run evaluations (real Ollama calls)
- [x] View results with statistics
- [x] Filter results by judge/question/verdict
- [x] See pass rate calculation

---

**Enjoy using AI Judge! ⚖️**


#!/bin/bash

# GavelAI - Start Script
# This script starts both backend and frontend servers

echo "🚀 Starting GavelAI Application..."
echo ""

# Check if Ollama is running
echo "Checking Ollama..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "⚠️  Warning: Ollama doesn't seem to be running on localhost:11434"
    echo "   Please start Ollama with: ollama serve"
    echo ""
fi

# Start backend
echo "Starting Backend (FastAPI)..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

python main.py &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) on http://localhost:8000"
cd ..

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 3

# Start frontend
echo "Starting Frontend (Vite + React)..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID) on http://localhost:5173"
cd ..

echo ""
echo "✨ GavelAI is ready!"
echo ""
echo "📝 Access the application at: http://localhost:5173"
echo "📡 Backend API at: http://localhost:8000"
echo "📚 API docs at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers..."
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait


#!/bin/bash

# Backend Start Script

echo "Starting AI Judge Backend..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py


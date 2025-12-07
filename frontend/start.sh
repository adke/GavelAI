#!/bin/bash

# Frontend Start Script

echo "Starting AI Judge Frontend..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the dev server
npm run dev


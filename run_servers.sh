#!/bin/bash

# Project Root Directory
PROJECT_ROOT="/home/sypark/1.Developement/1-mind/abuse"

echo "=========================================="
echo "Stopping existing servers..."
echo "=========================================="

# Kill Backend (python main.py)
# Using simple pgrep/pkill. 
if pgrep -f "python main.py" > /dev/null; then
    echo "Found backend process. Killing..."
    pkill -f "python main.py"
else
    echo "No backend process found."
fi

# Kill Frontend (vite)
if pgrep -f "vite" > /dev/null; then
    echo "Found frontend process. Killing..."
    pkill -f "vite"
else
    echo "No frontend process found."
fi

# Wait for ports to be freed
sleep 2

echo "=========================================="
echo "Starting Backend..."
echo "=========================================="
cd "$PROJECT_ROOT/backend"
# Activate environment if needed, but assuming python is in path or using system python as per previous ps aux
# Previous ps aux showed: python main.py
# If conda is needed, we might rely on the user running this in the activation or add activation here.
# Given the user context often implies specific envs, but here 'python main.py' was running as root previously? 
# I will use 'python' assuming the shell running this has the right python.
export CORS_ORIGINS="http://localhost:3001,http://192.168.0.188:3001"
nohup /home/sypark/anaconda3/bin/python main.py > "$PROJECT_ROOT/backend_debug.log" 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"
echo "Logs: $PROJECT_ROOT/backend_debug.log"

echo "=========================================="
echo "Starting Frontend..."
echo "=========================================="
cd "$PROJECT_ROOT/frontend"
nohup npm run dev > "$PROJECT_ROOT/frontend_debug.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"
echo "Logs: $PROJECT_ROOT/frontend_debug.log"

echo "=========================================="
echo "All done. Check logs if something doesn't work."

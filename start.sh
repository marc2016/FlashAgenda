#!/bin/bash

echo "⚡️ FlashAgenda Local Environment ⚡️"
echo "======================================"

# Start MongoDB in Docker
echo "📦 Starting MongoDB via Docker..."
# Try to run a new container; if it already exists, start the existing one
docker run -d -p 27017:27017 --name flashagenda-mongo mongo:latest 2>/dev/null || docker start flashagenda-mongo

echo "🚀 Starting Backend & Frontend..."

# Start backend in background
cd backend
npm install
npm run dev &
BACKEND_PID=$!
cd ..

# Start frontend in background
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

# Handle script exit (Ctrl+C)
trap "echo -e '\n🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; echo '✅ Stopped.'; exit" INT

echo "✅ All services started successfully!"
echo "➡️ Frontend: http://localhost:5173"
echo "➡️ Backend: http://localhost:3000"
echo "Press Ctrl+C to stop the servers."

# Wait for background processes so the script doesn't exit immediately
wait $BACKEND_PID $FRONTEND_PID

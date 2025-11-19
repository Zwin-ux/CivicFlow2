#!/bin/sh
# Start script for Railway deployment

# Start the Express API in the background
PORT=3001 node dist/index.js &
API_PID=$!

# Wait for API to be ready (optional, but good practice)
echo "Waiting for API to start..."
sleep 5

# Start the Next.js app
# Assuming we are in the root and apps/web/.next is available
cd apps/web
npm start &
WEB_PID=$!

# Handle shutdown
trap "kill $API_PID; kill $WEB_PID" SIGINT SIGTERM

# Wait for both processes
wait $API_PID $WEB_PID

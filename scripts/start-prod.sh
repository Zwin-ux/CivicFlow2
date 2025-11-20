#!/bin/sh
# Start script for Railway deployment

# Start the Express API in the background
PORT=3001 node dist/index.js &
API_PID=$!

# Wait for API to be ready (optional, but good practice)
echo "Waiting for API to start..."
sleep 5

# Start the Next.js app
# Using standalone mode
node apps/web/server.js &
WEB_PID=$!

# Handle shutdown
trap "kill $API_PID; kill $WEB_PID" SIGINT SIGTERM

# Wait for both processes
wait $API_PID $WEB_PID

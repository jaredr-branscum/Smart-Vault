#!/bin/bash
set -e

# Security/Scalability: Ensure database is ready before running migrations
# This is usually handled by docker-compose depends_on healthchecks, 
# but adding a small delay or check here is good practice.

echo "Starting migration orchestration..."
python migrate.py

echo "Migrations complete. Starting application..."
exec "$@"

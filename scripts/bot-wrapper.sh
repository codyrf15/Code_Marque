#!/bin/bash

# Bot wrapper script for PM2 with Docker group and environment loading
set -e

# Change to the project directory
cd "$(dirname "$0")/.."

# Function to load environment variables without sourcing
load_env() {
    if [ -f .env ]; then
        # Use grep and export to avoid sourcing issues with special characters
        export $(grep -v '^#' .env | grep -v '^$' | xargs)
    fi
}

# Load environment variables
load_env

# Run the bot
exec node "./src/index.js" 
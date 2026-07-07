#!/bin/bash

# AETHER Bot Start Script (for Railway)

echo "🌟 Starting AETHER Bot..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit .env and set your TELEGRAM_BOT_TOKEN"
    exit 1
fi

# Check if token is set
if grep -q "YOUR_TOKEN_HERE" .env; then
    echo "❌ TELEGRAM_BOT_TOKEN not set!"
    echo "Please edit .env and set your bot token from @BotFather"
    exit 1
fi

# Create data directory
mkdir -p data

# Start bot
echo "🚀 Starting bot..."
node bot.js

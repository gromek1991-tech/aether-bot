#!/data/data/com.termux/files/usr/bin/bash

# AETHER Bot Stop Script

echo "🛑 Zatrzymywanie AETHER..."

# Kill node processes
pkill -f "node bot.js" 2>/dev/null
pkill -f "node dashboard.js" 2>/dev/null

echo "✅ AETHER zatrzymany."
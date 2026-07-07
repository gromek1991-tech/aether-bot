#!/data/data/com.termux/files/usr/bin/bash

# AETHER Bot Test Script

echo "🧪 Testing AETHER Bot..."
echo ""

# Test 1: Check bot process
echo "1. Checking bot process..."
if pgrep -f "node bot.js" > /dev/null; then
    echo "   ✅ Bot is running"
else
    echo "   ❌ Bot is not running"
    exit 1
fi

# Test 2: Check dashboard process
echo "2. Checking dashboard process..."
if pgrep -f "node dashboard.js" > /dev/null; then
    echo "   ✅ Dashboard is running"
else
    echo "   ❌ Dashboard is not running"
fi

# Test 3: Test dashboard API
echo "3. Testing dashboard API..."
STATS=$(curl -s http://localhost:3000/api/stats)
if echo "$STATS" | grep -q "users"; then
    echo "   ✅ Dashboard API working"
    echo "   📊 Stats: $STATS"
else
    echo "   ❌ Dashboard API not working"
fi

# Test 4: Test Telegram API connection
echo "4. Testing Telegram API connection..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot8997846562:AAEaockXk3JtSQTHHCbedJz9c8-UlKzmkfA/getMe")
if echo "$BOT_INFO" | grep -q "ok"; then
    echo "   ✅ Telegram API connected"
    echo "   🤖 Bot: $(echo $BOT_INFO | grep -o '"username":"[^"]*"' | cut -d'"' -f4)"
else
    echo "   ❌ Telegram API connection failed"
fi

# Test 5: Check bot log for errors
echo "5. Checking bot log..."
if grep -q "EFATAL" /data/data/com.termux/files/home/aether-bot/bot.log; then
    echo "   ⚠️ Bot had EFATAL errors (may be temporary)"
else
    echo "   ✅ No critical errors in bot log"
fi

# Test 6: Check database
echo "6. Checking database..."
if [ -f /data/data/com.termux/files/home/aether-bot/data/aether.db ]; then
    echo "   ✅ Database file exists"
else
    echo "   ⚠️ Database file not found (will be created on first use)"
fi

echo ""
echo "🧪 Test complete!"
echo ""
echo "📌 To test bot commands:"
echo "   1. Open Telegram"
echo "   2. Find: @AETHERBOT1000_bot"
echo "   3. Send: /start"
echo ""
echo "📌 Dashboard: http://localhost:3000"

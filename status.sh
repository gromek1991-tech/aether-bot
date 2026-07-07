#!/data/data/com.termux/files/usr/bin/bash

# AETHER Bot Status Script

echo "📊 AETHER Status"
echo "================"

# Check if bot is running
if pgrep -f "node bot.js" > /dev/null; then
    echo "🤖 Bot: ✅ Aktywny"
else
    echo "🤖 Bot: ❌ Nieaktywny"
fi

# Check if dashboard is running
if pgrep -f "node dashboard.js" > /dev/null; then
    echo "🌐 Dashboard: ✅ Aktywny (http://localhost:3000)"
else
    echo "🌐 Dashboard: ❌ Nieaktywny"
fi

# Check database
if [ -f data/aether.db ]; then
    SIZE=$(stat -f%z data/aether.db 2>/dev/null || stat -c%s data/aether.db 2>/dev/null)
    echo "🗄️ Baza danych: ✅ ($SIZE bytes)"
else
    echo "🗄️ Baza danych: ❌ Nie istnieje"
fi

# Check token
if grep -q "YOUR_TOKEN_HERE" .env 2>/dev/null; then
    echo "🔑 Token: ❌ Nie skonfigurowany"
else
    echo "🔑 Token: ✅ Skonfigurowany"
fi

echo ""
echo "Komendy:"
echo "  ./start.sh  - Uruchom"
echo "  ./stop.sh   - Zatrzymaj"
echo "  ./status.sh - Status"
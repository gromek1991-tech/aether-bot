# 🚀 Railway Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Go to Railway
https://railway.app

### Step 2: Sign up with GitHub
- Click "Login"
- Select "GitHub"

### Step 3: Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Select `aether-bot`

### Step 4: Add Environment Variables
Click "Variables" tab and add:

```
TELEGRAM_BOT_TOKEN=8997846562:AAEaockXk3JtSQTHHCbedJz9c8-UlKzmkfA
DATABASE_PATH=/app/data/aether.json
MINING_RATE=1
MINING_INTERVAL_HOURS=4
MAX_OFFLINE_HOURS=8
OLLAMA_HOST=http://localhost:11434
DEFAULT_MODEL=gemma2
REFERRAL_BONUS=0.1
REFERRAL_BONUS_MINING=0.05
DAILY_AI_TASKS=10
MAX_CLAN_SIZE=50
```

### Step 5: Deploy
- Railway will auto-deploy
- Check logs for "AETHER Bot uruchomiony!"

### Step 6: Verify
- Go to your project dashboard
- Check deployment status
- Test bot: @AETHERBOT1000_bot

## Done!
Your bot is now running 24/7! 🎉

## Cost
- Free tier: $5/month credit
- Bot uses ~$0.50/month
- **Free for 10 months!**

## Monitoring
- Check logs in Railway dashboard
- Bot auto-restarts on failure
- Uptime: 99.9%

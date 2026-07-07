# 🚀 Deploy AETHER Bot to Railway

## Quick Deploy (5 minutes)

### Step 1: Push to GitHub
```bash
# Create GitHub repo
gh repo create aether-bot --public

# Push code
cd ~/aether-bot
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/aether-bot.git
git push -u origin main
```

### Step 2: Deploy to Railway
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Select your `aether-bot` repo
6. Railway will auto-detect Node.js

### Step 3: Set Environment Variables
In Railway dashboard, go to Variables tab and add:
```
TELEGRAM_BOT_TOKEN=8997846562:AAEaockXk3JtSQTHHCbedJz9c8-UlKzmkfA
DATABASE_PATH=/app/data/aether.json
MINING_RATE=1
MINING_INTERVAL_HOURS=4
MAX_OFFLINE_HOURS=8
```

### Step 4: Deploy
Railway will automatically deploy when you push to GitHub.

## Monitor
- Check logs in Railway dashboard
- Bot will auto-restart on failure
- Free tier: $5/month credit

## Cost
- Free tier covers ~24/7 bot operation
- If exceeded, costs ~$0.000463/minute

## Done!
Your bot is now running 24/7 on Railway! 🎉

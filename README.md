# 🌟 AETHER - AI Cryptocurrency Telegram Bot

Mine the Future of AI

## ⚡ Quick Start

```bash
cd ~/aether-bot
npm install
node bot.js
```

## 🎮 Features

### Mining System
- 4-hour mining cycles
- 1 AET/h base rate
- Boosters: 2x, 3x, 5x speed
- Staking: 10-50% APY

### Games
- **Tap-to-Earn** - Click to earn AET
- **Quiz** - 20 questions, earn AET
- **Lucky Spin** - Daily wheel
- **Daily Bonus** - 10-24 AET

### AI Integration
- Chat with AI (Ollama)
- AI Tasks: translate, summarize, analyze, generate
- Earn AET for completing tasks

### Social Features
- **Referral** - 0.1 AET per referral
- **Clans** - Join or create clans
- **Leaderboards** - Compete globally
- **Social Tasks** - Earn by completing tasks

### Marketplace
- Buy/sell boosters
- Trade pet skins
- Exchange badges

## 🌍 Languages

- 🇵🇱 Polski
- 🇬🇧 English
- 🇷🇺 Русский
- 🇪🇸 Español
- 🇩🇪 Deutsch

## 📊 Tokenomics

| Category | Amount | Share |
|----------|--------|-------|
| Mining Pool | 500M AET | 50% |
| Ecosystem | 200M AET | 20% |
| Team & Dev | 100M AET | 10% |
| Liquidity | 100M AET | 10% |
| Partners | 50M AET | 5% |
| Reserve | 50M AET | 5% |

## 📈 Pricing

### Mining
- Base Rate: 1 AET/h
- Max Offline: 8h
- Cooldown: 4h

### Boosters
- Speed 2x: 10 AET (4h)
- Speed 3x: 25 AET (2h)
- Speed 5x: 50 AET (1h)

### Staking
- Basic: 10 AET, 30 days, 10% APY
- Premium: 100 AET, 90 days, 25% APY
- Elite: 500 AET, 180 days, 50% APY

## 💰 Profitability

### Daily Earnings (Active User)
- Mining: 12 AET
- Taps: 10 AET
- Quiz: 15 AET
- AI Tasks: 3.5 AET
- Daily Bonus: 10 AET
- Lucky Spin: 10 AET
- **Total: ~60.5 AET/day**

## 🚀 Deployment

### Option 1: Railway (Recommended)
```bash
# Push to GitHub
git init && git add . && git commit -m "Initial"
gh repo create aether-bot --public --source=. --push

# Deploy on Railway
# https://railway.app
```

### Option 2: Local
```bash
npm install
node bot.js
```

## 📁 Project Structure

```
aether-bot/
├── bot.js              # Main bot
├── dashboard.js        # Web dashboard
├── ai/                 # AI integration
├── game/               # Games (tap, quiz, events)
├── mining/             # Mining system
├── social/             # Social features
├── i18n/               # 5 languages
├── database/           # JSON database
├── utils/              # Utilities
├── webapp/             # Telegram Mini App
└── data/               # Persistent data
```

## 🔧 Configuration

Create `.env` file:
```
TELEGRAM_BOT_TOKEN=your_token_here
DATABASE_PATH=./data/aether.json
MINING_RATE=1
MINING_INTERVAL_HOURS=4
MAX_OFFLINE_HOURS=8
```

## 📊 Status

- ✅ Bot: Running
- ✅ Code: 3,691 lines
- ✅ GitHub: https://github.com/gromek1991-tech/aether-bot
- ✅ Ready for deployment

## 📝 License

MIT

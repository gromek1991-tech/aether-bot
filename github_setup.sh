#!/bin/bash

# AETHER Bot - GitHub Setup Script

echo "🚀 Setting up GitHub repository..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git not installed. Run: pkg install git"
    exit 1
fi

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not installed. Run: pkg install gh"
    echo "Then run: gh auth login"
    exit 1
fi

# Initialize git
git init
git add .
git commit -m "Initial commit: AETHER Telegram Bot"

# Create GitHub repo
echo "📦 Creating GitHub repository..."
gh repo create aether-bot --public --source=. --push

echo "✅ GitHub repository created!"
echo "🔗 Repository URL: https://github.com/$(gh api user -q .login)/aether-bot"
echo ""
echo "📌 Next steps:"
echo "1. Go to https://railway.app"
echo "2. Sign up with GitHub"
echo "3. Click 'New Project' → 'Deploy from GitHub repo'"
echo "4. Select your aether-bot repo"
echo "5. Add environment variables (see DEPLOY.md)"
echo ""
echo "📖 Read DEPLOY.md for detailed instructions!"

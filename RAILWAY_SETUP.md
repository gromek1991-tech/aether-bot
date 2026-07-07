# 🚀 Railway Auto-Deploy Setup

## Tylko 2 kroki!

### KROK 1: Utwórz konto na Railway
1. Wejdź na: https://railway.app
2. Kliknij "Login" → "GitHub"
3. Zaloguj się

### KROK 2: Pobierz token API
1. Wejdź na: https://railway.app/account/tokens
2. Kliknij "Create Token"
3. Nazwij: "github-actions"
4. Skopiuj token

### KROK 3: Dodaj token do GitHub
1. Wejdź na: https://github.com/gromek1991-tech/aether-bot/settings/secrets/actions
2. Kliknij "New repository secret"
3. Nazwa: RAILWAY_TOKEN
4. Value: wklej skopiowany token
5. Kliknij "Add secret"

### KROK 4: Gotowe!
Po dodaniu tokena, GitHub Actions automatycznie wdroży bota po każdym pushu.

## Alternatywnie - ręczny deploy
Jeśli wolisz ręcznie:
1. Wejdź na https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Wybierz `aether-bot`
4. Dodaj zmienne z `railway.toml`
5. Deploy

## Linki
- GitHub: https://github.com/gromek1991-tech/aether-bot
- Railway: https://railway.app
- Bot: @AETHERBOT1000_bot

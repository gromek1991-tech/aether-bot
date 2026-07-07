// AETHER AI Assistant - No external dependencies
// Works without Ollama - uses built-in responses

const SYSTEM_PROMPTS = {
  assistant: `Jesteś AETHER AI - przyjaznym asystentem kryptowalutowym i AI.
Odpowiadasz po polsku. Jesteś ekspertem od:
- Kryptowalut i blockchain
- Sztucznej inteligencji
- Miningu i tradingu
Bądź zwięzły i pomocny.`,

  translator: `Jesteś profesjonalnym tłumaczem. Tłumacz teksty dokładnie, zachowując sens i styl oryginału.`,

  summarizer: `Twórz zwięzłe podsumowania tekstów. Wychwytuj kluczowe informacje.`,

  analyst: `Analizuj teksty pod kątem sentymentu, tematów i kluczowych informacji. Bądź obiektywny.`
};

// Simple AI responses (no external API needed)
const AI_RESPONSES = {
  greeting: [
    "Cześć! Jestem AETHER AI. Jak mogę pomóc?",
    "Witaj! Co chcesz wiedzieć o kryptowalutach?",
    "Hej! Pytaj o mining, AI, lub cokolwiek!"
  ],
  crypto: [
    "Bitcoin to pierwsza kryptowaluta, stworzona w 2009 roku.",
    "Ethereum umożliwia tworzenie smart kontraktów.",
    "Mining to proces weryfikacji transakcji w blockchain.",
    "DeFi to zdecentralizowane finanse - banki bez banków.",
    "NFT to unikalne tokeny reprezentujące cyfrowe aktywa."
  ],
  ai: [
    "AI to sztuczna inteligencja - maszyny uczące się z danych.",
    "Machine Learning pozwala komputerom uczyć się bez programowania.",
    "Neural networks naśladują ludzki mózg.",
    "GPT to model językowy trenowany na ogromnych zbiorach danych.",
    "Ollama to lokalny serwer AI - możesz uruchomić własne modele."
  ],
  mining: [
    "AETHER mining: 1 AET/h, co 4 godziny.",
    "Boostery przyspieszają mining: 2x, 3x, 5x.",
    "Staking daje pasywny dochód: 10-50% APY.",
    "Zapraszaj znajomych za bonus 0.1 AET!",
    "Używaj /daily po codzienny bonus!"
  ],
  default: [
    "Ciekawe pytanie! Sprawdź nasze komendy: /menu",
    "Nie jestem pewien, ale mogę pomóc z miningiem!",
    "Zapytaj o kryptowaluty, AI, lub nasz bot!",
    "Sprawdź /help aby zobaczyć wszystkie komendy.",
    "Jestem tu aby pomóc! O co chodzi?"
  ]
};

// Get random response from category
function getResponse(category) {
  const responses = AI_RESPONSES[category] || AI_RESPONSES.default;
  return responses[Math.floor(Math.random() * responses.length)];
}

// Detect category from user message
function detectCategory(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('cześć') || lower.includes('witaj') || lower.includes('hej') || lower.includes('hello')) {
    return 'greeting';
  }
  if (lower.includes('krypto') || lower.includes('bitcoin') || lower.includes('eth') || lower.includes('token') || lower.includes('coin')) {
    return 'crypto';
  }
  if (lower.includes('ai') || lower.includes('sztuczna') || lower.includes('inteligencj') || lower.includes('machine learning') || lower.includes('neural')) {
    return 'ai';
  }
  if (lower.includes('mining') || lower.includes('mine') || lower.includes('kop') || lower.includes('aet') || lower.includes('staking')) {
    return 'mining';
  }
  return 'default';
}

// Chat function (no external API)
export async function chat(messages, options = {}) {
  const lastMessage = messages[messages.length - 1];
  const userText = lastMessage?.content || '';
  
  const category = detectCategory(userText);
  return getResponse(category);
}

// Simple prompt
export async function prompt(text, options = {}) {
  return chat([{ role: 'user', content: text }], options);
}

// Available models (none needed)
export async function listModels() {
  return [
    { name: 'aether-ai', size: 'built-in' }
  ];
}

export { SYSTEM_PROMPTS };

// AETHER AI Assistant - Ollama + Built-in fallback

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gemma2';

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

// Built-in responses (fallback when Ollama unavailable)
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

// Check if Ollama is available
async function isOllamaAvailable() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Chat with Ollama
async function chatWithOllama(messages, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const systemPrompt = options.systemPrompt || SYSTEM_PROMPTS.assistant;

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || 'Nie udało się wygenerować odpowiedzi.';
}

// Built-in response
function getBuiltInResponse(text) {
  const lower = text.toLowerCase();

  if (lower.includes('cześć') || lower.includes('witaj') || lower.includes('hej') || lower.includes('hello')) {
    return getRandomResponse('greeting');
  }
  if (lower.includes('krypto') || lower.includes('bitcoin') || lower.includes('eth') || lower.includes('token')) {
    return getRandomResponse('crypto');
  }
  if (lower.includes('ai') || lower.includes('sztuczna') || lower.includes('inteligencj')) {
    return getRandomResponse('ai');
  }
  if (lower.includes('mining') || lower.includes('mine') || lower.includes('aet') || lower.includes('staking')) {
    return getRandomResponse('mining');
  }
  return getRandomResponse('default');
}

function getRandomResponse(category) {
  const responses = AI_RESPONSES[category] || AI_RESPONSES.default;
  return responses[Math.floor(Math.random() * responses.length)];
}

// Main chat function - tries Ollama first, falls back to built-in
export async function chat(messages, options = {}) {
  const lastMessage = messages[messages.length - 1];
  const userText = lastMessage?.content || '';

  // Try Ollama if available
  if (await isOllamaAvailable()) {
    try {
      return await chatWithOllama(messages, options);
    } catch (error) {
      console.error('Ollama error, using built-in:', error.message);
    }
  }

  // Fallback to built-in
  return getBuiltInResponse(userText);
}

// Simple prompt
export async function prompt(text, options = {}) {
  return chat([{ role: 'user', content: text }], options);
}

// List models
export async function listModels() {
  if (await isOllamaAvailable()) {
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      const data = await response.json();
      return data.models || [];
    } catch {
      return [{ name: 'aether-ai (built-in)', size: 'local' }];
    }
  }
  return [{ name: 'aether-ai (built-in)', size: 'local' }];
}

export { SYSTEM_PROMPTS, isOllamaAvailable };

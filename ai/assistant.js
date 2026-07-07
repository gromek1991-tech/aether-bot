const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gemma2';

// Chat with Ollama
export async function chat(messages, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const systemPrompt = options.systemPrompt || 'Jesteś AETHER AI - przyjaznym asystentem. Odpowiadasz po polsku, krótko i pomocnie.';

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  try {
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
  } catch (error) {
    console.error('Ollama chat error:', error);
    throw error;
  }
}

// Simple prompt
export async function prompt(text, options = {}) {
  return chat([{ role: 'user', content: text }], options);
}

// Available models
export async function listModels() {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Ollama list models error:', error);
    return [];
  }
}

// System prompts for different tasks
export const SYSTEM_PROMPTS = {
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
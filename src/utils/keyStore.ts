const STORAGE_PREFIX = 'ts_k_';

export function encodeKey(value: string): string {
  if (!value) return '';
  return btoa(encodeURIComponent(value));
}

export function decodeKey(encoded: string): string {
  if (!encoded) return '';
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    return encoded;
  }
}

export function getApiKey(provider: 'gemini' | 'nvidia' | 'groq' | 'openrouter'): string {
  // Try new encoded format first, fall back to old plaintext
  const encoded = localStorage.getItem(`${STORAGE_PREFIX}${provider}`);
  if (encoded) return decodeKey(encoded);

  // Legacy fallback
  const legacyMap: Record<string, string> = {
    gemini: 'geminiKey',
    nvidia: 'nvidiaKey',
    groq: 'groqKey',
    openrouter: 'openRouterKey',
  };
  return localStorage.getItem(legacyMap[provider]) || '';
}

export function setApiKey(provider: 'gemini' | 'nvidia' | 'groq' | 'openrouter', value: string): void {
  if (!value) {
    localStorage.removeItem(`${STORAGE_PREFIX}${provider}`);
  } else {
    localStorage.setItem(`${STORAGE_PREFIX}${provider}`, encodeKey(value));
  }
  // Clear legacy plaintext key
  const legacyMap: Record<string, string> = {
    gemini: 'geminiKey',
    nvidia: 'nvidiaKey',
    groq: 'groqKey',
    openrouter: 'openRouterKey',
  };
  localStorage.removeItem(legacyMap[provider]);
}

const validTokens = new Set<string>();

export function issueCompletionToken(): string {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  validTokens.add(token);
  return token;
}

export function consumeCompletionToken(token: string | undefined): boolean {
  if (__DEV__ && !token) return true;
  if (!token || !validTokens.has(token)) return false;
  validTokens.delete(token);
  return true;
}

/**
 * TOTP (Time-based One-Time Password) Service for FlashAgenda Backend
 * Generates deterministic 4-digit codes based on a permanent secretGuid and time windows.
 */

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTotpCode(secretGuid: string, timeWindowSeconds: number = 300): { code: string; remainingSeconds: number } {
  if (!secretGuid) {
    return { code: '0000', remainingSeconds: timeWindowSeconds };
  }

  const now = Date.now();
  const currentWindow = Math.floor(now / (timeWindowSeconds * 1000));
  const remainingSeconds = timeWindowSeconds - Math.floor((now % (timeWindowSeconds * 1000)) / 1000);

  const hashInput = `${secretGuid}_${currentWindow}`;
  const numericHash = simpleHash(hashInput);
  const code = (numericHash % 9000 + 1000).toString();

  return { code, remainingSeconds };
}

export function verifyTotpCode(enteredCode: string, secretGuid: string, timeWindowSeconds: number = 300): boolean {
  if (!enteredCode || !secretGuid) return false;
  const cleanEntered = enteredCode.trim();
  const now = Date.now();
  const currentWindow = Math.floor(now / (timeWindowSeconds * 1000));

  for (let windowOffset = -1; windowOffset <= 1; windowOffset++) {
    const windowToTest = currentWindow + windowOffset;
    const hashInput = `${secretGuid}_${windowToTest}`;
    const numericHash = simpleHash(hashInput);
    const validCode = (numericHash % 9000 + 1000).toString();

    if (cleanEntered === validCode) {
      return true;
    }
  }

  return false;
}

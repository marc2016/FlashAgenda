/**
 * TOTP (Time-based One-Time Password) Service for FlashAgenda
 * Generates deterministic 4-digit codes based on a permanent secretGuid and time windows.
 */

// Simple deterministic hash function for generating 4-digit codes from GUID + time window
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a 4-digit TOTP code for a secretGuid at a specific time window.
 * @param secretGuid The permanent master GUID for the user
 * @param timeWindowSeconds Duration of each code validity in seconds (default: 60s)
 */
export function getTotpCode(secretGuid: string, timeWindowSeconds: number = 300): { code: string; remainingSeconds: number } {
  if (!secretGuid) {
    return { code: '0000', remainingSeconds: timeWindowSeconds };
  }

  const now = Date.now();
  const currentWindow = Math.floor(now / (timeWindowSeconds * 1000));
  const remainingSeconds = timeWindowSeconds - Math.floor((now % (timeWindowSeconds * 1000)) / 1000);

  const hashInput = `${secretGuid}_${currentWindow}`;
  const numericHash = simpleHash(hashInput);
  const code = (numericHash % 9000 + 1000).toString(); // Always 4 digits (1000 - 9999)

  return { code, remainingSeconds };
}

/**
 * Verify an entered 4-digit TOTP code against a secretGuid.
 * Checks current window (W), previous window (W-1), and next window (W+1) for clock skew tolerance.
 */
export function verifyTotpCode(enteredCode: string, secretGuid: string, timeWindowSeconds: number = 300): boolean {
  if (!enteredCode || !secretGuid) return false;
  const cleanEntered = enteredCode.trim();
  const now = Date.now();
  const currentWindow = Math.floor(now / (timeWindowSeconds * 1000));

  // Check window W, W-1, W+1
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

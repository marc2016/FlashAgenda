import { describe, it, expect } from 'vitest';
import { getTotpCode, verifyTotpCode } from '../src/services/totpService';

describe('TOTP Service Unit Tests', () => {
  const mockGuid = '550e8400-e29b-41d4-a716-446655440000';

  it('should generate a 4-digit numeric code', () => {
    const result = getTotpCode(mockGuid, 300);
    expect(result.code).toMatch(/^\d{4}$/);
    expect(Number(result.code)).toBeGreaterThanOrEqual(1000);
    expect(Number(result.code)).toBeLessThanOrEqual(9999);
  });

  it('should return valid remainingSeconds within window limit', () => {
    const result = getTotpCode(mockGuid, 300);
    expect(result.remainingSeconds).toBeGreaterThan(0);
    expect(result.remainingSeconds).toBeLessThanOrEqual(300);
  });

  it('should verify correct TOTP code for current window', () => {
    const { code } = getTotpCode(mockGuid, 300);
    const isValid = verifyTotpCode(code, mockGuid, 300);
    expect(isValid).toBe(true);
  });

  it('should reject invalid or wrong TOTP codes', () => {
    const isValid = verifyTotpCode('0000', mockGuid, 300);
    expect(isValid).toBe(false);
  });

  it('should handle empty or null secretGuid gracefully', () => {
    const result = getTotpCode('', 300);
    expect(result.code).toBe('0000');
    expect(verifyTotpCode('1234', '', 300)).toBe(false);
  });
});

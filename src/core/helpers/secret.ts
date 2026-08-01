export function maskSecret(
  secret: string,
  visibleCount = 4,
  maskChar = '*',
): string {
  if (secret.length <= visibleCount) {
    return secret; // or maskChar.repeat(secret.length) if you want to fully mask short secrets
  }
  const maskedPart = maskChar.repeat(secret.length - visibleCount);
  const visiblePart = secret.slice(-visibleCount);
  return maskedPart + visiblePart;
}

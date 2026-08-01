export const hashHmacSHA256 = async (message: string, secret: string) => {
  // Encode the key and message as Uint8Array
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  // Import the key
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign'],
  );
  // Generate HMAC
  const signature = await window.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData,
  );
  // Convert signature to hex format
  return Array.from(new Uint8Array(signature))
    .map((b) => ('00' + b.toString(16)).slice(-2))
    .join('');
};

// SportSphere client-side payment utilities and cryptographic helpers

export async function generateSandboxSig(orderId, paymentId) {
  const secret = 'playsync_sandbox_secret_2026';
  const message = `${orderId}|${paymentId}`;

  // Use standard Web Crypto API (supported across all modern browsers)
  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(message);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    );

    const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback test signature token
  return `test_sig_${orderId}_${paymentId}`;
}

// Usage: node verify-jwt.js "<token>" "<secret>"
const crypto = require('crypto');

const token = process.argv[2];
const secret = process.argv[3];

if (!token || !secret) {
  console.error('Usage: node verify-jwt.js "<token>" "<secret>"');
  process.exit(1);
}

const parts = token.split('.');
if (parts.length !== 3) {
  console.error('Token does not look like a valid JWT (expected 3 parts, got', parts.length, ')');
  process.exit(1);
}

const [headerB64, payloadB64, signatureB64] = parts;
const data = `${headerB64}.${payloadB64}`;

const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

console.log('--- Header ---');
console.log(header);
console.log('--- Payload ---');
console.log(payload);

console.log('--- Secret used (length', secret.length, ') ---');
console.log(JSON.stringify(secret));

const expectedSig = crypto
  .createHmac('sha256', secret)
  .update(data)
  .digest('base64url');

console.log('--- Signature check ---');
console.log('Token signature:    ', signatureB64);
console.log('Computed signature: ', expectedSig);
console.log('MATCH:', expectedSig === signatureB64);

const now = Math.floor(Date.now() / 1000);
console.log('--- Expiration check ---');
console.log('now:', now, ' exp:', payload.exp, ' expired:', now > payload.exp);
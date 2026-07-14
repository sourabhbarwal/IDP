# JWT RS256 Migration Guide

## Current: HS256 (development)
All services share `JWT_SECRET` env var.
Auth-service signs tokens, all other services verify using the same secret.

## Production: RS256

### Step 1 — Generate RSA key pair
```bash
# Generate 4096-bit RSA private key
openssl genrsa -out jwt-private.pem 4096

# Extract public key
openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
```

### Step 2 — Update auth-service
```typescript
// auth.module.ts
JwtModule.registerAsync({
  useFactory: (config: ConfigService) => ({
    privateKey: fs.readFileSync(config.get('JWT_PRIVATE_KEY_PATH')),
    publicKey: fs.readFileSync(config.get('JWT_PUBLIC_KEY_PATH')),
    signOptions: {
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'idp-platform',
    },
  }),
}),
```

### Step 3 — Update all other services (catalog, repo, template, etc.)
They only verify tokens — they only need the PUBLIC key:
```typescript
JwtModule.registerAsync({
  useFactory: (config: ConfigService) => ({
    publicKey: fs.readFileSync(config.get('JWT_PUBLIC_KEY_PATH')),
    verifyOptions: { algorithms: ['RS256'] },
  }),
}),
```

### Step 4 — Update JWT strategies
Change `secretOrKey` to `secretOrKeyProvider` using the public key.

### Why this matters
With HS256, a compromised secret in any service allows token forgery.
With RS256, only auth-service can sign tokens (private key stays there).
Other services can only verify — they cannot forge tokens even if compromised.
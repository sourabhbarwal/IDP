#!/bin/bash
set -e

KEY_DIR="secrets/jwt"
mkdir -p "$KEY_DIR"

echo "Generating 4096-bit RSA key pair..."

openssl genrsa -out "$KEY_DIR/private.pem" 4096
openssl rsa -in "$KEY_DIR/private.pem" -pubout -out "$KEY_DIR/public.pem"

echo "✅ Private key: $KEY_DIR/private.pem"
echo "✅ Public key:  $KEY_DIR/public.pem"
echo ""
echo "Add secrets/jwt/private.pem to .gitignore"
#!/bin/bash
# 1. Arrêter et supprimer tout
docker stop n8n cloudflared 2>/dev/null
docker rm n8n cloudflared 2>/dev/null
docker volume rm n8n_data 2>/dev/null

# 2. Lancer cloudflared d'abord
docker run -d --name cloudflared --network n8n-net cloudflare/cloudflared:latest tunnel --url http://n8n:5678

# 3. Attendre et récupérer l'URL
sleep 5
TUNNEL_URL=$(docker logs cloudflared 2>&1 | grep -o 'https://[a-z\-]*\.trycloudflare\.com' | head -1)
echo "URL Cloudflare: $TUNNEL_URL"

# 4. Lancer n8n avec compte admin pré-configuré
docker run -d --name n8n --network n8n-net -p 5678:5678 \
  -e WEBHOOK_URL=$TUNNEL_URL \
  -e N8N_PROXY_HOPS=1 \
  -e N8N_USER_MANAGEMENT_DISABLED=false \
  -e N8N_DEFAULT_USER_EMAIL=localhost.tipper562@passmail.net \
  -e N8N_DEFAULT_USER_PASSWORD=Falcon7-Revivable2-Fraction5-Safehouse3-Pamphlet8 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n:nightly

echo ""
echo "=========================================="
echo "n8n est prêt !"
echo "URL locale: http://localhost:5678"
echo "URL webhook: $TUNNEL_URL"
echo "Email: admin@example.com"
echo "Mot de passe: ChangeMe123!"
echo "=========================================="

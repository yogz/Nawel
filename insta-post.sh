#!/bin/bash

# Fichier pour stocker le dernier commit traité
LAST_COMMIT_FILE="$HOME/.n8n_insta_last_commit"
REPO_PATH="./"
WEBHOOK_URL="http://localhost:5678/webhook/github-push"

cd "$REPO_PATH" || exit 1

# Si un nombre est passé en paramètre, prend les N derniers commits
if [ -n "$1" ]; then
  COMMITS=$(git log --format="%H|%s" -n "$1")
else
  # Sinon, récupère depuis la dernière exécution
  if [ -f "$LAST_COMMIT_FILE" ]; then
    LAST_COMMIT=$(cat "$LAST_COMMIT_FILE")
  else
    LAST_COMMIT=$(git rev-list --max-parents=0 HEAD)
  fi
  COMMITS=$(git log --format="%H|%s" "$LAST_COMMIT"..HEAD 2>/dev/null)
fi

if [ -z "$COMMITS" ]; then
  echo "Pas de commits à traiter"
  exit 0
fi

# Construit le JSON avec tous les commits
JSON_COMMITS="["
FIRST=true
while IFS='|' read -r HASH MESSAGE; do
  # Échappe les guillemets dans le message
  MESSAGE=$(echo "$MESSAGE" | sed 's/"/\\"/g')
  
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    JSON_COMMITS+=","
  fi
  JSON_COMMITS+="{\"id\":\"$HASH\",\"message\":\"$MESSAGE\"}"
done <<< "$COMMITS"
JSON_COMMITS+="]"

echo "Envoi de $(echo "$COMMITS" | wc -l) commits"

# Un seul appel avec tous les commits
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{\"body\":{\"commits\":$JSON_COMMITS}}"

echo ""

# Sauvegarde le dernier commit traité
git rev-parse HEAD > "$LAST_COMMIT_FILE"

echo "Terminé"

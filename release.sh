#!/bin/bash

# Exit on error
set -e

echo "⚡ FlashAgenda Release & Publish Manager ⚡"
echo "=========================================="

CURRENT_VER=$(node -p "require('./frontend/package.json').version")
echo "📌 Aktuelle Version: v$CURRENT_VER"

# Determine target version
TARGET_VER=$1

if [ -z "$TARGET_VER" ]; then
  echo ""
  echo "Wähle den Versions-Typ oder gib eine konkrete Version ein:"
  echo "  1) patch (Bugfixes/Kleine Fixes, z.B. v3.3.1)"
  echo "  2) minor (Neue Features/Module, z.B. v3.4.0)"
  echo "  3) major (Breaking Changes/Big Release, z.B. v4.0.0)"
  read -p "Auswahl [1-3 oder z.B. 3.4.0]: " CHOICE

  case $CHOICE in
    1|patch)
      TARGET_VER=$(node -e "const [m,j,p] = '$CURRENT_VER'.split('.').map(Number); console.log(\`\${m}.\${j}.\${p+1}\`)")
      ;;
    2|minor)
      TARGET_VER=$(node -e "const [m,j,p] = '$CURRENT_VER'.split('.').map(Number); console.log(\`\${m}.\${j+1}.0\`)")
      ;;
    3|major)
      TARGET_VER=$(node -e "const [m,j,p] = '$CURRENT_VER'.split('.').map(Number); console.log(\`\${m+1}.0.0\`)")
      ;;
    *)
      TARGET_VER=$CHOICE
      ;;
  esac
fi

# Clean leading 'v' if present
TARGET_VER=${TARGET_VER#v}

echo ""
echo "🚀 Bereite Release v$TARGET_VER vor..."

# Step 1: Run Backend Tests
echo ""
echo "🧪 1/4 Führe Backend-Tests aus (Vitest)..."
cd backend
npm test
cd ..

# Step 2: Build Frontend
echo ""
echo "📦 2/4 Baue Frontend-Produktionsbundle..."
cd frontend
npm run build
cd ..

# Step 3: Run Frontend E2E Tests
echo ""
echo "🎭 3/4 Führe Frontend E2E-Tests aus (Playwright)..."
cd frontend
npx playwright test
cd ..

# Step 4: Bump Versions
echo ""
echo "✍️ 4/4 Aktualisiere package.json Versionen auf v$TARGET_VER..."
cd frontend
npm version $TARGET_VER --no-git-tag-version > /dev/null
cd ..

cd backend
npm version $TARGET_VER --no-git-tag-version > /dev/null
cd ..

# Step 5: Git Commit & Tag
echo ""
read -p "Möchtest du die Änderungen committen und den Tag v$TARGET_VER erstellen? (y/N): " CONFIRM_GIT

if [[ "$CONFIRM_GIT" =~ ^[Yy]$ ]]; then
  read -p "Commit-Nachricht [Release v$TARGET_VER]: " COMMIT_MSG
  if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Release v$TARGET_VER"
  fi

  git add .
  git commit -m "$COMMIT_MSG"
  git tag -a "v$TARGET_VER" -m "$COMMIT_MSG"
  echo "✅ Git Commit & Tag v$TARGET_VER erstellt."

  read -p "Möchtest du Commit & Tag v$TARGET_VER nach GitHub pushen? (y/N): " CONFIRM_PUSH
  if [[ "$CONFIRM_PUSH" =~ ^[Yy]$ ]]; then
    git push origin main
    git push origin "v$TARGET_VER"
    echo "🎉 Release v$TARGET_VER erfolgreich nach GitHub gepusht!"
  fi
fi

echo ""
echo "✨ Release v$TARGET_VER abgeschlossen!"

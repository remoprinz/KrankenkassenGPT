#!/bin/bash
# =============================================================================
# SwissHealth API Safe Deploy Script
# Verhindert versehentliches Deployment auf falsche Firebase-Projekte
# =============================================================================

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Erlaubte Projekte für SwissHealth API
ALLOWED_PROJECTS=("swisshealth-gpt" "jassguruchat")
PREFERRED_PROJECT="swisshealth-gpt"

# Verbotene Projekte (andere Anwendungen)
FORBIDDEN_PROJECTS=("kigate-prod" "jassguru")

echo ""
echo "🔒 SwissHealth API Safe Deploy Check"
echo "====================================="

# Aktuelles Projekt ermitteln
CURRENT_PROJECT=$(firebase use 2>/dev/null | grep -oE 'kigate-prod|jassguruchat|swisshealth-gpt|jassguru' | head -1)

if [ -z "$CURRENT_PROJECT" ]; then
    CURRENT_PROJECT=$(cat .firebaserc 2>/dev/null | grep -oE '"default":\s*"[^"]*"' | sed 's/"default":\s*"\([^"]*\)"/\1/')
fi

echo ""
echo "📋 Projekt-Check:"
echo "   Aktuell:     $CURRENT_PROJECT"
echo "   Empfohlen:   $PREFERRED_PROJECT"
echo ""

# Prüfen ob verbotenes Projekt
for forbidden in "${FORBIDDEN_PROJECTS[@]}"; do
    if [ "$CURRENT_PROJECT" == "$forbidden" ]; then
        echo -e "${RED}❌ FEHLER: Verbotenes Projekt '$forbidden'!${NC}"
        echo ""
        echo "   SwissHealth API darf NICHT auf '$forbidden' deployed werden!"
        echo "   Das würde eine andere Anwendung überschreiben!"
        echo ""
        echo "   Führe aus:"
        echo "   firebase use $PREFERRED_PROJECT"
        echo ""
        exit 1
    fi
done

# Prüfen ob erlaubtes Projekt
is_allowed=false
for allowed in "${ALLOWED_PROJECTS[@]}"; do
    if [ "$CURRENT_PROJECT" == "$allowed" ]; then
        is_allowed=true
        break
    fi
done

if [ "$is_allowed" != true ]; then
    echo -e "${RED}❌ FEHLER: Unbekanntes Projekt '$CURRENT_PROJECT'!${NC}"
    echo ""
    echo "   Erlaubte Projekte: ${ALLOWED_PROJECTS[*]}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Projekt-Check bestanden!${NC}"
echo ""

# Warnung wenn nicht bevorzugtes Projekt
if [ "$CURRENT_PROJECT" != "$PREFERRED_PROJECT" ]; then
    echo -e "${YELLOW}⚠️  Hinweis: Du verwendest '$CURRENT_PROJECT' statt '$PREFERRED_PROJECT'${NC}"
    echo ""
fi

# Deployment-Typ wählen
echo "Was möchtest du deployen?"
echo "  1) Nur Hosting (schnell)"
echo "  2) Nur Functions"
echo "  3) Alles (Hosting + Functions)"
echo ""
read -p "Wähle (1/2/3): " choice

case $choice in
    1)
        DEPLOY_TARGET="hosting"
        ;;
    2)
        DEPLOY_TARGET="functions"
        ;;
    3)
        DEPLOY_TARGET="hosting,functions"
        ;;
    *)
        echo "Ungültige Auswahl."
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}⚠️  Du bist dabei, SwissHealth API ($DEPLOY_TARGET) auf $CURRENT_PROJECT zu deployen.${NC}"
echo ""
read -p "Fortfahren? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Abgebrochen."
    exit 0
fi

echo ""
echo "🚀 Starte Deployment..."
echo ""

# Functions bauen falls nötig
if [[ "$DEPLOY_TARGET" == *"functions"* ]]; then
    echo -e "${BLUE}📦 Baue Functions...${NC}"
    cd functions && npm run build && cd ..
fi

# Deploy
firebase deploy --only $DEPLOY_TARGET --project $CURRENT_PROJECT

echo ""
echo -e "${GREEN}✅ Deployment erfolgreich!${NC}"
echo ""
echo "🌐 URLs:"
echo "   Hosting:   https://$CURRENT_PROJECT.web.app"
if [ "$CURRENT_PROJECT" == "jassguruchat" ]; then
    echo "   Custom:    https://krankenkassen.ragit.io"
fi
echo ""

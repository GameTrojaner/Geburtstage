#!/usr/bin/env bash
#
# Geburtstage App - Entwicklungsumgebung einrichten (Linux/macOS)
#
# Ausfuehren:
#   chmod +x setup-dev.sh
#   ./setup-dev.sh
#
# Optionen:
#   --skip-node           Node.js Installation ueberspringen
#   --skip-android        Android Studio Installation ueberspringen

set -e

SKIP_NODE=false
SKIP_ANDROID=false

for arg in "$@"; do
  case $arg in
    --skip-node) SKIP_NODE=true ;;
    --skip-android) SKIP_ANDROID=true ;;
  esac
done

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Geburtstage App - Dev Environment Setup${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# --- Paketmanager erkennen ---
detect_pkg_manager() {
  if command -v apt-get &>/dev/null; then
    echo "apt"
  elif command -v dnf &>/dev/null; then
    echo "dnf"
  elif command -v pacman &>/dev/null; then
    echo "pacman"
  elif command -v brew &>/dev/null; then
    echo "brew"
  else
    echo "unknown"
  fi
}

PKG_MANAGER=$(detect_pkg_manager)

install_pkg() {
  local pkg="$1"
  case $PKG_MANAGER in
    apt)     sudo apt-get install -y "$pkg" ;;
    dnf)     sudo dnf install -y "$pkg" ;;
    pacman)  sudo pacman -S --noconfirm "$pkg" ;;
    brew)    brew install "$pkg" ;;
    *)
      echo -e "${RED}[FEHLER] Kein unterstuetzter Paketmanager gefunden (apt/dnf/pacman/brew).${NC}"
      echo -e "${YELLOW}         Bitte '$pkg' manuell installieren.${NC}"
      return 1
      ;;
  esac
}

# --- 1. Node.js installieren ---
if [ "$SKIP_NODE" = false ]; then
  if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}[OK] Node.js bereits installiert: $NODE_VERSION${NC}"
  else
    echo -e "${YELLOW}[INSTALL] Node.js wird installiert...${NC}"

    # Bevorzugt: nvm
    if command -v nvm &>/dev/null; then
      nvm install --lts
      nvm use --lts
    elif command -v fnm &>/dev/null; then
      fnm install --lts
      fnm use lts-latest
    else
      # Fallback: NodeSource Repository (Debian/Ubuntu) oder Paketmanager
      if [ "$PKG_MANAGER" = "apt" ]; then
        echo -e "${YELLOW}         NodeSource Repository wird hinzugefuegt...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
      elif [ "$PKG_MANAGER" = "brew" ]; then
        brew install node@20
      else
        install_pkg nodejs
        install_pkg npm
      fi
    fi

    if command -v node &>/dev/null; then
      echo -e "${GREEN}[OK] Node.js installiert: $(node --version)${NC}"
    else
      echo -e "${RED}[FEHLER] Node.js konnte nicht installiert werden.${NC}"
      echo -e "${YELLOW}         Bitte manuell installieren: https://nodejs.org/${NC}"
    fi
  fi
else
  echo -e "${GRAY}[SKIP] Node.js Installation uebersprungen${NC}"
fi

# --- 2. Git pruefen ---
if command -v git &>/dev/null; then
  echo -e "${GREEN}[OK] Git bereits installiert: $(git --version)${NC}"
else
  echo -e "${YELLOW}[INSTALL] Git wird installiert...${NC}"
  install_pkg git
  echo -e "${GREEN}[OK] Git installiert${NC}"
fi

# --- 3. Android Studio (optional) ---
if [ "$SKIP_ANDROID" = false ]; then
  if command -v adb &>/dev/null; then
    echo -e "${GREEN}[OK] Android SDK bereits vorhanden (adb gefunden)${NC}"
  else
    echo ""
    echo -e "${YELLOW}[INFO] Android Studio wird fuer Development Builds benoetigt.${NC}"
    echo -e "${YELLOW}       (Kontakte schreiben, Notifications, Widgets)${NC}"
    read -rp "       Android Studio jetzt installieren? (j/n) " answer

    if [[ "$answer" =~ ^[jJyY]$ ]]; then
      if [ "$PKG_MANAGER" = "brew" ]; then
        echo -e "${YELLOW}[INSTALL] Android Studio via Homebrew Cask...${NC}"
        brew install --cask android-studio
      elif command -v snap &>/dev/null; then
        echo -e "${YELLOW}[INSTALL] Android Studio via Snap...${NC}"
        sudo snap install android-studio --classic
      elif command -v flatpak &>/dev/null; then
        echo -e "${YELLOW}[INSTALL] Android Studio via Flatpak...${NC}"
        flatpak install -y flathub com.google.AndroidStudio
      else
        echo -e "${YELLOW}[INFO] Automatische Installation nicht moeglich.${NC}"
        echo -e "${YELLOW}       Bitte manuell herunterladen: https://developer.android.com/studio${NC}"
      fi

      # ANDROID_HOME setzen
      ANDROID_HOME="$HOME/Android/Sdk"
      if [ ! -d "$ANDROID_HOME" ]; then
        ANDROID_HOME="$HOME/Library/Android/sdk"  # macOS
      fi

      SHELL_RC=""
      if [ -f "$HOME/.zshrc" ]; then
        SHELL_RC="$HOME/.zshrc"
      elif [ -f "$HOME/.bashrc" ]; then
        SHELL_RC="$HOME/.bashrc"
      fi

      if [ -n "$SHELL_RC" ]; then
        if ! grep -q "ANDROID_HOME" "$SHELL_RC"; then
          echo "" >> "$SHELL_RC"
          echo "# Android SDK" >> "$SHELL_RC"
          echo "export ANDROID_HOME=\"$ANDROID_HOME\"" >> "$SHELL_RC"
          echo "export PATH=\"\$PATH:\$ANDROID_HOME/platform-tools\"" >> "$SHELL_RC"
          echo -e "${GREEN}[OK] ANDROID_HOME zu $SHELL_RC hinzugefuegt${NC}"
          echo -e "${YELLOW}[INFO] Bitte 'source $SHELL_RC' ausfuehren oder Terminal neu starten.${NC}"
        fi
      fi

      echo -e "${CYAN}[INFO] ANDROID_HOME = $ANDROID_HOME${NC}"
      echo -e "${YELLOW}[INFO] Bitte Android Studio oeffnen und den SDK Manager ausfuehren:${NC}"
      echo -e "${YELLOW}       - Android SDK Platform 34${NC}"
      echo -e "${YELLOW}       - Android SDK Build-Tools${NC}"
      echo -e "${YELLOW}       - Android Emulator (optional)${NC}"
    else
      echo -e "${GRAY}[SKIP] Android Studio wird uebersprungen.${NC}"
    fi
  fi
else
  echo -e "${GRAY}[SKIP] Android Studio Installation uebersprungen${NC}"
fi

# --- 4. Projekt-Abhaengigkeiten installieren ---
echo ""
echo -e "${YELLOW}[INSTALL] npm Abhaengigkeiten werden installiert...${NC}"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# node_modules loeschen (saubere Installation)
if [ -d "node_modules" ]; then
  echo -e "${GRAY}         Alte node_modules werden geloescht...${NC}"
  rm -rf node_modules
fi
if [ -f "package-lock.json" ]; then
  rm -f package-lock.json
fi

# Pruefen ob das Dateisystem Symlinks unterstuetzt (exFAT/FAT32 tun das nicht)
NPM_EXTRA_FLAGS=""
NO_SYMLINKS=false
SYMLINK_TEST_FILE=".symlink_test_$$"
SYMLINK_TARGET_FILE=".symlink_target_$$"
touch "$SYMLINK_TARGET_FILE" 2>/dev/null || true
if ! ln -s "$SYMLINK_TARGET_FILE" "$SYMLINK_TEST_FILE" 2>/dev/null; then
  echo -e "${YELLOW}[WARNUNG] Dateisystem unterstuetzt keine Symlinks (z.B. exFAT/FAT32).${NC}"
  echo -e "${YELLOW}         npm wird mit --no-bin-links --ignore-scripts ausgefuehrt.${NC}"
  echo -e "${YELLOW}         Bin-Wrapper werden manuell erstellt.${NC}"
  echo -e "${YELLOW}         Empfehlung: Projekt auf ext4-Partition verschieben fuer volle Kompatibilitaet.${NC}"
  NPM_EXTRA_FLAGS="--no-bin-links --ignore-scripts"
  NO_SYMLINKS=true
fi
rm -f "$SYMLINK_TEST_FILE" "$SYMLINK_TARGET_FILE" 2>/dev/null || true

npm install --legacy-peer-deps $NPM_EXTRA_FLAGS

# Falls keine Symlinks: .bin Wrapper-Scripts manuell erstellen
if [ "$NO_SYMLINKS" = true ]; then
  echo -e "${GRAY}         Erstelle .bin Wrapper-Scripts...${NC}"
  mkdir -p node_modules/.bin

  # Wrapper erstellen: Name -> Paket/Binary-Pfad
  create_bin_wrapper() {
    local name="$1"
    local target="$2"
    cat > "node_modules/.bin/$name" << WRAPPER
#!/bin/sh
exec node "\$(dirname "\$0")/../$target" "\$@"
WRAPPER
    chmod +x "node_modules/.bin/$name"
  }

  create_bin_wrapper "expo"    "expo/bin/cli"
  create_bin_wrapper "jest"    "jest/bin/jest.js"
  create_bin_wrapper "tsc"     "typescript/bin/tsc"
  create_bin_wrapper "tsserver" "typescript/bin/tsserver"

  echo -e "${GREEN}[OK] .bin Wrapper fuer expo, jest, tsc erstellt${NC}"
fi

echo -e "${GREEN}[OK] Abhaengigkeiten installiert${NC}"

# --- 5. Verifikation ---
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Verifikation${NC}"
echo -e "${CYAN}============================================${NC}"

# TypeScript Check
echo -e "${GRAY}[CHECK] TypeScript...${NC}"
if npx tsc --noEmit >/dev/null 2>&1; then
  echo -e "${GREEN}[OK] TypeScript kompiliert fehlerfrei${NC}"
else
  echo -e "${RED}[FEHLER] TypeScript-Fehler gefunden. Bitte 'npx tsc --noEmit' ausfuehren.${NC}"
fi

# Tests
echo -e "${GRAY}[CHECK] Unit Tests...${NC}"
if npx jest --no-cache >/dev/null 2>&1; then
  echo -e "${GREEN}[OK] Alle Tests bestanden${NC}"
else
  echo -e "${YELLOW}[WARNUNG] Einige Tests fehlgeschlagen. Bitte 'npm test' ausfuehren.${NC}"
fi

# --- Zusammenfassung ---
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}  Setup abgeschlossen!${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""
echo -e "  Naechste Schritte:"
echo -e "  1. cd $PROJECT_DIR"
echo -e "  2. npx expo start           (Dev-Server starten)"
echo -e "  3. Expo Go App oeffnen und QR-Code scannen"
echo ""
echo -e "  Fuer vollen nativen Zugriff:"
echo -e "  npx expo run:android         (Development Build)"
echo ""

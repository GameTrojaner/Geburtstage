# Release-Bot Setup für Branch-Schutz auf `main`

**Status: eingerichtet** — GitHub App `geburtstage-release-bot` ist aktiv, Secrets `APP_ID` und `APP_PRIVATE_KEY` sind gesetzt, Workflow nutzt App-Token.

**Ziel:** `main` ist PR-only – der Release-Workflow kann aber trotzdem direkt pushen.

---

## Hintergrund

Der Release-Workflow pusht Commits und Tags direkt auf `main`:
- `.github/workflows/release.yml` – Version-Bump + Tag bei jedem Merge und manuellen Releases

Er verwendet bereits `secrets.ACTIONS_PAT` (mit Fallback auf `GITHUB_TOKEN`).
Damit der Push durch den Branch-Schutz (Ruleset) darf, muss der pusher-Account
explizit in die **Bypass-Liste** des Rulesets eingetragen sein.

---

## Option A – GitHub App (empfohlen)

### 1. App anlegen

- GitHub → eigener Account → **Settings → Developer settings → GitHub Apps → New GitHub App**
- **Name:** `geburtstage-release-bot` (oder beliebig)
- **Homepage URL:** `https://github.com/<user>/Geburtstage`
- **Webhook:** deaktivieren
- **Repository permissions → Contents:** `Read and write`
- **Where can this app be installed?** → `Only on this account`
- → **Create GitHub App**

### 2. Private Key generieren

- Auf der App-Seite nach unten scrollen → **Generate a private key**
- PEM-Datei wird heruntergeladen → Inhalt als Repo Secret `APP_PRIVATE_KEY` ablegen

### 3. App ID ablegen

- App-Seite oben: **App ID** → als Repo Secret `APP_ID` ablegen

### 4. App installieren

- App-Seite → **Install App** → eigener Account → nur das `Geburtstage`-Repo

### 5. Workflow anpassen

In `.github/workflows/release.yml` den `actions/checkout`-Block ersetzen (Zeilen 51–54):

```yaml
# Neu: Token über GitHub App generieren
- uses: actions/create-github-app-token@v1
  id: app-token
  with:
    app-id: ${{ secrets.APP_ID }}
    private-key: ${{ secrets.APP_PRIVATE_KEY }}

- uses: actions/checkout@v6
  with:
    token: ${{ steps.app-token.outputs.token }}
    fetch-depth: 0
```

Den alten `secrets.ACTIONS_PAT`-Fallback kannst du danach aus der Datei entfernen.

### 6. App in Bypass-Liste eintragen

- Repo → **Settings → Rules → Rulesets → (dein Main-Ruleset)**
- **Bypass list → Add bypass → GitHub Apps** → `geburtstage-release-bot` wählen
- Speichern

---

## Option B – Fine-grained PAT (einfacher, aber an deinen Account gebunden)

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. **Repository access:** nur `Geburtstage`
3. **Repository permissions → Contents:** `Read and write`
4. Token als Repo Secret `ACTIONS_PAT` ablegen (ersetzt vorhandenes)
5. Repo → **Settings → Rules → Rulesets → (dein Main-Ruleset)**
6. **Bypass list → Add bypass → (dein GitHub-Account/User)** eintragen

> Nachteil: Token läuft nach max. 1 Jahr ab und ist an deinen persönlichen Account gebunden.

---

## Vergleich

| | Fine-grained PAT | GitHub App |
|---|---|---|
| Aufwand | gering | mittel |
| Läuft ab | max. 1 Jahr | nie (rotiert automatisch) |
| Gebunden an | deinen Account | eigenständige App-Entität |
| Audit-Log | zeigt deinen Username | zeigt Bot-Name |
| Granularität | per Repo + Permission | per Repo + Permission |

---

## Betroffene Datei

- `.github/workflows/release.yml` – Zeilen 51–54 (checkout mit Token)

<# 
  Geburtstage App - Entwicklungsumgebung einrichten
  Dieses Script richtet die komplette Entwicklungsumgebung auf einem neuen Windows-Rechner ein.
  
  Ausfuehren: Rechtsklick -> "Mit PowerShell ausfuehren" (als Administrator)
  Oder: powershell -ExecutionPolicy Bypass -File setup-dev.ps1
#>

param(
    [switch]$SkipAndroidStudio,
    [switch]$SkipNode
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Geburtstage App - Dev Environment Setup"   -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Pruefen ob winget verfuegbar ist ---
$hasWinget = Get-Command winget -ErrorAction SilentlyContinue
if (-not $hasWinget) {
    Write-Host "[FEHLER] winget ist nicht installiert. Bitte Windows App Installer aus dem Microsoft Store installieren." -ForegroundColor Red
    Write-Host "         https://apps.microsoft.com/detail/9nblggh4nns1" -ForegroundColor Yellow
    exit 1
}

# --- 2. Node.js installieren ---
if (-not $SkipNode) {
    $nodeVersion = $null
    try { $nodeVersion = (node --version 2>$null) } catch {}
    
    if ($nodeVersion) {
        Write-Host "[OK] Node.js bereits installiert: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "[INSTALL] Node.js 20 LTS wird installiert..." -ForegroundColor Yellow
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        
        # PATH aktualisieren
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        try {
            $nodeVersion = (node --version)
            Write-Host "[OK] Node.js installiert: $nodeVersion" -ForegroundColor Green
        } catch {
            Write-Host "[WARNUNG] Node.js installiert, aber Terminal muss neu gestartet werden." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[SKIP] Node.js Installation uebersprungen" -ForegroundColor Gray
}

# --- 3. Git pruefen ---
$gitVersion = $null
try { $gitVersion = (git --version 2>$null) } catch {}

if ($gitVersion) {
    Write-Host "[OK] Git bereits installiert: $gitVersion" -ForegroundColor Green
} else {
    Write-Host "[INSTALL] Git wird installiert..." -ForegroundColor Yellow
    winget install Git.Git --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Host "[OK] Git installiert" -ForegroundColor Green
}

# --- 4. Android Studio (optional) ---
if (-not $SkipAndroidStudio) {
    $adbPath = $null
    try { $adbPath = (Get-Command adb -ErrorAction SilentlyContinue) } catch {}
    
    if ($adbPath) {
        Write-Host "[OK] Android SDK bereits vorhanden (adb gefunden)" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[INFO] Android Studio wird fuer Development Builds benoetigt." -ForegroundColor Yellow
        Write-Host "       (Kontakte schreiben, Notifications, Widgets)" -ForegroundColor Yellow
        $answer = Read-Host "       Android Studio jetzt installieren? (j/n)"
        
        if ($answer -eq "j" -or $answer -eq "J" -or $answer -eq "y" -or $answer -eq "Y") {
            Write-Host "[INSTALL] Android Studio wird installiert..." -ForegroundColor Yellow
            winget install Google.AndroidStudio --accept-package-agreements --accept-source-agreements
            
            # ANDROID_HOME setzen
            $androidHome = "$env:LOCALAPPDATA\Android\Sdk"
            if (-not (Test-Path $androidHome)) {
                $androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
            }
            
            [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, "User")
            $env:ANDROID_HOME = $androidHome
            
            # platform-tools zum PATH hinzufuegen
            $currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
            if ($currentPath -notlike "*Android\Sdk\platform-tools*") {
                [System.Environment]::SetEnvironmentVariable("Path", "$currentPath;$androidHome\platform-tools", "User")
            }
            
            Write-Host "[OK] Android Studio installiert" -ForegroundColor Green
            Write-Host "[INFO] ANDROID_HOME = $androidHome" -ForegroundColor Cyan
            Write-Host "[INFO] Bitte Android Studio oeffnen und den SDK Manager ausfuehren:" -ForegroundColor Yellow
            Write-Host "       - Android SDK Platform (passend zur aktuellen Expo/RN compileSdk)" -ForegroundColor Yellow
            Write-Host "       - Android SDK Build-Tools" -ForegroundColor Yellow
            Write-Host "       - Android Emulator (optional)" -ForegroundColor Yellow
        } else {
            Write-Host "[SKIP] Android Studio wird uebersprungen. Kann spaeter installiert werden." -ForegroundColor Gray
        }
    }
} else {
    Write-Host "[SKIP] Android Studio Installation uebersprungen" -ForegroundColor Gray
}

# --- 5. Projekt-Abhaengigkeiten installieren ---
Write-Host ""
Write-Host "[INSTALL] npm Abhaengigkeiten werden installiert..." -ForegroundColor Yellow

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $projectDir

try {
    # node_modules loeschen falls vorhanden (saubere Installation)
    if (Test-Path "node_modules") {
        Write-Host "         Alte node_modules werden geloescht..." -ForegroundColor Gray
        Remove-Item -Recurse -Force "node_modules"
    }
    if (Test-Path "package-lock.json") {
        npm ci --legacy-peer-deps
    } else {
        npm install --legacy-peer-deps
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Abhaengigkeiten installiert" -ForegroundColor Green
    } else {
        Write-Host "[WARNUNG] npm install hatte Warnungen, aber sollte funktionieren" -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

# --- 6. Verifikation ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Verifikation" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Push-Location $projectDir
try {
    # TypeScript Check
    Write-Host "[CHECK] TypeScript..." -ForegroundColor Gray
    npx tsc --noEmit 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] TypeScript kompiliert fehlerfrei" -ForegroundColor Green
    } else {
        Write-Host "[FEHLER] TypeScript-Fehler gefunden. Bitte 'npx tsc --noEmit' ausfuehren." -ForegroundColor Red
    }
    
    # Tests
    Write-Host "[CHECK] Unit Tests..." -ForegroundColor Gray
    $testResult = npx jest --no-cache 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Alle Tests bestanden" -ForegroundColor Green
    } else {
        Write-Host "[WARNUNG] Einige Tests fehlgeschlagen. Bitte 'npm test' ausfuehren." -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

# --- Zusammenfassung ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup abgeschlossen!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Naechste Schritte:" -ForegroundColor White
Write-Host "  1. cd $projectDir" -ForegroundColor White
Write-Host "  2. npx expo start           (Dev-Server starten)" -ForegroundColor White
Write-Host "  3. Expo Go App oeffnen und QR-Code scannen" -ForegroundColor White
Write-Host ""
Write-Host "  Fuer vollen nativen Zugriff:" -ForegroundColor White
Write-Host "  npx expo run:android         (Development Build)" -ForegroundColor White
Write-Host ""

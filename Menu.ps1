# Menu.ps1 - Menu local du projet analyse-offres
# Usage : powershell -ExecutionPolicy Bypass -File Menu.ps1
# Ou en PowerShell : .\Menu.ps1

$host.UI.RawUI.WindowTitle = "analyse-offres - Menu"

function Afficher-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  analyse-offres - Menu local" -ForegroundColor Cyan
    Write-Host "  Serveur par defaut : port 3001" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. Lancer le serveur de dev (watch TS/CSS, port 3001, F5 pour voir)"
    Write-Host "  2. Lancer la suite de tests complete (TU + BDD)"
    Write-Host "  3. Lancer les tests d'integration Airtable (a la main, pas pendant le build)"
    Write-Host "  4. Forcer kill des process sur 3001 puis relancer le serveur"
    Write-Host "  --- GitHub ---"
    Write-Host "  5. Voir l'etat Git (status)"
    Write-Host "  6. Sauvegarder sur GitHub (add + commit + push)"
    Write-Host "  7. Recuperer les mises a jour (git pull)"
    Write-Host "  Q. Quitter"
    Write-Host ""
}

function Lancer-Serveur {
    $env:PORT = "3001"
    Write-Host "Serveur de dev : nodemon surveille app/, utils/, types/, scripts/ (TS + CSS)." -ForegroundColor Gray
    Write-Host "Demarrage sur http://127.0.0.1:3001 - Modifiez le code puis F5 dans le navigateur." -ForegroundColor Green
    Write-Host "Arreter avec Ctrl+C" -ForegroundColor Gray
    npm run dev
}

function Get-Pids-Par-Port([int]$Port) {
    $pids = @()
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    } catch {
        # Fallback sans Get-NetTCPConnection (selon edition PowerShell / droits)
        $lines = netstat -ano -p tcp | Select-String ":$Port\s+.*LISTENING\s+(\d+)$"
        foreach ($line in $lines) {
            if ($line.Matches.Count -gt 0) {
                $pids += [int]$line.Matches[0].Groups[1].Value
            }
        }
        $pids = $pids | Select-Object -Unique
    }
    return $pids
}

function Forcer-Kill-Et-Relancer-Serveur {
    $port = 3001
    $pids = Get-Pids-Par-Port -Port $port
    if (-not $pids -or $pids.Count -eq 0) {
        Write-Host "Aucun process en ecoute sur le port $port." -ForegroundColor DarkYellow
    } else {
        Write-Host "Process detectes sur le port $port : $($pids -join ', ')" -ForegroundColor Yellow
        foreach ($procId in $pids) {
            try {
                Stop-Process -Id $procId -Force -ErrorAction Stop
                Write-Host "PID $procId termine." -ForegroundColor Green
            } catch {
                Write-Host "Impossible de terminer PID $procId : $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        Start-Sleep -Milliseconds 500
        $restants = Get-Pids-Par-Port -Port $port
        if ($restants -and $restants.Count -gt 0) {
            Write-Host "Attention: le port $port est encore occupe par: $($restants -join ', ')" -ForegroundColor Red
            Write-Host "Abandon du redemarrage automatique." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
    }
    Write-Host ""
    Lancer-Serveur
}

function Lancer-Tests-Complets {
    Write-Host "Lancement : TU (Jest) puis BDD (Playwright)..." -ForegroundColor Yellow
    npm run test:all
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Tous les tests sont passes." -ForegroundColor Green
    } else {
        Write-Host "Echec de la suite de tests." -ForegroundColor Red
    }
    Write-Host ""
    Read-Host "Appuyez sur Entree pour revenir au menu"
}

function Charger-EnvSiPresent {
    $envFile = Join-Path $PSScriptRoot ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
                $key = $Matches[1]
                $val = $Matches[2].Trim().Trim('"').Trim("'")
                Set-Item -Path "Env:$key" -Value $val
            }
        }
    }
}

function Invoke-GitStatus {
    Push-Location $PSScriptRoot
    try {
        if (-not (Test-Path ".git")) {
            Write-Host "Ce dossier n'est pas un depot Git." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Etat du depot Git :" -ForegroundColor Cyan
        git status
        Write-Host ""
        $remotes = git remote -v 2>$null
        if ($remotes) {
            Write-Host "Remotes :" -ForegroundColor Gray
            $remotes
        }
        Read-Host "Appuyez sur Entree pour revenir au menu"
    } finally {
        Pop-Location
    }
}

function Invoke-Sauvegarder-GitHub {
    Push-Location $PSScriptRoot
    try {
        if (-not (Test-Path ".git")) {
            Write-Host "Ce dossier n'est pas un depot Git. Initialisez avec : git init" -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Sauvegarde sur GitHub" -ForegroundColor Cyan
        Write-Host ""

        $status = git status --porcelain
        if (-not $status) {
            Write-Host "Rien a committer (working tree clean)." -ForegroundColor DarkYellow
            $push = Read-Host "Pousser quand meme les commits existants ? (o/N)"
            if ($push -match '^[oOyY]') {
                git push
                if ($LASTEXITCODE -eq 0) { Write-Host "Push OK." -ForegroundColor Green } else { Write-Host "Push en echec." -ForegroundColor Red }
            }
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }

        git status
        Write-Host ""
        $msg = Read-Host "Message de commit (obligatoire pour add+commit+push)"
        if ([string]::IsNullOrWhiteSpace($msg)) {
            Write-Host "Annule : message vide." -ForegroundColor Yellow
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }

        git add -A
        if ($LASTEXITCODE -ne 0) {
            Write-Host "git add -A en echec." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        git commit -m "$msg"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Commit en echec (conflits ou rien a committer ?)." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Commit OK. Push en cours..." -ForegroundColor Green
        git push
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Sauvegarde sur GitHub terminee." -ForegroundColor Green
        } else {
            Write-Host "Push en echec. Verifiez la remote (origin) et vos acces (token, SSH)." -ForegroundColor Red
        }
        Write-Host ""
        Read-Host "Appuyez sur Entree pour revenir au menu"
    } finally {
        Pop-Location
    }
}

function Invoke-GitPull {
    Push-Location $PSScriptRoot
    try {
        if (-not (Test-Path ".git")) {
            Write-Host "Ce dossier n'est pas un depot Git." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Recuperation des mises a jour (git pull)..." -ForegroundColor Cyan
        git pull
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Pull OK." -ForegroundColor Green
        } else {
            Write-Host "Pull en echec (conflits ou pas de remote ?)." -ForegroundColor Red
        }
        Write-Host ""
        Read-Host "Appuyez sur Entree pour revenir au menu"
    } finally {
        Pop-Location
    }
}

function Lancer-Tests-Integration-Airtable {
    Charger-EnvSiPresent
    Write-Host "Tests d'integration Airtable (API reelle)." -ForegroundColor Yellow
    Write-Host "Config : data/parametres.json (airtable.apiKey, airtable.baseTest) ou variables AIRTABLE_API_KEY, AIRTABLE_BASE_TEST_URL." -ForegroundColor Gray
    Write-Host "Les tests utilisent baseTest uniquement (jamais base, pour ne pas toucher la prod)." -ForegroundColor Gray
    if (-not $env:AIRTABLE_API_KEY -and -not (Test-Path "data/parametres.json")) {
        Write-Host "Attention : parametres.json ou AIRTABLE_API_KEY + AIRTABLE_BASE_TEST_URL requis ; sinon les tests seront ignores." -ForegroundColor DarkYellow
    }
    Write-Host ""
    npm run test:integration:airtable
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Tests d'integration Airtable OK. La base creee reste disponible pour exploration." -ForegroundColor Green
    } else {
        Write-Host "Echec ou tests ignores (verifier les variables d'environnement)." -ForegroundColor Red
    }
    Write-Host ""
    Read-Host "Appuyez sur Entree pour revenir au menu"
}

# Boucle principale
do {
    Afficher-Menu
    $choix = Read-Host "Choix"
    switch ($choix) {
        "1" { Lancer-Serveur; break }
        "2" { Lancer-Tests-Complets }
        "3" { Lancer-Tests-Integration-Airtable }
        "4" { Forcer-Kill-Et-Relancer-Serveur; break }
        "5" { Invoke-GitStatus }
        "6" { Invoke-Sauvegarder-GitHub }
        "7" { Invoke-GitPull }
        "q" { Write-Host "Au revoir." -ForegroundColor Cyan; exit 0 }
        "Q" { Write-Host "Au revoir." -ForegroundColor Cyan; exit 0 }
        default { Write-Host "Choix invalide." -ForegroundColor Red; Start-Sleep -Seconds 2 }
    }
} while ($true)

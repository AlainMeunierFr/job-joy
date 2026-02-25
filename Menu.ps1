# Menu.ps1 - Menu local du projet Job-Joy
# Usage : powershell -ExecutionPolicy Bypass -File Menu.ps1
# Ou en PowerShell : .\Menu.ps1

$host.UI.RawUI.WindowTitle = "Job-Joy - Menu"

function Afficher-Menu {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Job-Joy - Menu local" -ForegroundColor Cyan
    Write-Host "  Serveur par defaut : port 3001" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. Lancer le serveur de dev (watch TS/CSS, port 3001)"
    Write-Host "  2. Forcer kill des process sur 3001 puis relancer le serveur (1)"
    Write-Host "  3. Lancer les tests d'integration Airtable (a la main, pas pendant le build)"
    Write-Host "  4. Tests complets (TU + BDD, sans skip)"
        Write-Host "  5. Publish pre-prod (4 puis version/commit + push vers branche preprod ; CI build + Pre-release)"
        Write-Host "  6. Rendre public (version/commit + tag v* + push ; CI build + release stable)"
    Write-Host "  Q. Quitter"
    Write-Host ""
}

function Lancer-Serveur {
    Push-Location $PSScriptRoot
    try {
        $env:PORT = "3001"
        Write-Host "Serveur de dev : build + demarrage sur http://127.0.0.1:3001" -ForegroundColor Gray
        Write-Host "Repertoire : $PSScriptRoot" -ForegroundColor Gray
        Write-Host "Apres modification du code : Ctrl+C puis relancer (pas de redemarrage auto)." -ForegroundColor Green
        Write-Host "Arreter avec Ctrl+C" -ForegroundColor Gray
        npm run dev
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "Le serveur s'est arrete (code $LASTEXITCODE). Verifiez les messages d'erreur ci-dessus." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
        }
    } finally {
        Pop-Location
    }
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
        Start-Sleep -Seconds 2
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

function Invoke-Publier-Version-Preprod {
    Push-Location $PSScriptRoot
    try {
        if (-not (Test-Path ".git")) {
            Write-Host "Ce dossier n'est pas un depot Git." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Publier version pre-prod (option 4 puis version/commit + push vers branche preprod)." -ForegroundColor Cyan
        Write-Host "Lancement des tests complets (4)..." -ForegroundColor Gray
        npm run test:all
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Pre-prod bloquee : les tests ont echoue. Corrigez puis relancez 5." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Tests OK. Suite : version, commit, push vers preprod (CI cree la Pre-release)." -ForegroundColor Green
        Write-Host ""
        Write-Host "Choix de version (bump ou actuelle) :" -ForegroundColor Gray
        Write-Host "  major = marketing | schema = Airtable | feature = evolution | hotfix = correction" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  0. Version actuelle (sans bump)"
        Write-Host "  1. major   |  2. schema   |  3. feature   |  4. hotfix"
        Write-Host "  q. Annuler"
        Write-Host ""
        $typeChoix = Read-Host "Choix (0-4 ou q)"
        $useCurrentVersion = ($typeChoix -eq "0")
        $type = switch ($typeChoix) {
            "1" { "major" }
            "2" { "schema" }
            "3" { "feature" }
            "4" { "hotfix" }
            default { $null }
        }
        if (-not $useCurrentVersion -and -not $type) {
            Write-Host "Annule." -ForegroundColor Yellow
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }

        Write-Host "Build (tsc)..." -ForegroundColor Gray
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build en echec." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }

        if ($useCurrentVersion) {
            $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
            $nextVer = $pkg.version.Trim()
            $parts = $nextVer -split '\.' | Where-Object { $_ -match '^\d+$' }
            if (-not $nextVer -or $parts.Count -ne 3) {
                Write-Host "Version dans package.json invalide : $nextVer" -ForegroundColor Red
                Read-Host "Appuyez sur Entree pour revenir au menu"
                return
            }
        } else {
            $bumpOut = node dist/scripts/bump-version-cli.js $type 2>&1 | Out-String
            $verMatches = [regex]::Matches($bumpOut, '\d+\.\d+\.\d+')
            $rawVer = if ($verMatches.Count -gt 0) { $verMatches[$verMatches.Count - 1].Value } else { $null }
            $nextVer = if ($rawVer) { ($rawVer -replace '[^\d.]', '').Trim() } else { $null }
            $parts = if ($nextVer) { $nextVer -split '\.' | Where-Object { $_ -match '^\d+$' } } else { @() }
            if (-not $nextVer -or $parts.Count -ne 3) {
                Write-Host "Bump en echec ou version invalide." -ForegroundColor Red
                Read-Host "Appuyez sur Entree pour revenir au menu"
                return
            }
            $nextVer = $parts -join '.'
        }
        Write-Host "Version pre-prod : $nextVer (release preprod-v$nextVer creee par la CI)." -ForegroundColor Green

        git add -A
        git commit -m "preprod-v$nextVer"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Rien a committer (working tree clean). Push du commit actuel vers preprod." -ForegroundColor DarkYellow
        }
        git push
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Push de la branche en echec. Verifiez la remote et vos acces." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        git push origin HEAD:preprod
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Push vers preprod en echec. Verifiez la remote (la branche preprod sera creee au premier push)." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Branche preprod mise a jour. GitHub Actions va construire l'exe et publier la Pre-release preprod-v$nextVer." -ForegroundColor Green
        Write-Host "Lien : https://github.com/AlainMeunierFr/job-joy/releases" -ForegroundColor Gray
        Write-Host ""
        Read-Host "Appuyez sur Entree pour revenir au menu"
    } catch {
        Write-Host "Erreur : $($_.Exception.Message)" -ForegroundColor Red
        Read-Host "Appuyez sur Entree pour revenir au menu"
    } finally {
        Pop-Location
    }
}

function Invoke-Publier-Version-CI {
    Push-Location $PSScriptRoot
    try {
        if (-not (Test-Path ".git")) {
            Write-Host "Ce dossier n'est pas un depot Git." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Rendre public (bump + commit + tag v* + push ; CI construit l'exe, release stable)" -ForegroundColor Cyan
        Write-Host "  major = marketing | schema = Airtable | feature = evolution | hotfix = correction" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  0. Version actuelle (sans bump)"
        Write-Host "  1. major   |  2. schema   |  3. feature   |  4. hotfix"
        Write-Host "  q. Annuler"
        Write-Host ""
        $typeChoix = Read-Host "Choix (0-4 ou q)"
        $useCurrentVersion = ($typeChoix -eq "0")
        $type = switch ($typeChoix) {
            "1" { "major" }
            "2" { "schema" }
            "3" { "feature" }
            "4" { "hotfix" }
            default { $null }
        }
        if (-not $useCurrentVersion -and -not $type) {
            Write-Host "Annule." -ForegroundColor Yellow
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }

        Write-Host "Build (tsc)..." -ForegroundColor Gray
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build en echec." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }

        if ($useCurrentVersion) {
            $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
            $nextVer = $pkg.version.Trim()
            $parts = $nextVer -split '\.' | Where-Object { $_ -match '^\d+$' }
            if (-not $nextVer -or $parts.Count -ne 3) {
                Write-Host "Version dans package.json invalide : $nextVer" -ForegroundColor Red
                Read-Host "Appuyez sur Entree pour revenir au menu"
                return
            }
            $tagName = "v$nextVer"
        } else {
            $bumpOut = node dist/scripts/bump-version-cli.js $type 2>&1 | Out-String
            $verMatches = [regex]::Matches($bumpOut, '\d+\.\d+\.\d+')
            $rawVer = if ($verMatches.Count -gt 0) { $verMatches[$verMatches.Count - 1].Value } else { $null }
            $nextVer = if ($rawVer) { ($rawVer -replace '[^\d.]', '').Trim() } else { $null }
            $parts = if ($nextVer) { $nextVer -split '\.' | Where-Object { $_ -match '^\d+$' } } else { @() }
            if (-not $nextVer -or $parts.Count -ne 3) {
                Write-Host "Bump en echec ou version invalide." -ForegroundColor Red
                Read-Host "Appuyez sur Entree pour revenir au menu"
                return
            }
            $nextVer = $parts -join '.'
            $tagName = "v$nextVer"
        }
        Write-Host "Version : $tagName" -ForegroundColor Green

        git add -A
        git commit -m "Release $tagName"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Rien a committer (working tree clean). Tag et push du commit actuel." -ForegroundColor DarkYellow
        }
        $tagLocal = git tag -l $tagName 2>$null
        if ($tagLocal) {
            git tag -d $tagName 2>$null
            Write-Host "Tag local $tagName supprime." -ForegroundColor Gray
        }
        $tagRemote = git ls-remote origin "refs/tags/$tagName" 2>$null
        if ($tagRemote) {
            git push origin ":refs/tags/$tagName" 2>$null
            Write-Host "Tag distant $tagName supprime." -ForegroundColor Gray
        }
        git tag $tagName
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Tag en echec." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        git push
        git push origin $tagName
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Push en echec. Verifiez la remote et vos acces." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Tag $tagName pousse. GitHub Actions va construire l'exe et publier la release stable." -ForegroundColor Green
        Write-Host "Lien : https://github.com/AlainMeunierFr/job-joy/releases" -ForegroundColor Gray
        Write-Host ""
        Read-Host "Appuyez sur Entree pour revenir au menu"
    } catch {
        Write-Host "Erreur : $($_.Exception.Message)" -ForegroundColor Red
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
        "2" { Forcer-Kill-Et-Relancer-Serveur; break }
        "3" { Lancer-Tests-Integration-Airtable }
        "4" { Lancer-Tests-Complets }
        "5" { Invoke-Publier-Version-Preprod }
        "6" { Invoke-Publier-Version-CI }
        "q" { Write-Host "Au revoir." -ForegroundColor Cyan; exit 0 }
        "Q" { Write-Host "Au revoir." -ForegroundColor Cyan; exit 0 }
        default { Write-Host "Choix invalide." -ForegroundColor Red; Start-Sleep -Seconds 2 }
    }
} while ($true)

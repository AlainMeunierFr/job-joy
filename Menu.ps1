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
    Write-Host "  6. Sauvegarder sur GitHub (add + commit + push, sans version)"
    Write-Host "  7. Recuperer les mises a jour (git pull)"
    Write-Host "  8. Publier une version (bump + commit + tag + push)"
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

function Invoke-Publier-Version {
    Push-Location $PSScriptRoot
    try {
        if (-not (Test-Path ".git")) {
            Write-Host "Ce dossier n'est pas un depot Git." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        Write-Host "Publier une version (major.minor.patch)" -ForegroundColor Cyan
        Write-Host "  major = marketing (gros changement) | minor = schema (Airtable, attention) | patch = evolution et correction" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  0. Version actuelle (sans bump ; ecrase le tag si deja existant)"
        Write-Host "  1. major   (gros changement, signal marketing)"
        Write-Host "  2. schema  (changement de schema Airtable / parametres - attention)"
        Write-Host "  3. feature (evolution)"
        Write-Host "  4. hotfix  (correction de bugs)"
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

        Write-Host "Build..." -ForegroundColor Gray
        $buildOut = npm run build 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build en echec." -ForegroundColor Red
            Write-Host $buildOut -ForegroundColor Gray
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
            Write-Host "Version actuelle : $tagName (tag existant sera ecrase si present)" -ForegroundColor Green
        } else {
            $bumpOut = node dist/scripts/bump-version-cli.js $type 2>&1 | Out-String
            $verMatches = [regex]::Matches($bumpOut, '\d+\.\d+\.\d+')
            $rawVer = if ($verMatches.Count -gt 0) { $verMatches[$verMatches.Count - 1].Value } else { $null }
            $nextVer = if ($rawVer) { ($rawVer -replace '[^\d.]', '').Trim() } else { $null }
            $parts = if ($nextVer) { $nextVer -split '\.' | Where-Object { $_ -match '^\d+$' } } else { @() }
            if (-not $nextVer -or $parts.Count -ne 3) {
                $preview = $bumpOut.Trim(); if ($preview.Length -gt 80) { $preview = $preview.Substring(0, 80) + "..." }
                Write-Host "Bump en echec ou version invalide (sortie : $preview)" -ForegroundColor Red
                Read-Host "Appuyez sur Entree pour revenir au menu"
                return
            }
            $nextVer = $parts -join '.'
            $tagName = "v$nextVer"
            Write-Host "Nouvelle version : $tagName (bump en attente de build Electron reussi)" -ForegroundColor Green
        }

        Write-Host "Arret des processus Job-Joy / Electron (eviter verrou)..." -ForegroundColor Gray
        Get-Process -Name "Job-Joy", "electron", "Electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Get-Process | Where-Object { $_.Path -and $_.Path -like "*job-joy*" } | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        $releaseOutDir = Join-Path $PSScriptRoot "dist-electron-release"
        if (Test-Path $releaseOutDir) {
            Remove-Item $releaseOutDir -Recurse -Force -ErrorAction SilentlyContinue
        }
        Write-Host "Build Electron (dossier de sortie : dist-electron-release)..." -ForegroundColor Gray
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build (tsc) en echec." -ForegroundColor Red
            git checkout -- package.json
            if (Test-Path "package-lock.json") { git checkout -- package-lock.json }
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
        $env:CSC_LINK = ''
        $env:CSC_KEY_PASSWORD = ''
        $env:WIN_CSC_LINK = ''
        $env:WIN_CSC_KEY_PASSWORD = ''
        # Vidage complet du cache electron-builder pour eviter chemin sign/noop en cache
        $ebCache = Join-Path $env:LOCALAPPDATA "electron-builder\Cache"
        if (Test-Path $ebCache) {
            Remove-Item $ebCache -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "Cache electron-builder vide." -ForegroundColor Gray
        }
        $releaseConfigPath = Join-Path $env:TEMP "electron-builder-release-$(Get-Random).json"
        # win: uniquement target, icon, signAndEditExecutable = false (aucun sign, cscLink, certificateFile)
        $configObj = @{
            appId = "fr.jobjoy.app"
            productName = "Job-Joy"
            directories = @{ output = "dist-electron-release" }
            forceCodeSigning = $false
            files = @("**/*", "!cucumber-report/**", "!test-results/**", "!playwright-report/**", "!.features-gen/**", "!coverage/**")
            win = @{
                target = @("nsis")
                icon = ""
                signAndEditExecutable = $false
            }
            nsis = @{ oneClick = $false; allowToChangeInstallationDirectory = $true }
        }
        $configObj | ConvertTo-Json -Depth 10 -Compress | Set-Content -Path $releaseConfigPath -Encoding UTF8 -NoNewline
        try {
            & npx --yes electron-builder --config $releaseConfigPath
        } finally {
            Remove-Item $releaseConfigPath -ErrorAction SilentlyContinue
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "Build Electron en echec. Bump annule (version inchangee)." -ForegroundColor Red
            Write-Host "Si erreur 'symbolic link' / winCodeSign : lancez PowerShell en Administrateur, relancez l'option 8 (une fois le cache extrait, les builds suivants pourront se faire sans admin)." -ForegroundColor Gray
            Write-Host "Si erreur 'fichier utilise par un autre processus' : fermez l'app Job-Joy, fermez l'Explorateur sur dist-electron, puis reessayez." -ForegroundColor Gray
            git checkout -- package.json
            if (Test-Path "package-lock.json") { git checkout -- package-lock.json }
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }

        $installerExe = Get-ChildItem -Path $releaseOutDir -Filter "Job-Joy Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($installerExe) {
            Write-Host "Installateur NSIS : $($installerExe.Name)" -ForegroundColor Green
            Write-Host "(Non signe pour la beta : Windows peut afficher ""Editeur inconnu"" ; clic ""Plus d infos"" puis ""Executer quand meme"".)" -ForegroundColor Gray
        }

        Write-Host "Commit + tag + push..." -ForegroundColor Gray
        git add -A
        git commit -m "Release $tagName"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Commit en echec (rien a committer ?)." -ForegroundColor Red
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }
        # Ecraser le tag s'il existe deja (local et/ou distant)
        $tagLocal = git tag -l $tagName 2>$null
        if ($tagLocal) {
            git tag -d $tagName 2>$null
            Write-Host "Tag local $tagName supprime (ecrasement)." -ForegroundColor Gray
        }
        $tagRemote = git ls-remote origin "refs/tags/$tagName" 2>$null
        if ($tagRemote) {
            git push origin ":refs/tags/$tagName" 2>$null
            Write-Host "Tag distant $tagName supprime (ecrasement)." -ForegroundColor Gray
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

        $exeDir = Join-Path $PSScriptRoot "dist-electron-release"
        $asset = Get-ChildItem -Path $exeDir -Filter "Job-Joy Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $asset) { $asset = Get-ChildItem -Path $exeDir -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 }
        if (-not $asset) {
            Write-Host "Aucun installateur NSIS (.exe) trouve dans dist-electron-release. Release GitHub non creee." -ForegroundColor Yellow
            Write-Host "Version $tagName poussee (tag seul). Creer la release a la main sur GitHub si besoin." -ForegroundColor Gray
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }

        $gh = Get-Command gh -ErrorAction SilentlyContinue
        if (-not $gh) {
            Write-Host "GitHub CLI (gh) non installe. Tag pousse ; pour creer la release avec l'archive :" -ForegroundColor Yellow
            Write-Host "  gh release create $tagName $($asset.FullName) --title ""Release $tagName"" --notes ""Release $tagName""" -ForegroundColor Gray
            Write-Host "Ou installez gh : winget install GitHub.cli" -ForegroundColor Gray
            Read-Host "Appuyez sur Entree pour revenir au menu"
            return
        }

        Write-Host "Creation de la release GitHub $tagName avec $($asset.Name)..." -ForegroundColor Gray
        & gh release create $tagName $asset.FullName --title "Release $tagName" --notes "Release $tagName"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Version $tagName publiee (tag + release + installateur NSIS)." -ForegroundColor Green
            Write-Host "Lien a partager : https://github.com/AlainMeunierFr/job-joy/releases/latest" -ForegroundColor Cyan
        } else {
            Write-Host "gh release create en echec (droits ? release deja existante ?)." -ForegroundColor Red
        }
        Write-Host ""
        Read-Host "Appuyez sur Entree pour revenir au menu"
    } catch {
        Write-Host "Erreur inattendue : $($_.Exception.Message)" -ForegroundColor Red
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
        "8" { Invoke-Publier-Version }
        "q" { Write-Host "Au revoir." -ForegroundColor Cyan; exit 0 }
        "Q" { Write-Host "Au revoir." -ForegroundColor Cyan; exit 0 }
        default { Write-Host "Choix invalide." -ForegroundColor Red; Start-Sleep -Seconds 2 }
    }
} while ($true)

# Build Electron release uniquement (meme config que Menu option 8, sans bump/commit).
# Usage : .\scripts\test-electron-build.ps1
# Permet de tester en boucle depuis le terminal ou un CI sans passer par le menu.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
$env:CSC_LINK = ''
$env:CSC_KEY_PASSWORD = ''
$env:WIN_CSC_LINK = ''
$env:WIN_CSC_KEY_PASSWORD = ''
# Vidage complet du cache electron-builder pour eviter chemin sign/noop en cache
$ebCache = Join-Path $env:LOCALAPPDATA "electron-builder\Cache"
if (Test-Path $ebCache) {
    Remove-Item $ebCache -Recurse -Force -ErrorAction SilentlyContinue
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
    $code = $LASTEXITCODE
} finally {
    Remove-Item $releaseConfigPath -ErrorAction SilentlyContinue
}
exit $code

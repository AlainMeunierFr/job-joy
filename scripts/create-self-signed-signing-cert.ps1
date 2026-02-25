# Create self-signed code signing certificate for Job-Joy (POC).
# Run once. Exports to tools/job-joy-signing.pfx. Electron/build is "technically" satisfied;
# Windows will still show "Unknown publisher" / SmartScreen (no trust for self-signed).
#
# Usage: from project root:
#   .\scripts\create-self-signed-signing-cert.ps1
# You will be prompted for a password to protect the .pfx (remember it for JOB_JOY_SIGNING_PFX_PASSWORD).

$ErrorActionPreference = 'Stop'
$toolsDir = Join-Path $PSScriptRoot ".." "tools"
$pfxPath = Join-Path $toolsDir "job-joy-signing.pfx"

New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null

$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Job-Joy POC" -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(3)
$password = Read-Host "Mot de passe pour proteger le .pfx (a mettre dans JOB_JOY_SIGNING_PFX_PASSWORD)" -AsSecureString
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force

Write-Host "Certificat exporte : $pfxPath" -ForegroundColor Green
Write-Host "Pour signer a chaque release : definissez la variable d'environnement JOB_JOY_SIGNING_PFX_PASSWORD avec ce mot de passe, ou creez tools\.signing-password (contenu = mot de passe, fichier ignore par git)." -ForegroundColor Gray

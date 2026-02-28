# Dossiers à inclure pour estimation tokens
$includeDirs = @("app","data","docs","electron","scripts","temps","tests","types","utils")

# Obtenir tous les fichiers pertinents
$files = Get-ChildItem -Recurse -File | Where-Object { $includeDirs -contains $_.Directory.Name }

# Nombre de fichiers
$fileCount = $files.Count

# Nombre total de lignes
$lineCount = ($files | Get-Content | Measure-Object -Line).Lines

# Taille totale (en MB)
$sizeMB = ($files | Measure-Object -Property Length -Sum).Sum / 1MB

# Répartition par dossier
$folderStats = $files | Group-Object Directory | Sort-Object Count -Descending | Select-Object Count, Name

# Affichage
Write-Output "Fichiers inclus pour IA : $fileCount"
Write-Output "Lignes totales : $lineCount"
Write-Output ("Taille totale : {0:N2} MB" -f $sizeMB)
Write-Output "Répartition par dossier :"
$folderStats
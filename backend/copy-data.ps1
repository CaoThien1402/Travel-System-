# Copy data folder to dist after TypeScript compilation
$sourcePath = "src\data"
$destPath = "dist\data"

Write-Host "Copying data folder to dist..." -ForegroundColor Yellow

if (Test-Path $destPath) {
    Remove-Item -Path $destPath -Recurse -Force
}

Copy-Item -Path $sourcePath -Destination $destPath -Recurse

Write-Host "Data folder copied successfully" -ForegroundColor Green

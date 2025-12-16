# Setup Semantic Search for Backend
# Chạy script này một lần để cài đặt dependencies và tạo embeddings

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Semantic Search for Search Bar" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Đường dẫn
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonDir = Join-Path $ScriptDir "src\python"
$RequirementsFile = Join-Path $PythonDir "requirements.txt"
$SemanticSearchScript = Join-Path $PythonDir "semantic_search.py"

# Kiểm tra Python
Write-Host "[1/3] Kiểm tra Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python không được cài đặt!" -ForegroundColor Red
    Write-Host "  Vui lòng cài đặt Python từ https://python.org" -ForegroundColor Red
    exit 1
}

# Cài đặt dependencies
Write-Host ""
Write-Host "[2/3] Cài đặt Python dependencies..." -ForegroundColor Yellow
if (Test-Path $RequirementsFile) {
    pip install -r $RequirementsFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Dependencies đã được cài đặt" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Lỗi cài đặt dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ✗ Không tìm thấy requirements.txt" -ForegroundColor Red
    exit 1
}

# Tạo embeddings
Write-Host ""
Write-Host "[3/3] Tạo hotel embeddings (có thể mất vài phút)..." -ForegroundColor Yellow
if (Test-Path $SemanticSearchScript) {
    python $SemanticSearchScript --create-embeddings
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Embeddings đã được tạo" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Lỗi tạo embeddings" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ✗ Không tìm thấy semantic_search.py" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup hoàn tất!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Bây giờ bạn có thể chạy backend và frontend:" -ForegroundColor Cyan
Write-Host "  Terminal 1: cd backend && npm run dev" -ForegroundColor White
Write-Host "  Terminal 2: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "API Semantic Search: http://localhost:5000/api/semantic-search" -ForegroundColor Cyan

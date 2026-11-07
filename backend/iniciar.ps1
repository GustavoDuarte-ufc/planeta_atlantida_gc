# Sobe o back-end do Portal do Patrocinador (PowerShell).
# Uso:   cd backend ; .\iniciar.ps1
# Se o PowerShell bloquear scripts:  Set-ExecutionPolicy -Scope Process Bypass

Set-Location $PSScriptRoot

# Maven: usa o do PATH; senão tenta o caminho padrão deste projeto
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
    $mvn = "C:\tools\apache-maven-3.9.9\bin"
    if (Test-Path $mvn) { $env:Path += ";$mvn" } else { Write-Host "Maven nao encontrado. Instale ou ajuste o caminho no iniciar.ps1." -ForegroundColor Red; exit 1 }
}

# Configuracao local do Instagram/MongoDB
if (-not (Test-Path "config\application.yml")) {
    Copy-Item "config\application.example.yml" "config\application.yml"
    Write-Host "Criei config\application.yml. Preencha a URI do MongoDB nele, salve e rode de novo." -ForegroundColor Yellow
    notepad "config\application.yml"
    exit 0
}

# Porta 8080 ocupada?
$ocupada = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($ocupada) {
    $id = $ocupada[0].OwningProcess
    Write-Host "A porta 8080 esta em uso (processo $id). Feche o outro back-end ou rode: Stop-Process -Id $id -Force" -ForegroundColor Red
    exit 1
}

mvn spring-boot:run

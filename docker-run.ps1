# Tercih Sihirbazı Docker Runner Script (PowerShell)

param(
    [Parameter(Position=0)]
    [ValidateSet("simple", "full", "frontend", "tools", "stop", "clean", "logs", "status", "help")]
    [string]$Action = "help"
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

function Test-Docker {
    try {
        docker info | Out-Null
        Write-Success "Docker is running"
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker and try again."
        return $false
    }
}

function Test-DockerCompose {
    try {
        docker-compose --version | Out-Null
        Write-Success "Docker Compose is available"
        return $true
    }
    catch {
        Write-Error "Docker Compose is not installed. Please install Docker Compose and try again."
        return $false
    }
}

function Show-Usage {
    Write-Host "Usage: .\docker-run.ps1 [OPTION]" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor $Colors.White
    Write-Host "  simple      Run simple server only (no database)" -ForegroundColor $Colors.White
    Write-Host "  full        Run full stack (backend + database + redis)" -ForegroundColor $Colors.White
    Write-Host "  frontend    Run with frontend (nginx)" -ForegroundColor $Colors.White
    Write-Host "  tools       Run with additional tools (adminer)" -ForegroundColor $Colors.White
    Write-Host "  stop        Stop all containers" -ForegroundColor $Colors.White
    Write-Host "  clean       Stop and remove all containers and volumes" -ForegroundColor $Colors.White
    Write-Host "  logs        Show logs from all containers" -ForegroundColor $Colors.White
    Write-Host "  status      Show status of all containers" -ForegroundColor $Colors.White
    Write-Host "  help        Show this help message" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor $Colors.White
    Write-Host "  .\docker-run.ps1 simple     # Quick test with simple server" -ForegroundColor $Colors.White
    Write-Host "  .\docker-run.ps1 full       # Full production setup" -ForegroundColor $Colors.White
    Write-Host "  .\docker-run.ps1 frontend   # With nginx frontend" -ForegroundColor $Colors.White
    Write-Host "  .\docker-run.ps1 clean      # Clean everything" -ForegroundColor $Colors.White
}

function Start-SimpleServer {
    Write-Status "Starting simple server..."
    docker-compose --profile simple up -d simple-server
    Write-Success "Simple server started on http://localhost:3001"
}

function Start-FullStack {
    Write-Status "Starting full stack (database + redis + backend)..."
    docker-compose up -d database redis backend
    Write-Success "Full stack started:"
    Write-Host "  - Backend API: http://localhost:3000" -ForegroundColor $Colors.White
    Write-Host "  - Database: localhost:5432" -ForegroundColor $Colors.White
    Write-Host "  - Redis: localhost:6379" -ForegroundColor $Colors.White
}

function Start-WithFrontend {
    Write-Status "Starting with frontend..."
    docker-compose --profile frontend up -d
    Write-Success "Full stack with frontend started:"
    Write-Host "  - Frontend: http://localhost" -ForegroundColor $Colors.White
    Write-Host "  - Backend API: http://localhost:3000" -ForegroundColor $Colors.White
    Write-Host "  - Database: localhost:5432" -ForegroundColor $Colors.White
    Write-Host "  - Redis: localhost:6379" -ForegroundColor $Colors.White
}

function Start-WithTools {
    Write-Status "Starting with tools..."
    docker-compose --profile tools --profile frontend up -d
    Write-Success "Full stack with tools started:"
    Write-Host "  - Frontend: http://localhost" -ForegroundColor $Colors.White
    Write-Host "  - Backend API: http://localhost:3000" -ForegroundColor $Colors.White
    Write-Host "  - Database: localhost:5432" -ForegroundColor $Colors.White
    Write-Host "  - Redis: localhost:6379" -ForegroundColor $Colors.White
    Write-Host "  - Adminer: http://localhost:8080" -ForegroundColor $Colors.White
}

function Stop-Containers {
    Write-Status "Stopping all containers..."
    docker-compose --profile simple --profile frontend --profile tools down
    Write-Success "All containers stopped"
}

function Remove-Everything {
    Write-Warning "This will remove all containers, networks, and volumes!"
    $confirmation = Read-Host "Are you sure? (y/N)"
    if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
        Write-Status "Cleaning all containers, networks, and volumes..."
        docker-compose --profile simple --profile frontend --profile tools down -v --remove-orphans
        docker system prune -f
        Write-Success "Everything cleaned"
    }
    else {
        Write-Status "Clean cancelled"
    }
}

function Show-Logs {
    Write-Status "Showing logs from all containers..."
    docker-compose --profile simple --profile frontend --profile tools logs -f
}

function Show-Status {
    Write-Status "Container status:"
    docker-compose --profile simple --profile frontend --profile tools ps
    Write-Host ""
    Write-Status "Docker system info:"
    docker system df
}

# Main script logic
if (-not (Test-Docker) -or -not (Test-DockerCompose)) {
    exit 1
}

switch ($Action) {
    "simple" { Start-SimpleServer }
    "full" { Start-FullStack }
    "frontend" { Start-WithFrontend }
    "tools" { Start-WithTools }
    "stop" { Stop-Containers }
    "clean" { Remove-Everything }
    "logs" { Show-Logs }
    "status" { Show-Status }
    "help" { Show-Usage }
    default { Show-Usage }
}
#!/bin/bash

# Tercih Sihirbazı Docker Runner Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    fi
    print_success "Docker Compose is available"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  simple      Run simple server only (no database)"
    echo "  full        Run full stack (backend + database + redis)"
    echo "  frontend    Run with frontend (nginx)"
    echo "  tools       Run with additional tools (adminer)"
    echo "  stop        Stop all containers"
    echo "  clean       Stop and remove all containers and volumes"
    echo "  logs        Show logs from all containers"
    echo "  status      Show status of all containers"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 simple     # Quick test with simple server"
    echo "  $0 full       # Full production setup"
    echo "  $0 frontend   # With nginx frontend"
    echo "  $0 clean      # Clean everything"
}

# Function to run simple server
run_simple() {
    print_status "Starting simple server..."
    docker-compose --profile simple up -d simple-server
    print_success "Simple server started on http://localhost:3001"
}

# Function to run full stack
run_full() {
    print_status "Starting full stack (database + redis + backend)..."
    docker-compose up -d database redis backend
    print_success "Full stack started:"
    echo "  - Backend API: http://localhost:3000"
    echo "  - Database: localhost:5432"
    echo "  - Redis: localhost:6379"
}

# Function to run with frontend
run_frontend() {
    print_status "Starting with frontend..."
    docker-compose --profile frontend up -d
    print_success "Full stack with frontend started:"
    echo "  - Frontend: http://localhost"
    echo "  - Backend API: http://localhost:3000"
    echo "  - Database: localhost:5432"
    echo "  - Redis: localhost:6379"
}

# Function to run with tools
run_tools() {
    print_status "Starting with tools..."
    docker-compose --profile tools --profile frontend up -d
    print_success "Full stack with tools started:"
    echo "  - Frontend: http://localhost"
    echo "  - Backend API: http://localhost:3000"
    echo "  - Database: localhost:5432"
    echo "  - Redis: localhost:6379"
    echo "  - Adminer: http://localhost:8080"
}

# Function to stop containers
stop_containers() {
    print_status "Stopping all containers..."
    docker-compose --profile simple --profile frontend --profile tools down
    print_success "All containers stopped"
}

# Function to clean everything
clean_all() {
    print_warning "This will remove all containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning all containers, networks, and volumes..."
        docker-compose --profile simple --profile frontend --profile tools down -v --remove-orphans
        docker system prune -f
        print_success "Everything cleaned"
    else
        print_status "Clean cancelled"
    fi
}

# Function to show logs
show_logs() {
    print_status "Showing logs from all containers..."
    docker-compose --profile simple --profile frontend --profile tools logs -f
}

# Function to show status
show_status() {
    print_status "Container status:"
    docker-compose --profile simple --profile frontend --profile tools ps
    echo ""
    print_status "Docker system info:"
    docker system df
}

# Main script logic
case "${1:-help}" in
    simple)
        check_docker
        check_docker_compose
        run_simple
        ;;
    full)
        check_docker
        check_docker_compose
        run_full
        ;;
    frontend)
        check_docker
        check_docker_compose
        run_frontend
        ;;
    tools)
        check_docker
        check_docker_compose
        run_tools
        ;;
    stop)
        check_docker
        check_docker_compose
        stop_containers
        ;;
    clean)
        check_docker
        check_docker_compose
        clean_all
        ;;
    logs)
        check_docker
        check_docker_compose
        show_logs
        ;;
    status)
        check_docker
        check_docker_compose
        show_status
        ;;
    help|*)
        show_usage
        ;;
esac
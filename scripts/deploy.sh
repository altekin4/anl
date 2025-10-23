#!/bin/bash

# Tercih Sihirbazı Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.${ENVIRONMENT}"

echo -e "${BLUE}🚀 Starting Tercih Sihirbazı deployment...${NC}"
echo -e "${BLUE}📍 Environment: ${ENVIRONMENT}${NC}"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Environment file $ENV_FILE not found!${NC}"
    echo -e "${YELLOW}💡 Please create $ENV_FILE based on .env.example${NC}"
    exit 1
fi

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("DB_PASSWORD" "JWT_SECRET" "OPENAI_API_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set!${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment validation passed${NC}"

# Build and start services
echo -e "${BLUE}🔨 Building and starting services...${NC}"

if [ "$ENVIRONMENT" = "development" ]; then
    docker-compose -f $COMPOSE_FILE -f docker-compose.dev.yml --env-file $ENV_FILE up --build -d
elif [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f $COMPOSE_FILE -f docker-compose.prod.yml --env-file $ENV_FILE up --build -d
else
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up --build -d
fi

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service health
services=("tercih-sihirbazi-db" "tercih-sihirbazi-cache" "tercih-sihirbazi-app")
for service in "${services[@]}"; do
    echo -e "${BLUE}🔍 Checking $service...${NC}"
    
    # Wait up to 60 seconds for service to be healthy
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker ps --filter "name=$service" --filter "health=healthy" | grep -q $service; then
            echo -e "${GREEN}✅ $service is healthy${NC}"
            break
        elif docker ps --filter "name=$service" --filter "health=unhealthy" | grep -q $service; then
            echo -e "${RED}❌ $service is unhealthy${NC}"
            docker logs $service --tail 20
            exit 1
        else
            echo -e "${YELLOW}⏳ Waiting for $service to be ready... (${timeout}s remaining)${NC}"
            sleep 2
            timeout=$((timeout-2))
        fi
    done
    
    if [ $timeout -le 0 ]; then
        echo -e "${RED}❌ Timeout waiting for $service to be healthy${NC}"
        docker logs $service --tail 20
        exit 1
    fi
done

# Run database migrations
echo -e "${BLUE}🗃️  Running database migrations...${NC}"
docker exec tercih-sihirbazi-app node scripts/migrate.js

# Final health check
echo -e "${BLUE}🏥 Performing final health check...${NC}"
if curl -f http://localhost:${PORT:-3000}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is healthy and ready!${NC}"
else
    echo -e "${RED}❌ Final health check failed${NC}"
    exit 1
fi

# Show deployment summary
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "   Environment: ${ENVIRONMENT}"
echo -e "   Application URL: http://localhost:${PORT:-3000}"
echo -e "   Health Check: http://localhost:${PORT:-3000}/health"

if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "   Database: localhost:5432"
    echo -e "   Redis: localhost:6379"
fi

echo -e "${YELLOW}💡 Useful commands:${NC}"
echo -e "   View logs: docker-compose logs -f"
echo -e "   Stop services: docker-compose down"
echo -e "   Restart: docker-compose restart"
echo -e "   Migration status: docker exec tercih-sihirbazi-app node scripts/migrate.js status"
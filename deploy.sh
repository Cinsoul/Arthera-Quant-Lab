#!/bin/bash

# ==================== Arthera Trading Engine Deployment Script ====================
# This script sets up and deploys the complete Arthera Trading Engine system
# with real-time data integration from QuantEngine, qlib, and MLModelTrainingTool

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                   Arthera Trading Engine                        ║"
echo "║                   Deployment Setup Script                       ║"
echo "║                                                                  ║"
echo "║  🚀 Real-time Dynamic Data Integration                          ║"
echo "║  📊 QuantEngine + qlib + MLModelTrainingTool                    ║"
echo "║  🎯 Production-ready Docker deployment                          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to print step headers
print_step() {
    echo -e "\n${GREEN}📋 $1${NC}"
    echo "────────────────────────────────────────────────────"
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking Prerequisites"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
        echo "   Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker found: $(docker --version)${NC}"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
        echo "   Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker Compose found: $(docker-compose --version)${NC}"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${YELLOW}⚠️  Python 3 not found. Some features may be limited.${NC}"
    else
        echo -e "${GREEN}✅ Python found: $(python3 --version)${NC}"
    fi
    
    # Check available memory
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        total_mem=$(echo "$(sysctl -n hw.memsize) / 1024 / 1024 / 1024" | bc)
        echo -e "${GREEN}✅ System Memory: ${total_mem}GB${NC}"
        if [[ $total_mem -lt 4 ]]; then
            echo -e "${YELLOW}⚠️  Warning: Less than 4GB RAM available. Consider increasing Docker memory allocation.${NC}"
        fi
    fi
}

# Function to setup environment
setup_environment() {
    print_step "Setting Up Environment"
    
    # Create .env file if it doesn't exist
    if [[ ! -f .env ]]; then
        echo "📝 Creating .env file from template..."
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created. Please configure your settings.${NC}"
        echo -e "${YELLOW}💡 Key configurations:${NC}"
        echo "   - TUSHARE_TOKEN: Get from https://tushare.pro for Chinese market data"
        echo "   - POSTGRES_PASSWORD: Change the default password for security"
        echo "   - SECRET_KEY: Generate a secure secret key"
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
    
    # Create necessary directories
    mkdir -p logs data/postgres data/redis monitoring/grafana monitoring/prometheus
    echo -e "${GREEN}✅ Created necessary directories${NC}"
    
    # Set proper permissions
    chmod +x scripts/*.sh 2>/dev/null || true
    echo -e "${GREEN}✅ Set script permissions${NC}"
}

# Function to build and start services
deploy_services() {
    print_step "Building and Starting Services"
    
    # Stop any existing containers
    echo "🛑 Stopping existing containers..."
    docker-compose down -v || true
    
    # Build images
    echo "🔨 Building Docker images..."
    docker-compose build --no-cache
    
    # Start core services first
    echo "🚀 Starting database services..."
    docker-compose up -d postgres redis
    
    # Wait for databases to be ready
    echo "⏳ Waiting for databases to be ready..."
    sleep 10
    
    # Start backend services
    echo "🚀 Starting backend services..."
    docker-compose up -d api-gateway ios-connector
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 15
    
    # Start all remaining services
    echo "🚀 Starting all services..."
    docker-compose up -d
    
    echo -e "${GREEN}✅ All services started successfully${NC}"
}

# Function to verify deployment
verify_deployment() {
    print_step "Verifying Deployment"
    
    # Check service health
    services=(
        "http://localhost:8000/health|API Gateway"
        "http://localhost:8001/health|Demo Server" 
        "http://localhost:8002/health|iOS Connector"
    )
    
    for service in "${services[@]}"; do
        url=$(echo $service | cut -d'|' -f1)
        name=$(echo $service | cut -d'|' -f2)
        
        echo -n "🔍 Checking $name... "
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Healthy${NC}"
        else
            echo -e "${RED}❌ Not responding${NC}"
        fi
    done
    
    # Check Docker containers
    echo -e "\n📊 Container Status:"
    docker-compose ps
}

# Function to show access information
show_access_info() {
    print_step "🎉 Deployment Complete!"
    
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                     🚀 SUCCESS!                                  ║"
    echo "║        Arthera Trading Engine is now running!                   ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "📍 Service Access Points:"
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│ 🌐 Main Trading Interface:  http://localhost:8001                │"
    echo "│ 🔧 API Gateway:            http://localhost:8000                 │"
    echo "│ 📱 iOS Connector:          http://localhost:8002                 │"
    echo "│ 📊 System Health:          http://localhost:8000/health          │"
    echo "│ 📈 Grafana Dashboard:      http://localhost:3000 (admin/admin)   │"
    echo "│ 🔍 Prometheus:            http://localhost:9090                  │"
    echo "└─────────────────────────────────────────────────────────────────┘"
    
    echo -e "\n💡 Quick Start Tips:"
    echo "   • Open http://localhost:8001 for the main trading dashboard"
    echo "   • Configure your Tushare token in .env for real Chinese market data"
    echo "   • Check logs with: docker-compose logs -f"
    echo "   • Stop services with: docker-compose down"
    echo "   • View this info again with: ./deploy.sh --info"
    
    echo -e "\n📚 Real-time Data Sources Active:"
    echo "   ✅ QuantEngine: Machine learning models and backtest results"
    echo "   ✅ qlib: Quantitative investment platform with Alpha158 features"
    echo "   ✅ MLModelTrainingTool: CoreML cache prediction models"
    echo "   ✅ iOS Connector: Real-time bridge for Swift quantitative services"
    
    echo -e "\n🛠️  Advanced Management:"
    echo "   • Restart services: docker-compose restart"
    echo "   • View logs: docker-compose logs -f [service_name]"
    echo "   • Scale services: docker-compose up -d --scale api-gateway=2"
    echo "   • Update images: docker-compose pull && docker-compose up -d"
}

# Function to show help
show_help() {
    echo "Arthera Trading Engine Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --full          Full deployment (default)"
    echo "  --quick         Quick deployment (skip some checks)"
    echo "  --info          Show service information"
    echo "  --stop          Stop all services"
    echo "  --clean         Stop services and clean data"
    echo "  --logs          Show logs"
    echo "  --help          Show this help message"
    echo ""
}

# Function to show service info
show_info() {
    print_step "Service Information"
    docker-compose ps
    show_access_info
}

# Function to stop services
stop_services() {
    print_step "Stopping Services"
    docker-compose down
    echo -e "${GREEN}✅ All services stopped${NC}"
}

# Function to clean deployment
clean_deployment() {
    print_step "Cleaning Deployment"
    echo -e "${YELLOW}⚠️  This will remove all containers and data. Are you sure? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        docker-compose down -v --remove-orphans
        docker system prune -f
        echo -e "${GREEN}✅ Cleanup completed${NC}"
    else
        echo "❌ Cleanup cancelled"
    fi
}

# Function to show logs
show_logs() {
    print_step "Service Logs"
    docker-compose logs -f
}

# Main execution
case "${1:-}" in
    --help)
        show_help
        ;;
    --info)
        show_info
        ;;
    --stop)
        stop_services
        ;;
    --clean)
        clean_deployment
        ;;
    --logs)
        show_logs
        ;;
    --quick)
        echo "🚀 Quick Deployment Mode"
        setup_environment
        deploy_services
        show_access_info
        ;;
    *)
        echo "🚀 Full Deployment Mode"
        check_prerequisites
        setup_environment
        deploy_services
        verify_deployment
        show_access_info
        ;;
esac
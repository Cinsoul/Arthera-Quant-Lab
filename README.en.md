<div align="center">

[Image](https://github.com/user-attachments/assets/7d122d88-9092-417a-a6b6-baae39a62c65)



</div>
  
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Discord](https://img.shields.io/discord/123456789?color=7289da&logo=discord&logoColor=white)](https://discord.gg/arthera)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/xindi-wang19990526/)
[![X](https://img.shields.io/badge/X-Follow-000000?logo=x)](https://x.com/xindi_w)
[![YouTube](https://img.shields.io/badge/YouTube-Watch-red?logo=youtube)](https://youtube.com/arthera)

[English](README.en.md) | [中文 (简体)](README.md) | [中文 (繁體)](README.zh.md)

</div>

## Arthera Trading Engine

Arthera Trading Engine is a community-driven, multi-agent platform for quantitative trading applications. Our mission is to build the world's largest decentralized quantitative trading community.

It provides a team of TOP quantitative strategies to help you with stock selection, research, tracking, and even trading.

The system keeps all your sensitive information stored locally on your device, ensuring core data security.

Welcome to join our Discord community to share feedback and issues you encounter, and invite more developers to contribute 🔥🔥🔥

> **Note:** Arthera team members will never proactively contact community participants. This project is for educational and research purposes.

## 🌟 Key Features
- **Dual Market Feeds** – Yahoo Finance (global) and AkShare (A-shares) ship out of the box; drop in a `TUSHARE_TOKEN` to unlock Pro-level metadata via the new China provider.
- **Intelligent Stock Search** – The "Target Stock Pool" widget talks to `/market-data/search`, returning paginated CN/US results with live price, change %, exchange, sector, and market-cap badges.
- **Full Strategy Pipeline** – QuantEngine, Quant Lab, Paper OMS, Risk Engine, and Portfolio analytics converge inside the FastAPI gateway for signal generation, order routing, and dashboard aggregation.
- **Bloomberg-style UI** – Real-time cards for performance, drawdowns, allocations, risk metrics, orders, and AI recommendations; one script spins up the entire experience.
- **iOS Connector** – REST + WebSocket endpoints (port 8002) mirror the Swift SDK contracts so mobile clients receive pushes, run backtests, and submit orders instantly.
- **Live Data Source Controls** – `POST /config/data-source` lets you rotate Tushare tokens at runtime; the front end updates status indicators automatically.
- **Real-time Data Integration** – Supports Yahoo Finance, AkShare, Tushare Pro with automatic caching and failover.

## 🏗 Architecture
```
Bloomberg UI → FastAPI Gateway (8000)
                     ├─ YahooMarketProvider (global)
                     ├─ ChinaAStockProvider (AkShare + Tushare)
                     ├─ QuantEngine / Quant Lab / Paper OMS / Portfolio
                     └─ iOS Connector (8002 REST + WS)
```

## 📋 System Requirements

### Required Environment
- **Python 3.8+**
- **Docker Desktop 20.10+**
- **Docker Compose 1.27+**
- **4GB+ RAM** (8GB recommended)
- **5GB+ available disk space**

### Supported Operating Systems
- macOS 10.15+ (Intel/Apple Silicon)
- Windows 10+ (WSL2)
- Linux Ubuntu 18.04+/CentOS 7+

## ⚡ Quick Start

### Option 1: One-Click Launch (Recommended)
```bash
# 1. Clone the project
git clone https://gitlab.com/arthera/quant-lab.git
cd quant-lab

# 2. Initialize environment
./scripts/bootstrap.sh      # create virtual environment and install dependencies

# 3. (Optional) Configure API keys
vim .env                    # edit environment variables

# 4. Start complete system
./start-demo.sh             # launch all Docker containers
```

### Option 2: Simple Launch
```bash
# For quick demos without complex configuration
./start-simple-demo.sh
```

### Option 3: Local Python Run
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start demo server
python demo_server.py

# 3. Access interface
# Open browser: http://localhost:8001
```

Then open `http://localhost:8001` to explore the live dashboard (or `docker-compose up -d` for manual control).

## 🔧 Local Configuration Guide

### Environment Variables Setup

Create a `.env` file (automatically created if using bootstrap script):

```bash
# Data Source Configuration
TUSHARE_TOKEN=your_tushare_token_here          # Optional: Tushare Pro Token
UNIVERSE_SERVICE_URL=                          # Optional: External data service URL
UNIVERSE_API_KEY=                              # Optional: External data API key

# Database Configuration
POSTGRES_URL=postgresql://arthera:arthera123@localhost:5432/trading_engine
REDIS_URL=redis://localhost:6379

# System Configuration
REQUEST_TIMEOUT=30                             # API request timeout (seconds)
POOLS_CONFIG_PATH=config/pools.json           # Stock pool configuration path
DEMO_MODE=true                                 # Demo mode toggle

# iOS Integration Configuration
IOS_WEBSOCKET_PORT=8005                        # iOS WebSocket port
```

### Data Source Configuration

#### 1. Free Data Sources (Default)
System works out of the box with these free data sources:
- **Yahoo Finance**: Global stock real-time quotes
- **AkShare**: China A-share free data

#### 2. Tushare Pro (Recommended)
Get higher quality China market data:

1. Visit [Tushare website](https://tushare.pro) to register
2. Obtain API Token
3. Set in `.env` file:
   ```bash
   TUSHARE_TOKEN=your_tushare_token_here
   ```

#### 3. Custom Data Sources
If you have your own data service:
```bash
UNIVERSE_SERVICE_URL=https://your-api.com
UNIVERSE_API_KEY=your_api_key
```

### Docker Configuration

#### Check Docker Environment
```bash
# Check Docker versions
docker --version
docker-compose --version

# Ensure Docker Desktop is running
docker info
```

#### Port Configuration
Ensure these ports are not in use:
- `8001` - Demo Server (demo_server.py)
- `8000` - API Gateway (Docker mode)
- `8002` - iOS Connector
- `5432` - PostgreSQL
- `6379` - Redis

#### Memory Configuration
Recommend allocating at least 4GB memory to Docker Desktop:
1. Open Docker Desktop
2. Settings → Resources → Memory
3. Set to 4GB or higher

### Troubleshooting

#### Common Issues
1. **Port Conflict Error**
   ```bash
   # Check port usage
   netstat -an | grep 8001
   lsof -i :8001
   
   # Kill process using port
   kill -9 <PID>
   ```

2. **Docker Startup Failure**
   ```bash
   # Clean Docker cache
   docker system prune -a
   
   # Rebuild images
   docker-compose build --no-cache
   ```

3. **Memory Issues**
   ```bash
   # Check Docker memory usage
   docker stats
   
   # Increase Docker Desktop memory allocation
   # Settings → Resources → Memory → Adjust to 8GB
   ```

4. **API Connection Timeout**
   - Check network connection
   - Adjust `REQUEST_TIMEOUT` environment variable
   - Ensure firewall allows relevant ports

#### Log Viewing
```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api-gateway
docker-compose logs -f ios-connector

# View recent 100 lines
docker-compose logs --tail=100 api-gateway
```

## 🔧 Environment Variables Reference
| Variable | Description | Default |
| --- | --- | --- |
| `UNIVERSE_SERVICE_URL` / `UNIVERSE_API_KEY` | Proxy to your own market-data platform (optional) | - |
| `TUSHARE_TOKEN` | Enables Tushare Pro enrichment for China searches; AkShare-only when blank | - |
| `POOLS_CONFIG_PATH` | Custom stock-pool configuration | `config/pools.json` |
| `REQUEST_TIMEOUT` | API request timeout (seconds) | `30` |
| `POSTGRES_URL` | PostgreSQL database connection string | `postgresql://arthera:arthera123@localhost:5432/trading_engine` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `DEMO_MODE` | Demo mode toggle | `true` |

## 📚 Core APIs

### Core Endpoints
| Path | Method | Purpose | Parameters |
| --- | --- | --- | --- |
| `/market-data/search/{query}` | GET | Smart stock search with CN/US auto-detection | `market`, `limit` |
| `/market-data/popular` | GET | Popular stocks with average price/change stats | - |
| `/config/data-source` | POST/GET | Tushare token management | `tushare_token` |
| `/signals/*` | POST/GET | Strategy signal generation and history | `symbols`, `timeframe` |
| `/orders/*` | POST/GET | Paper OMS submission + history | `symbol`, `side`, `quantity` |
| `/dashboard/*` | GET | System status, performance, risk reports | - |
| `/ios/*` | POST/WS | DeepSeek, Bayesian, Kelly, backtest, WebSocket for iOS | Various iOS endpoints |

### API Usage Examples

#### 1. Stock Search
```bash
# Search Apple stock
curl "http://localhost:8001/market-data/search/AAPL?market=US"

# Search Chinese stocks
curl "http://localhost:8001/market-data/search/平安?market=CN"

# Global search
curl "http://localhost:8001/market-data/search/tesla?market=ALL"
```

#### 2. Generate Trading Signals
```bash
curl -X POST "http://localhost:8001/signals/generate" \
     -H "Content-Type: application/json" \
     -d '{"symbols": ["AAPL", "TSLA"], "timeframe": "1D"}'
```

#### 3. Submit Orders
```bash
curl -X POST "http://localhost:8001/orders/submit" \
     -H "Content-Type: application/json" \
     -d '{"symbol": "AAPL", "side": "BUY", "quantity": 100, "order_type": "MARKET"}'
```

#### 4. Get Market Data
```bash
# Get single stock data
curl "http://localhost:8001/market-data/stock/AAPL?market=US"

# Get market indices
curl "http://localhost:8001/market-data/indices"

# Get popular stocks
curl "http://localhost:8001/market-data/popular"
```

#### 5. Configure Data Sources
```bash
# Get current configuration
curl "http://localhost:8001/config/data-source"

# Set Tushare Token
curl -X POST "http://localhost:8001/config/data-source" \
     -H "Content-Type: application/json" \
     -d '{"tushare_token": "your_token_here"}'
```

## 🖥 Front-end Experience

### Interface Features
- **Bloomberg-style Design**: Dark theme, professional financial interface
- **Real-time Data Display**: Live stock prices, changes, volume updates
- **Smart Search**: Support for Chinese/English stock names and symbols
- **Stock Pool Management**: Visual add/remove stocks to investment pools
- **Strategy Monitoring**: Real-time strategy status and performance display

### User Guide
1. **Stock Search Usage**:
   - Select market (US/CN/GLOBAL) in `TARGET STOCK POOL` panel
   - Enter stock symbol or company name to search
   - Click search result cards to add to stock pool

2. **Data Source Configuration**:
   - Click CONFIG button in top-right corner to open settings
   - Input Tushare Token in DATA SOURCE CONFIG section
   - Click SAVE to save configuration

3. **Trading Signal Generation**:
   - Select stocks from the stock pool
   - Click generate signals button
   - View signal confidence and suggested actions

4. **Order Management**:
   - Execute buy/sell operations based on signal suggestions
   - View order history and execution status

## 📱 iOS Integration

### Swift SDK Usage
```swift
let adapter = QuantitativeServiceAdapter.shared

// Generate trading signals
let signal = try await adapter.generateDeepSeekSignal(symbol: "AAPL", marketData: feed)

// Connect WebSocket for real-time updates
await adapter.connectWebSocket() // subscribe to real-time pushes

// Submit orders
let order = try await adapter.submitOrder(symbol: "AAPL", side: "BUY", quantity: 100)

// Run backtests
let backtest = try await adapter.runBacktest(strategy: "momentum", symbols: ["AAPL", "TSLA"])
```

### iOS Connector Endpoints
- `POST /ios/signals/deepseek/generate` - Generate AI-powered trading signals
- `POST /ios/bayesian/update-posterior` - Update Bayesian model parameters
- `WS /ios/ws` - Real-time WebSocket connection for live updates
- `POST /ios/backtest` - Run historical strategy backtests

## 🚀 Deployment Options

### Production Deployment
For production deployment, consider:
1. **Docker Compose**: Use provided docker-compose.yml
2. **Kubernetes**: Deploy with Kubernetes manifests
3. **Cloud Services**: AWS ECS, Google Cloud Run, Azure Container Instances

### Performance Optimization
- **Caching**: Redis for market data caching
- **Database**: PostgreSQL for persistent storage
- **Load Balancing**: Nginx reverse proxy for multiple instances
- **Monitoring**: Built-in health checks and metrics

## 🛠 Development

### Project Structure
```
TradingEngine/
├── demo_server.py              # Standalone demo server
├── index.html                  # Main Bloomberg-style interface
├── services/
│   ├── api-gateway/           # FastAPI gateway service
│   └── ios-connector/         # iOS integration service
├── config/
│   └── pools.json            # Stock pool configurations
├── scripts/
│   └── bootstrap.sh          # Environment setup script
├── docker-compose.yml        # Full Docker deployment
└── docker-compose-simple.yml # Simplified Docker setup
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Submit a pull request

### Testing
```bash
# Run unit tests
python -m pytest tests/

# Test API endpoints
curl http://localhost:8001/health

# Run integration tests
docker-compose -f docker-compose-test.yml up
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Connect
- X: [@xindi_w](https://x.com/xindi_w)
- LinkedIn: [https://www.linkedin.com/in/xindi-wang19990526/](https://www.linkedin.com/in/xindi-wang19990526/)

Open to collaborations on data integration, strategy co-development, and multi-device demos.

## 🙏 Acknowledgments

- Bloomberg Terminal for UI inspiration
- Yahoo Finance for global market data
- AkShare for China A-share data
- Tushare for enhanced China market data
- FastAPI community for excellent framework
- Docker community for containerization support

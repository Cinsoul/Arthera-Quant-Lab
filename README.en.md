# Arthera Unified Quantitative Trading System

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Discord](https://img.shields.io/discord/123456789?color=7289da&logo=discord&logoColor=white)](https://discord.gg/arthera)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/xindi-wang19990526/)
[![X](https://img.shields.io/badge/X-Follow-000000?logo=x)](https://x.com/xindi_w)

[English](README.en.md) | [中文 (简体)](README.md) | [中文 (繁體)](README.zh.md)

---

## Project Overview

Arthera Unified Quantitative Trading System is a **community-driven multi-agent quantitative trading platform**. Our mission is to build the world's largest decentralized quantitative trading community.

It provides a top-tier quantitative strategy team to help you select, research, track, and even trade stocks. The system stores all your sensitive information locally on your device, ensuring core data security.

Join our Discord community to share feedback, ask questions, and invite more developers to contribute 🔥🔥🔥

> **Note:** Arthera team members will never actively contact community participants. This project is for educational and research purposes only.

---

## 🎯 Core Features

### 🤖 AI-Powered Trading System
- **Multi-AI Provider Support**: Integrated with DeepSeek, OpenAI, and Claude AI models
- **Intelligent Signal Generation**: AI batch generates trading signals with auto-refresh and smart fallback
- **Real-time AI Chat**: Built-in AI chat assistant for market analysis and trading advice
- **Smart Signal Acquisition**: Automatically selects the best signal source for quality trading decisions

### 📊 Professional Quantitative Strategies
- **Multi-Strategy Support**: Bayesian momentum, Kelly optimization, risk parity, and more
- **Strategy Backtesting**: Complete backtesting engine with historical data validation
- **Real-time Execution**: Real-time strategy execution and monitoring with automated trading workflows

### 💼 Enterprise-Grade Trading Interface
- **Bloomberg-Style Interface**: Professional dark-themed trading terminal
- **Real-time Data Display**: Live updates for positions, P&L, risk metrics, and trading signals
- **Smart Position Management**: Position Manager with real-time monitoring, one-click liquidation, and data export
- **Full Internationalization**: Seamless Chinese-English switching with key-value text management

### 🔄 Multi-Source Data Integration
- **Smart Data Aggregation**: Yahoo Finance, AkShare, Tushare Pro, Binance, Kraken, and more
- **Automatic Failover**: Intelligent data source switching for stable data acquisition
- **Real-time Market Data**: Live quotes for stocks, futures, and cryptocurrencies

### 🛡️ Security and Monitoring
- **Platform-wide Service Monitoring**: Real-time health checks for 25+ external APIs and data sources
- **Enterprise-Level Security**: Localized sensitive data with multi-platform API key management
- **Real-time Risk Monitoring**: VaR calculation, Sharpe ratio, maximum drawdown, and other professional metrics

### 📱 Cross-Platform Support
- **iOS Mobile**: Swift SDK support with WebSocket real-time push
- **Web Interface**: Responsive design supporting desktop and mobile browsers
- **API Interface**: Complete RESTful API for easy third-party integration

---

## 🏗️ System Architecture

```
iOS App (Existing Complete Quant Services)
    ↓ HTTP/WebSocket
iOS Connector (Port 8002) → API Gateway (Port 8001)
    ↓                           ↓
Existing Backend Services       New Unified Routing Layer
├── QuantEngine                 ├── Market Data Routing
├── Arthera_Quant_Lab          ├── Strategy Execution Routing
├── qlib Framework             ├── Signal Generation Routing
├── ML Model Training Tools     ├── AI Service Routing
└── AI Agents (DeepSeek/       └── Portfolio Routing
    OpenAI/Claude)
```

---

## 💻 System Requirements

### Required Environment
- **Python 3.8+**
- **Docker Desktop 20.10+**
- **Docker Compose 1.27+**
- **4GB+ RAM** (8GB recommended)
- **5GB+ Available Disk Space**

### Supported Operating Systems
- macOS 10.15+ (Intel/Apple Silicon)
- Windows 10+ (WSL2)
- Linux Ubuntu 18.04+/CentOS 7+

---

## 🚀 Quick Start

### Method 1: One-Click Start (Recommended)

```bash
# 1. Clone the project
git clone https://github.com/Cinsoul/Arthera-Quant-Lab.git
cd TradingEngine

# 2. Initialize environment
./scripts/bootstrap.sh      # Create virtual environment and install dependencies

# 3. Configure API Keys (Optional but recommended)
cp ai_providers_config.example.json ai_providers_config.json
# Edit ai_providers_config.json and fill in your API keys

# 4. Start the complete system
./start-demo.sh             # Start all Docker containers
```

### Method 2: Simplified Start

```bash
# For quick demo without complex configuration
./start-simple-demo.sh
```

### Method 3: Local Python Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure AI Providers (Recommended)
cp ai_providers_config.example.json ai_providers_config.json
# Edit the file and fill in API keys

# 3. Start demo server
python demo_server.py

# 4. Access the interface
# Open in browser: http://localhost:8001
```

---

## 🔑 AI Configuration Guide

This system supports three major AI Providers and requires API key configuration to use AI features.

### Getting API Keys

#### 1. DeepSeek API (Recommended)
- Visit: https://platform.deepseek.com
- Register and create an API key
- Format: `sk-xxxxxxxx`

#### 2. OpenAI API
- Visit: https://platform.openai.com
- Create an API key
- Format: `sk-proj-xxxxxxxx`

#### 3. Claude API (Anthropic)
- Visit: https://console.anthropic.com
- Create an API key
- Format: `sk-ant-xxxxxxxx`

### Configuration Steps

1. **Copy Configuration Example**
```bash
cp ai_providers_config.example.json ai_providers_config.json
```

2. **Edit Configuration File**
```json
{
  "providers": {
    "deepseek": {
      "api_key": "YOUR_DEEPSEEK_API_KEY",
      "model": "deepseek-chat",
      "enabled": true
    },
    "openai": {
      "api_key": "YOUR_OPENAI_API_KEY",
      "model": "gpt-4o-mini",
      "enabled": true
    },
    "claude": {
      "api_key": "YOUR_CLAUDE_API_KEY",
      "model": "claude-3-5-sonnet-20241022",
      "enabled": true
    }
  }
}
```

3. **Start Service**
```bash
python demo_server.py
```

4. **Verify Configuration**
- Visit http://localhost:8001
- Go to `CONFIG → AI Configuration` page
- Confirm all Providers show as "CONNECTED"

For detailed configuration guide, see [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)

---

## 🌐 Service Access

After successful startup, the following services will be available:

### Core API Endpoints
- **API Gateway**: http://localhost:8001
- **iOS Connector**: http://localhost:8002
- **System Health Check**: http://localhost:8001/health
- **AI Status**: http://localhost:8001/api/ai/status

### Demo Panels
- **Main Interface**: http://localhost:8001/
- **System Status**: http://localhost:8001/dashboard/system-status
- **Trading Statistics**: http://localhost:8001/dashboard/trading-stats

### AI Function Endpoints
- **AI Chat**: http://localhost:8001/api/ai-chat/analyze
- **Batch Signal Generation**: http://localhost:8001/api/ai/batch-generate-signals
- **Recent Signals**: http://localhost:8001/signals/recent

### iOS Connection
- **API Base URL**: `http://localhost:8001`
- **iOS Dedicated Endpoint**: `http://localhost:8002`
- **WebSocket**: `ws://localhost:8002/ios/ws`

---

## 📚 Documentation

- **AI Configuration Guide**: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
- **Strategies and Algorithms**: [STRATEGIES_AND_ALGORITHMS.md](STRATEGIES_AND_ALGORITHMS.md)
- **Feature Documentation**: [ENHANCED_FEATURES.md](ENHANCED_FEATURES.md)
- **Security Checklist**: [GITHUB_COMMIT_CHECKLIST.md](GITHUB_COMMIT_CHECKLIST.md)
- **Quick Commit Guide**: [QUICK_COMMIT_GUIDE.md](QUICK_COMMIT_GUIDE.md)

---

## 🔐 Security Reminder

⚠️ **Important Security Tips**:

1. **Never** hardcode API keys in code
2. **Never** commit `ai_providers_config.json` to Git
3. **Never** commit `.env` files to Git
4. **Never** share configuration files containing real keys

✅ **Best Practices**:

1. Use `ai_providers_config.example.json` as a template
2. Create `ai_providers_config.json` locally and fill in keys
3. Rotate API keys regularly
4. Use pre-commit check script: `./PRE_COMMIT_CHECK.sh`

---

## 🛠️ Development Guide

### Project Structure

```
TradingEngine/
├── demo_server.py              # Main server
├── index.html                  # Frontend interface
├── ai_providers_config.json    # AI config (not committed)
├── .env                        # Environment variables (not committed)
├── services/
│   ├── api-gateway/           # API Gateway
│   ├── ios-connector/         # iOS Connector
│   ├── quant-engine/          # Quant Engine
│   └── ai-agents/             # AI Agents
├── config/
│   └── pools.json             # Stock pool configuration
└── static/
    ├── ai-chat-widget.html    # AI chat component
    └── ai-chat-loader.js      # AI chat loader
```

### Before Committing Code

```bash
# Run security check
./PRE_COMMIT_CHECK.sh

# If check passes, commit code
git add <files>
git commit -m "your message"
git push origin main
```

---

## 🤝 Contributing

We welcome all forms of contributions!

1. Fork this project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure:
- Code follows project standards
- `./PRE_COMMIT_CHECK.sh` check passes
- Related documentation is updated
- No sensitive information is included

---

## 📜 License

This project is open-sourced under the MIT License - see the [LICENSE](LICENSE) file for details

---

## 📞 Contact

- **Discord**: https://discord.gg/arthera
- **LinkedIn**: https://www.linkedin.com/in/xindi-wang19990526/
- **X (Twitter)**: https://x.com/xindi_w
- **GitHub Issues**: https://github.com/Cinsoul/Arthera-Quant-Lab/issues

---

## 🙏 Acknowledgments

Thanks to all developers and community members who contributed to this project!

Special thanks to:
- DeepSeek, OpenAI, Anthropic for AI services
- Yahoo Finance, AkShare, Tushare for data support
- Open source community for various excellent tools and libraries

---

## ⚠️ Disclaimer

This project is for educational and research purposes only. Use this system for actual trading at your own risk. The development team is not responsible for any trading losses.

Please comply with local laws and regulations and trade carefully.

---

**Last Updated**: 2025-12-29
**Version**: 2.0.0

# 🚀 Arthera Trading Engine - 快速开始指南

## 一键部署 (推荐)

### 方法 1: 自动部署脚本
```bash
# 1. 克隆项目
git clone https://github.com/Cinsoul/Arthera-Quant-Lab.git
cd Arthera-Quant-Lab

# 2. 一键部署
chmod +x deploy.sh
./deploy.sh

# 3. 访问系统
# 🌐 主界面: http://localhost:8001
# 🔧 API网关: http://localhost:8000  
# 📱 iOS连接器: http://localhost:8002
```

### 方法 2: Docker Compose
```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置你的 TUSHARE_TOKEN

# 2. 启动服务
docker-compose up -d

# 3. 检查服务状态
docker-compose ps
```

### 方法 3: Python 本地运行
```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动演示服务器
python demo_server.py

# 3. 访问: http://localhost:8001
```

## 🔗 服务访问地址

| 服务 | 地址 | 功能 |
|------|------|------|
| 📊 **主交易界面** | http://localhost:8001 | Bloomberg风格仪表板 |
| 🔧 **API网关** | http://localhost:8000 | 统一API入口 |
| 📱 **iOS连接器** | http://localhost:8002 | Swift客户端接口 |
| 🏥 **健康检查** | http://localhost:8000/health | 系统状态监控 |
| 📈 **Grafana仪表板** | http://localhost:3000 | 监控面板 (admin/admin) |

## 🎯 核心功能演示

### 1. 股票搜索
```bash
# 搜索美股
curl "http://localhost:8001/market-data/search/AAPL"

# 搜索中国股票
curl "http://localhost:8001/market-data/search/平安银行"
```

### 2. 生成交易信号
```bash
curl -X POST "http://localhost:8001/signals/generate" \
     -H "Content-Type: application/json" \
     -d '{"symbols": ["AAPL", "TSLA"], "timeframe": "1D"}'
```

### 3. iOS API调用
```bash
# DeepSeek AI信号
curl -X POST "http://localhost:8002/ios/signals/deepseek/generate" \
     -H "Content-Type: application/json" \
     -d '{
       "symbol": "AAPL",
       "market_data": {"price": 150, "volume": 1000000},
       "include_uncertainty": true
     }'
```

## 📊 实时数据源

✅ **QuantEngine**: 真实LightGBM机器学习模型  
✅ **qlib**: Alpha158量化特征工程  
✅ **MLModelTrainingTool**: CoreML缓存预测模型  
✅ **AkShare**: 中国A股免费数据  
✅ **Tushare Pro**: 高质量中国市场数据  
✅ **Yahoo Finance**: 全球股票实时行情  

## ⚡ 高级配置

### Tushare Pro集成
```bash
# 1. 获取Token: https://tushare.pro
# 2. 配置环境变量
echo "TUSHARE_TOKEN=your_token_here" >> .env
# 3. 重启服务
docker-compose restart
```

### 自定义数据源
```bash
# 添加到 .env 文件
UNIVERSE_SERVICE_URL=https://your-api.com
UNIVERSE_API_KEY=your_api_key
```

## 🛠️ 开发模式

### 热重载开发
```bash
# 启动开发服务器
uvicorn demo_server:app --reload --host 0.0.0.0 --port 8001

# 启动API网关
cd services/api-gateway
uvicorn main:app --reload --port 8000

# 启动iOS连接器
cd services/ios-connector
uvicorn main:app --reload --port 8002
```

## 🔍 故障排除

### 端口被占用
```bash
# 检查端口占用
lsof -i :8001
# 终止进程
kill -9 <PID>
```

### 容器启动失败
```bash
# 查看日志
docker-compose logs -f api-gateway

# 重新构建
docker-compose build --no-cache
```

### 内存不足
```bash
# 为Docker分配更多内存 (推荐4GB+)
# Docker Desktop → Settings → Resources → Memory
```

## 📱 iOS Swift 集成

```swift
import Foundation

let adapter = QuantitativeServiceAdapter.shared

// 生成AI交易信号
let signal = try await adapter.generateDeepSeekSignal(
    symbol: "AAPL", 
    marketData: ["price": 150, "volume": 1000000]
)

// 连接WebSocket实时数据
await adapter.connectWebSocket()
```

## 🎉 成功部署验证

部署成功后，你将看到：

```
✅ All services started successfully

📍 Service Access Points:
┌─────────────────────────────────────────┐
│ 🌐 Main Interface:  http://localhost:8001  │
│ 🔧 API Gateway:     http://localhost:8000  │
│ 📱 iOS Connector:   http://localhost:8002  │
│ 📊 Health Check:    http://localhost:8000/health │
└─────────────────────────────────────────┘

💡 Features Ready:
   ✅ Real-time market data integration
   ✅ AI-powered trading signals  
   ✅ Multi-source data aggregation
   ✅ iOS/Swift client support
   ✅ Bloomberg-style dashboard
```

## 🆘 获取帮助

- 📋 **文档**: 查看完整的 [README.md](README.md)
- 🐛 **问题报告**: [GitHub Issues](https://github.com/Cinsoul/Arthera-Quant-Lab/issues)
- 💬 **讨论**: [GitHub Discussions](https://github.com/Cinsoul/Arthera-Quant-Lab/discussions)
- 📧 **联系**: [LinkedIn](https://www.linkedin.com/in/xindi-wang19990526/)

---

🚀 **现在就开始探索 Arthera 量化交易引擎吧！**
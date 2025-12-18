<div align="center">

<img src="https://raw.githubusercontent.com/Cinsoul/Arthera-Quant-Lab/main/docs/assets/arthera-logo.png" alt="Arthera Trading Engine" width="200" height="200">

# 首个
## 开源量化交易平台
### 专为量化分析师设计

<div style="display: flex; justify-content: center; gap: 20px; margin: 20px 0;">
  <button style="padding: 10px 20px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 5px;">Alpha</button>
  <button style="padding: 10px 20px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 5px;">智能体</button>
  <button style="padding: 10px 20px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 5px;">进阶</button>
</div>

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Discord](https://img.shields.io/discord/123456789?color=7289da&logo=discord&logoColor=white)](https://discord.gg/arthera)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/xindi-wang19990526/)
[![X](https://img.shields.io/badge/X-Follow-000000?logo=x)](https://x.com/xindi_w)
[![YouTube](https://img.shields.io/badge/YouTube-Watch-red?logo=youtube)](https://youtube.com/arthera)

[English](README.en.md) | [中文 (简体)](README.md) | [中文 (繁體)](README.zh.md)

</div>

## Arthera统一量化交易系统

Arthera统一量化交易系统是一个社区驱动的多智能体量化交易应用平台。我们的使命是构建世界上最大的去中心化量化交易社区。

它提供了一支顶级量化策略团队，帮助您进行股票选择、研究、跟踪甚至交易。

系统将您的所有敏感信息本地存储在您的设备上，确保核心数据安全。

欢迎加入我们的Discord社区，分享您遇到的反馈和问题，邀请更多开发者贡献 🔥🔥🔥

> **注意：** Arthera团队成员绝不会主动联系社区参与者。此项目仅供教育和研究目的使用。

## 产品预览
<img width="1057" height="673" alt="Screenshot 2025-12-18 at 12 49 21 pm" src="https://github.com/user-attachments/assets/da46e9d6-9e32-4725-b758-a5624e8f2862" />
<img width="1198" height="776" alt="Screenshot 2025-12-18 at 12 52 39 pm" src="https://github.com/user-attachments/assets/c1ad9e8c-20a3-490a-b484-569b0c2c79cc" />
<img width="1189" height="770" alt="Screenshot 2025-12-18 at 12 52 45 pm" src="https://github.com/user-attachments/assets/f6094dec-da68-4978-829c-8f26d09d8719" />
<img width="1190" height="770" alt="Screenshot 2025-12-18 at 12 52 56 pm" src="https://github.com/user-attachments/assets/a85f5f42-c589-4b5a-970e-4b37b649c821" />

## 🌟 核心特性
- **双数据源聚合**：默认启用 Yahoo Finance + AkShare；配置 `TUSHARE_TOKEN` 后自动切换至 Tushare Pro，`/universe/search` 会对中美股票统一格式化输出。
- **智能股票搜索**：Bloomberg 风格的 `TARGET STOCK POOL` 面板支持模糊检索、分页、行业与市值筛选，并实时展示价格、涨跌幅、交易所与行业标签。
- **全链路策略中心**：QuantEngine、Quant Lab、Paper OMS、Risk Engine 与 Portfolio 服务通过 API Gateway 汇聚，支持信号生成、交易执行、风险审计与绩效回放。
- **Bloomberg UI**：内置系统状态、交易统计、回撤图、行业配置、风险报表、订单与信号列表，可一键演示。
- **iOS Connector**：端口 8002 暴露与 Swift SDK 对齐的 REST + WebSocket 接口，移动端可实时接收信号、下单并回测。
- **动态数据配置**：`POST /config/data-source` 可在运行时注入/更新 Tushare Token，并立即反映到前端。
- **实时数据集成**：支持Yahoo Finance、AkShare、Tushare Pro多数据源，自动缓存和故障转移。

## 🏗 架构
```
iOS App (现有完整量化服务)
    ↓ HTTP/WebSocket
iOS Connector (端口8002) → API Gateway (端口8001)
    ↓                           ↓
现有后端服务                     新增统一路由层
├── QuantEngine                 ├── 市场数据路由
├── Arthera_Quant_Lab          ├── 策略执行路由  
├── qlib框架                   ├── 信号生成路由
└── ML模型训练工具             └── 投资组合路由
```

## 📋 系统要求

### 必需环境
- **Python 3.8+**
- **Docker Desktop 20.10+**
- **Docker Compose 1.27+**
- **4GB+ RAM** (推荐 8GB)
- **5GB+ 可用磁盘空间**

### 支持的操作系统
- macOS 10.15+ (Intel/Apple Silicon)
- Windows 10+ (WSL2)
- Linux Ubuntu 18.04+/CentOS 7+

## ⚡ 快速启动

### Option 1: 一键启动（推荐）
```bash
# 1. 克隆项目
git clone https://github.com/Cinsoul/Arthera-Quant-Lab.git
cd Arthera-Quant-Lab

# 2. 初始化环境
./scripts/bootstrap.sh      # 创建虚拟环境并安装依赖

# 3. (可选) 配置API密钥
vim .env                    # 编辑环境变量

# 4. 启动完整系统
./start-demo.sh             # 启动所有Docker容器
```

### Option 2: 简化启动
```bash
# 适用于快速演示，无需复杂配置
./start-simple-demo.sh
```

### Option 3: 本地Python运行
```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动演示服务器
python demo_server.py

# 3. 访问界面
# 浏览器打开: http://localhost:8001
```

然后打开 `http://localhost:8001` 浏览实时仪表板 (或 `docker-compose up -d` 手动控制)。

## 📊 服务访问

启动成功后，以下服务将可用：

### 核心API端点
- **API Gateway**: http://localhost:8001
- **iOS Connector**: http://localhost:8002
- **系统健康检查**: http://localhost:8001/health

### 演示面板
- **系统状态**: http://localhost:8001/dashboard/system-status
- **交易统计**: http://localhost:8001/dashboard/trading-stats

### iOS连接
- **API Base URL**: `http://localhost:8001`
- **iOS专用端点**: `http://localhost:8002`  
- **WebSocket**: `ws://localhost:8002/ios/ws`

## 🔧 本地配置指南

### 环境变量设置

创建 `.env` 文件（如果使用bootstrap脚本会自动创建）：

```bash
# 数据源配置
TUSHARE_TOKEN=your_tushare_token_here          # 可选：Tushare Pro Token
UNIVERSE_SERVICE_URL=                          # 可选：外部数据服务URL
UNIVERSE_API_KEY=                              # 可选：外部数据API密钥

# 数据库配置
POSTGRES_URL=postgresql://arthera:arthera123@localhost:5432/trading_engine
REDIS_URL=redis://localhost:6379

# 系统配置
REQUEST_TIMEOUT=30                             # API请求超时时间（秒）
POOLS_CONFIG_PATH=config/pools.json           # 股票池配置路径
DEMO_MODE=true                                 # 演示模式开关

# iOS集成配置
IOS_WEBSOCKET_PORT=8005                        # iOS WebSocket端口
```

### 数据源配置

#### 1. 免费数据源（默认）
系统开箱即用，使用以下免费数据源：
- **Yahoo Finance**：全球股票实时行情
- **AkShare**：中国A股免费数据

#### 2. Tushare Pro（推荐）
获得更高质量的中国市场数据：

1. 访问 [Tushare官网](https://tushare.pro) 注册账号
2. 获取API Token
3. 在 `.env` 文件中设置：
   ```bash
   TUSHARE_TOKEN=your_tushare_token_here
   ```

#### 3. 自定义数据源
如果您有自己的数据服务：
```bash
UNIVERSE_SERVICE_URL=https://your-api.com
UNIVERSE_API_KEY=your_api_key
```

### Docker配置

#### 检查Docker环境
```bash
# 检查Docker版本
docker --version
docker-compose --version

# 确保Docker Desktop正在运行
docker info
```

#### 端口配置
确保以下端口未被占用：
- `8001` - 演示服务器（demo_server.py）
- `8000` - API Gateway（Docker模式）
- `8002` - iOS Connector
- `5432` - PostgreSQL
- `6379` - Redis

#### 内存配置
建议为Docker Desktop分配至少4GB内存：
1. 打开Docker Desktop
2. Settings → Resources → Memory
3. 设置为4GB或更高

### 故障排除

#### 常见问题
1. **端口冲突错误**
   ```bash
   # 检查端口占用
   netstat -an | grep 8001
   lsof -i :8001
   
   # 终止占用端口的进程
   kill -9 <PID>
   ```

2. **Docker启动失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a
   
   # 重新构建镜像
   docker-compose build --no-cache
   ```

3. **内存问题**
   ```bash
   # 检查Docker内存使用
   docker stats
   
   # 增加Docker Desktop内存分配
   # Settings → Resources → Memory → 调整到8GB
   ```

4. **API连接超时**
   - 检查网络连接
   - 调整 `REQUEST_TIMEOUT` 环境变量
   - 确保防火墙允许相关端口

#### 日志查看
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f api-gateway
docker-compose logs -f ios-connector

# 查看最近100行日志
docker-compose logs --tail=100 api-gateway
```

## 🔧 环境变量参考
| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `UNIVERSE_SERVICE_URL` / `UNIVERSE_API_KEY` | 代理到您自己的市场数据平台（可选） | - |
| `TUSHARE_TOKEN` | 启用Tushare Pro增强中国搜索功能；留空时仅使用AkShare | - |
| `POOLS_CONFIG_PATH` | 自定义股票池配置 | `config/pools.json` |
| `REQUEST_TIMEOUT` | API请求超时时间（秒） | `30` |
| `POSTGRES_URL` | PostgreSQL数据库连接字符串 | `postgresql://arthera:arthera123@localhost:5432/trading_engine` |
| `REDIS_URL` | Redis连接字符串 | `redis://localhost:6379` |
| `DEMO_MODE` | 演示模式开关 | `true` |

## 📚 核心API

### 核心端点
| 路径 | 方法 | 功能 | 参数 |
| --- | --- | --- | --- |
| `/market-data/search/{query}` | GET | 智能股票搜索，支持中美股票自动检测 | `market`, `limit` |
| `/market-data/popular` | GET | 热门股票及平均价格/变化统计 | - |
| `/config/data-source` | POST/GET | Tushare token管理 | `tushare_token` |
| `/signals/*` | POST/GET | 策略信号生成和历史记录 | `symbols`, `timeframe` |
| `/orders/*` | POST/GET | 模拟交易提交和历史记录 | `symbol`, `side`, `quantity` |
| `/dashboard/*` | GET | 系统状态、性能、风险报告 | - |
| `/ios/*` | POST/WS | DeepSeek、贝叶斯、Kelly、回测、iOS WebSocket | 各种iOS端点 |

### API使用示例

#### 1. 股票搜索
```bash
# 搜索苹果股票
curl "http://localhost:8001/market-data/search/AAPL?market=US"

# 搜索中国股票
curl "http://localhost:8001/market-data/search/平安?market=CN"

# 全局搜索
curl "http://localhost:8001/market-data/search/tesla?market=ALL"
```

#### 2. 生成交易信号
```bash
curl -X POST "http://localhost:8001/signals/generate" \
     -H "Content-Type: application/json" \
     -d '{"symbols": ["AAPL", "TSLA"], "timeframe": "1D"}'
```

#### 3. 提交订单
```bash
curl -X POST "http://localhost:8001/orders/submit" \
     -H "Content-Type: application/json" \
     -d '{"symbol": "AAPL", "side": "BUY", "quantity": 100, "order_type": "MARKET"}'
```

#### 4. 获取市场数据
```bash
# 获取单只股票数据
curl "http://localhost:8001/market-data/stock/AAPL?market=US"

# 获取市场指数
curl "http://localhost:8001/market-data/indices"

# 获取热门股票
curl "http://localhost:8001/market-data/popular"
```

#### 5. 配置数据源
```bash
# 获取当前配置
curl "http://localhost:8001/config/data-source"

# 设置Tushare Token
curl -X POST "http://localhost:8001/config/data-source" \
     -H "Content-Type: application/json" \
     -d '{"tushare_token": "your_token_here"}'
```

## 🖥 前端体验

### 界面功能
- **Bloomberg风格设计**：深色主题，专业金融界面
- **实时数据显示**：实时股价、涨跌、成交量更新
- **智能搜索**：支持中英文股票名称和代码搜索
- **股票池管理**：可视化添加/移除股票到投资池
- **策略监控**：实时策略状态和性能显示

### 用户指南
1. **股票搜索使用**：
   - 在 `TARGET STOCK POOL` 面板选择市场（US/CN/GLOBAL）
   - 输入股票代码或公司名称进行搜索
   - 点击搜索结果卡片添加到股票池

2. **数据源配置**：
   - 点击右上角CONFIG按钮打开设置
   - 在DATA SOURCE CONFIG部分输入Tushare Token
   - 点击SAVE保存配置

3. **交易信号生成**：
   - 从股票池选择股票
   - 点击生成信号按钮
   - 查看信号置信度和建议操作

4. **订单管理**：
   - 基于信号建议执行买卖操作
   - 查看订单历史和执行状态

## 📱 iOS集成

### Swift SDK使用
```swift
let adapter = QuantitativeServiceAdapter.shared

// 生成交易信号
let signal = try await adapter.generateDeepSeekSignal(symbol: "AAPL", marketData: feed)

// 连接WebSocket获取实时更新
await adapter.connectWebSocket() // 订阅实时推送

// 提交订单
let order = try await adapter.submitOrder(symbol: "AAPL", side: "BUY", quantity: 100)

// 运行回测
let backtest = try await adapter.runBacktest(strategy: "momentum", symbols: ["AAPL", "TSLA"])
```

### iOS连接器端点
- `POST /ios/signals/deepseek/generate` - 生成AI驱动的交易信号
- `POST /ios/bayesian/update-posterior` - 更新贝叶斯模型参数
- `WS /ios/ws` - 实时WebSocket连接获取实时更新
- `POST /ios/backtest` - 运行历史策略回测

## 🚀 部署选项

### 生产环境部署
对于生产环境部署，建议考虑：
1. **Docker Compose**: 使用提供的docker-compose.yml
2. **Kubernetes**: 使用Kubernetes清单部署
3. **云服务**: AWS ECS、Google Cloud Run、Azure容器实例

### 性能优化
- **缓存**: 使用Redis缓存市场数据
- **数据库**: PostgreSQL用于持久化存储
- **负载均衡**: Nginx反向代理支持多实例
- **监控**: 内置健康检查和指标

## 🛠 开发

### 项目结构
```
TradingEngine/
├── demo_server.py              # 独立演示服务器
├── index.html                  # 主要的Bloomberg风格界面
├── services/
│   ├── api-gateway/           # FastAPI网关服务
│   └── ios-connector/         # iOS集成服务
├── config/
│   └── pools.json            # 股票池配置
├── scripts/
│   └── bootstrap.sh          # 环境设置脚本
├── docker-compose.yml        # 完整Docker部署
└── docker-compose-simple.yml # 简化Docker设置
```

### 贡献代码
1. Fork此仓库
2. 创建功能分支
3. 实现您的更改
4. 为新功能添加测试
5. 提交pull request

### 测试
```bash
# 运行单元测试
python -m pytest tests/

# 测试API端点
curl http://localhost:8001/health

# 运行集成测试
docker-compose -f docker-compose-test.yml up
```

## 📄 许可证

本项目采用MIT许可证 - 详情请查看LICENSE文件。

## 🤝 联系我们
- X: [@xindi_w](https://x.com/xindi_w)
- LinkedIn: [https://www.linkedin.com/in/xindi-wang19990526/](https://www.linkedin.com/in/xindi-wang19990526/)

欢迎交流数据集成、策略共同开发和多设备演示合作。

## 🙏 致谢

- Bloomberg终端为UI设计提供灵感
- Yahoo Finance提供全球市场数据
- AkShare提供中国A股数据
- Tushare提供增强的中国市场数据
- FastAPI社区提供优秀框架
- Docker社区提供容器化支持
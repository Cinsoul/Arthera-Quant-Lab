<div align="center">


![Image](https://github.com/user-attachments/assets/bc40f0ad-476c-413e-8cbd-ccb70ee6ec3d)


<div style="display: flex; justify-content: center; gap: 20px; margin: 20px 0;">
 
</div>

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Discord](https://img.shields.io/discord/123456789?color=7289da&logo=discord&logoColor=white)](https://discord.gg/arthera)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/xindi-wang19990526/)
[![X](https://img.shields.io/badge/X-Follow-000000?logo=x)](https://x.com/xindi_w)

[English](README.en.md) | [中文 (简体)](README.md) | [中文 (繁體)](README.zh.md)

</div>

## Arthera統一量化交易系統

Arthera統一量化交易系統是一個社群驅動的多智能體量化交易應用平台。我們的使命是構建世界上最大的去中心化量化交易社群。

它提供了一支頂級量化策略團隊，幫助您進行股票選擇、研究、追蹤甚至交易。

系統將您的所有敏感資訊本地存儲在您的設備上，確保核心數據安全。

歡迎加入我們的Discord社群，分享您遇到的回饋和問題，邀請更多開發者貢獻 🔥🔥🔥

> **注意：** Arthera團隊成員絕不會主動聯繫社群參與者。此專案僅供教育和研究目的使用。


## 產品預覽

<img width="1190" height="776" alt="Screenshot 2025-12-18 at 7 20 01 pm" src="https://github.com/user-attachments/assets/4616973e-6dc1-4bda-bab3-d85c555cb75f" />

<img width="1186" height="720" alt="Screenshot 2025-12-18 at 7 20 15 pm" src="https://github.com/user-attachments/assets/f19604a1-d501-47e3-9aba-f443145a0dc0" />

<img width="1188" height="774" alt="Screenshot 2025-12-18 at 7 20 26 pm" src="https://github.com/user-attachments/assets/a80357c1-c626-49e3-97f5-8a471f17eb50" />

<img width="1187" height="772" alt="Screenshot 2025-12-18 at 7 20 57 pm" src="https://github.com/user-attachments/assets/28c907a3-4d52-4ec9-b7cd-6da58d84b930" />



## 專案亮點
- **雙數據源聚合**：默認啟用 Yahoo Finance + AkShare；配置 `TUSHARE_TOKEN` 後自動切換至 Tushare Pro，`/universe/search` 會對中美股票統一格式化輸出。
- **智能股票搜索**：Bloomberg 風格的 `TARGET STOCK POOL` 面板支持模糊檢索、分頁、行業與市值篩選，並實時展示價格、漲跌幅、交易所與行業標籤。
- **全鏈路策略中心**：QuantEngine、Quant Lab、Paper OMS、Risk Engine 與 Portfolio 服務通過 API Gateway 匯聚，支持信號生成、交易執行、風險審計與績效回放。
- **Bloomberg UI**：內置系統狀態、交易統計、回撤圖、行業配置、風險報表、訂單與信號列表，可一鍵演示。
- **iOS Connector**：端口 8002 暴露與 Swift SDK 對齊的 REST + WebSocket 接口，移動端可實時接收信號、下單並回測。
- **動態數據配置**：`POST /config/data-source` 可在運行時注入/更新 Tushare Token，並立即反映到前端。
- **實時數據集成**：支持Yahoo Finance、AkShare、Tushare Pro多數據源，自動緩存和故障轉移。

## 架构
```
UI (static/index.html)
        ↓ HTTP
FastAPI API Gateway (8000)
├─ Market routes → QuantEngine / AkShare / Tushare
├─ Strategy routes → Arthera_Quant_Lab
├─ Orders & Portfolio → Paper OMS / Portfolio PnL
├─ Dashboard aggregation → Risk + Analytics
└─ iOS Connector relay (8002 WebSocket + REST)
```

## 系统要求

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

##  快速开始

### 方式一：一键启动（推荐）
```bash
# 1. 克隆项目到本地
git clone https://gitlab.com/arthera/quant-lab.git
cd quant-lab

# 2. 初始化环境
./scripts/bootstrap.sh      # 创建虚拟环境并安装依赖

# 3. (可选) 配置API密钥
vim .env                    # 编辑环境变量文件

# 4. 启动完整系统
./start-demo.sh             # 启动所有Docker容器
```

### 方式二：简化启动
```bash
# 适用于快速演示，无需复杂配置
./start-simple-demo.sh
```

### 方式三：本地Python运行
```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动演示服务器
python demo_server.py

# 3. 访问界面
# 浏览器打开: http://localhost:8001
```

启动后访问 `http://localhost:8001` 浏览演示界面。

## 🔧 本地配置详细指南

### 环境变量配置

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

### 数据源配置说明

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
# 检查Docker是否运行
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
1. **端口占用错误**
   ```bash
   # 检查端口占用
   netstat -an | grep 8001
   lsof -i :8001
   
   # 停止占用端口的进程
   kill -9 <PID>
   ```

2. **Docker启动失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a
   
   # 重新构建镜像
   docker-compose build --no-cache
   ```

3. **内存不足**
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

## 环境变量参考
| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `UNIVERSE_SERVICE_URL` | 自建行情/股票池平台的代理地址（可选） | - |
| `UNIVERSE_API_KEY` | 对应的 API Key（可选） | - |
| `TUSHARE_TOKEN` | Tushare Pro Token。留空时只使用 AkShare；填写后 `/universe/search` 将返回行业/地域/上市日期等增强字段 | - |
| `POOLS_CONFIG_PATH` | 自定义股票池配置文件路径 | `config/pools.json` |
| `REQUEST_TIMEOUT` | API请求超时时间（秒） | `30` |
| `POSTGRES_URL` | PostgreSQL数据库连接字符串 | `postgresql://arthera:arthera123@localhost:5432/trading_engine` |
| `REDIS_URL` | Redis连接字符串 | `redis://localhost:6379` |
| `DEMO_MODE` | 演示模式开关 | `true` |

## 关键 API

### 核心接口
| 路径 | 方法 | 功能 | 参数 |
| --- | --- | --- | --- |
| `/universe/search` | GET | 智能股票搜索，自动合并 CN/US 行情、支持分页与缓存 | `q`, `region`, `limit`, `offset` |
| `/universe/pools` | GET | 股票池列表，返回平均价格、涨跌幅等统计 | - |
| `/config/data-source` | POST/GET | 运行时管理 Tushare Token 状态 | `tushare_token` |
| `/signals/*` | POST/GET | 策略信号生成/查询 | `symbols`, `timeframe` |
| `/orders/*` | POST/GET | Paper OMS 下单与订单查询 | `symbol`, `side`, `quantity` |
| `/dashboard/*` | GET | 系统状态、绩效系列、回撤、风险报表等汇总接口 | - |
| `/ios/*` | POST/WS | iOS Connector REST + WebSocket 服务 | 各种iOS专用接口 |

### API使用示例

#### 1. 股票搜索
```bash
# 搜索Apple股票
curl "http://localhost:8001/market-data/search/AAPL?market=US"

# 搜索中国平安
curl "http://localhost:8001/market-data/search/平安?market=CN"

# 搜索Tesla
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

## 前端体验

### 界面功能
- **设计**：深色主题，专业金融界面
- **实时数据展示**：股价、涨跌幅、成交量实时更新
- **智能搜索**：支持中英文股票名称和代码搜索
- **股票池管理**：可视化添加/移除股票到投资池
- **策略监控**：实时显示策略运行状态和绩效

### 操作指南
1. **股票搜索使用**：
   - 在 `TARGET STOCK POOL` 面板选择市场（US/CN/GLOBAL）
   - 输入股票代码或公司名称搜索
   - 点击搜索结果卡片添加到股票池

2. **数据源配置**：
   - 点击右上角CONFIG按钮打开设置
   - 在DATA SOURCE CONFIG部分输入Tushare Token
   - 点击SAVE保存配置

3. **交易信号生成**：
   - 选择股票池中的股票
   - 点击生成信号按钮
   - 查看信号置信度和建议操作

4. **订单管理**：
   - 根据信号建议执行买卖操作
   - 查看订单历史和执行状态

## 📱 iOS 集成

### Swift SDK 使用方法
```swift
let adapter = QuantitativeServiceAdapter.shared

// 生成交易信号
let signal = try await adapter.generateDeepSeekSignal(symbol: "AAPL", marketData: feed)

// 连接WebSocket获取实时更新
await adapter.connectWebSocket()  // 订阅实时推送

// 提交订单
let order = try await adapter.submitOrder(symbol: "AAPL", side: "BUY", quantity: 100)

// 运行回测
let backtest = try await adapter.runBacktest(strategy: "momentum", symbols: ["AAPL", "TSLA"])
```

### iOS 连接器端点
- `POST /ios/signals/deepseek/generate` - 生成AI驱动的交易信号
- `POST /ios/bayesian/update-posterior` - 更新贝叶斯模型参数  
- `WS /ios/ws` - 实时WebSocket连接获取实时更新
- `POST /ios/backtest` - 运行历史策略回测

## 部署选项

### 生产环境部署
生产环境部署建议：
1. **Docker Compose**: 使用提供的docker-compose.yml
2. **Kubernetes**: 使用Kubernetes清单部署
3. **云服务**: AWS ECS、Google Cloud Run、Azure容器实例

### 性能优化
- **缓存**: 使用Redis缓存市场数据
- **数据库**: PostgreSQL用于持久化存储
- **负载均衡**: Nginx反向代理支持多实例
- **监控**: 内置健康检查和指标

## 开发指南

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

## 性能基准

### 系统性能
- **并发处理**: 支持1000+并发连接
- **延迟**: API响应时间 <100ms
- **吞吐量**: 每秒处理10,000+请求
- **数据更新**: 实时数据延迟 <1秒

### 资源使用
- **CPU**: 2-4核心推荐
- **内存**: 4-8GB推荐 
- **存储**: 10GB+可用空间
- **网络**: 稳定的互联网连接

## 许可证

本项目采用MIT许可证 - 详情请查看LICENSE文件。

## 🤝 联系我
- X: [@xindi_w](https://x.com/xindi_w)
- LinkedIn: [https://www.linkedin.com/in/xindi-wang19990526/](https://www.linkedin.com/in/xindi-wang19990526/)

欢迎交流数据接入、策略联调与多端演示需求。

## 🙏 致谢

- Yahoo Finance提供全球市场数据
- AkShare提供中国A股数据
- Tushare提供增强的中国市场数据
- FastAPI社区提供优秀框架
- Docker社区提供容器化支持
- 所有开源贡献者的无私奉献


# Arthera Quant Lab

<p align="center">
  <img src="docs/media/arthera-logo.svg" width="120" alt="Arthera Quant Lab logo" />
</p>

<h2 align="center">THE FIRST OPEN-SOURCE TERMINAL FOR CHINESE FINANCIAL AGENTS</h2>

<p align="center">
  <strong>Agents</strong> · <strong>Alpha</strong> · <strong>Advance</strong>
</p>

<p align="center">
  <a href="#-features"><img src="https://img.shields.io/badge/python-3.11%2B-3776AB?logo=python&logoColor=white" alt="Python" /></a>
  <a href="#-features"><img src="https://img.shields.io/badge/react-18%2B-61dafb?logo=react&logoColor=282c34" alt="React" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License" /></a>
  <img src="https://img.shields.io/badge/Status-Live%20Demo-success" alt="Status" />
</p>

<p align="center">
  <a href="https://x.com/xindi_w"><img src="https://img.shields.io/badge/Follow-X-000000?logo=x" alt="Follow on X" /></a>
  <a href="https://www.linkedin.com/in/xindi-wang19990526/"><img src="https://img.shields.io/badge/Connect-LinkedIn-0A66C2?logo=linkedin&logoColor=white" alt="LinkedIn" /></a>
  <a href="#%-connect"><img src="https://img.shields.io/badge/Join-Community-blueviolet" alt="Community" /></a>
</p>

<p align="center">
  English ｜ <a href="#中文简介">中文</a>
</p>

<p align="center">
  Arthera Quant Lab is a Bloomberg-grade workspace for A-share investors. It blends multi-agent research, live market control, and institutional risk tooling into one open, self-hostable stack.
</p>

---

## 特性

### 🎯 核心功能
- **UI体验** - 专业金融交易界面，命令栏系统(Ctrl+K)
- **实时数据流** - 基于WebSocket的毫秒级行情推送
- **量化策略引擎** - 集成QuantEngine，支持策略开发与回测
- **多数据源聚合** - AkShare + 自定义数据源，智能降级
- **风险管理系统** - VaR、CVaR、压力测试等专业风险指标
- **组合管理** - 投资组合构建、优化、再平衡
- **一键部署** - Docker容器化，本地快速启动

### 技术栈
**前端**: React 18 + TypeScript + Tailwind CSS + Bloomberg UI  
**后端**: FastAPI + PostgreSQL + Redis + Celery  
**数据**: AkShare + QuantEngine + 自定义数据源  
**部署**: Docker + Docker Compose

## 快速开始

### 前置要求
- Node.js 18+ 和 npm
- Python 3.11 + pip
- PostgreSQL 与 Redis（默认本地端口即可，也可以使用 Docker 提供的实例）
- Git

> 可选：若没有任何数据源 API Key，平台会自动降级为 Mock 数据，依旧可以体验全部 UI 功能。

### 本地部署步骤
```bash
# 克隆项目
git clone https://github.com/your-username/Arthera_Quant_Lab.git
cd Arthera_Quant_Lab

# 复制并编辑环境变量
cp .env.example .env
# 打开 .env，至少设置以下内容：
#   - ARTHERA_MASTER_KEY=随机长字符串
#   - SETTINGS_ADMIN_TOKEN=用于设置/报告的管理令牌
#   - (可选) FINNHUB_API_KEY 等真实数据源密钥

# 安装依赖
npm install
cd backend/api && pip install -r requirements.txt && cd ../..

# 启动所有服务（前端、FastAPI、QuantEngine、Qlib Worker、Tushare 代理）
./start_services.sh

# 浏览器访问
open http://localhost:3000
```

- **前端单独调试**：`npm run dev`
- **后端单独调试**：`cd backend/api && uvicorn main:app --reload --port 8004`
- 如需容器化，可自行创建 Dockerfile/docker-compose（默认未内置）。

服务端口:

| 服务              | 端口 | 描述                     |
|-------------------|------|--------------------------|
| FastAPI 网关      | 8004 | REST + WebSocket 主入口  |
| QuantEngine 微服务| 8003 | 因子/ML/风险分析接口     |
| Qlib Worker       | 8005 | 回测执行/策略调度        |
| Tushare Proxy     | 8010 | 服务端代理，避免浏览器直连|
| 前端 React 应用   | 3000 | Bloomberg UI             |

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│   React 18 + Bloomberg UI + CommandBar + Workspace         │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST/WebSocket API
┌──────────────────────▼──────────────────────────────────────┐
│                   API Gateway Layer                         │
│           FastAPI + Nginx Reverse Proxy                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼──────┐ ┌─────▼─────────┐
│ Quant Engine │ │Data Layer │ │ Task Queue    │
│   Service    │ │ Service   │ │   Service     │
└──────────────┘ └───────────┘ └───────────────┘
```

## 🎮 命令系统
```bash
Ctrl+K          # 打开命令面板
DASH            # 跳转Dashboard
LAB             # 策略实验室  
PORT            # 组合体检
RISK            # 风险画像
600519 PERF     # 查询贵州茅台表现
```

## 环境配置

### .env文件配置
```bash
# 数据库配置
DATABASE_URL=postgresql://quant_user:quant_pass@postgres:5432/arthera_quant
REDIS_URL=redis://redis:6379

# 数据源配置（可选）
AKSHARE_TOKEN=your_akshare_token
QUANTENGINE_LICENSE=your_quantengine_license
TUSHARE_TOKEN=your_tushare_token

# 缓存策略
CACHE_TTL_MARKET_DATA=30      # 实时数据缓存30秒
CACHE_TTL_HISTORICAL_DATA=3600 # 历史数据缓存1小时

# 前端可配置服务 (可选)
VITE_API_BASE_URL=http://localhost:8004
VITE_API_WS_URL=ws://localhost:8004
VITE_QUANTENGINE_URL=http://localhost:8003
VITE_QLIB_URL=http://localhost:8005
VITE_TUSHARE_PROXY_URL=http://localhost:8010/api/v1/tushare
VITE_ENABLE_REAL_API=true
VITE_ENABLE_BACKEND_PROBES=true
VITE_ENABLE_NEWS_API=true
VITE_ENABLE_REAL_DATA=true
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_AKSHARE=true
VITE_ENABLE_DEEPSEEK=true
VITE_ENABLE_CLOUD_SYNC=true
VITE_DEEPSEEK_API_KEY=<your_deepseek_key>

### 详细配置步骤
1. **复制环境文件**：运行 `cp .env.example .env` 并编辑 `.env`。此前缀的变量用于控制服务端端口和第三方密钥，至少需要配置 `ARTHERA_MASTER_KEY` 与 `SETTINGS_ADMIN_TOKEN`，否则设置面板无法保存。
2. **注入数据源密钥**：根据需要填写 `TUSHARE_TOKEN`、`FINNHUB_API_KEY`、`AKSHARE_TOKEN` 等，若留空前端会自动降级为 Mock 数据但仍可使用全部 UI。
3. **安装依赖**：
   - 前端：`npm install`
   - FastAPI：`cd backend/api && pip install -r requirements.txt`
   - QuantEngine/Qlib（可选）：在 `QuantEngine/`、`backend/qlib_worker/` 内执行对应的 `pip install -r requirements.txt`
4. **启动服务**：
   - 推荐运行 `./start_services.sh`，一次性启动 FastAPI(8004)/QuantEngine(8003)/Qlib Worker(8005)/Tushare Proxy(8010)。
   - 若手动：分别执行 `npm run dev`、`uvicorn backend.api.main:app --reload --port 8004`、`python backend/tushare_proxy/server.py`。
5. **设置界面校验**：首次打开 http://localhost:3000 后进入右上角「设置」→「API配置」，输入 `SETTINGS_ADMIN_TOKEN` 才能保存。可在此更新 Tushare Token、QuantEngine 地址，保存后所有服务立即热更新。
6. **健康检查**：访问 `http://localhost:8004/health` 或关注控制台 `✅ Backend connection verified` 日志。若看到 `⚠️ Tushare` 字样，确认 `backend/tushare_proxy` 是否已运行且端口与 `.env` 匹配。

完成上述步骤即可在浏览器访问 http://localhost:3000 ，ChartWorkbench、StrategyLab、Portfolio 等模块会依据 `.env` 及设置面板的值自动连接到正确的服务。

## 安全配置

- **SETTINGS_ADMIN_TOKEN**：所有 `/api/settings/**` 接口均需携带此令牌与 CSRF Token，确保只有受信端可更新 API 密钥。
- **ARTHERA_MASTER_KEY**：用于后端加密存储 API 密钥与用户偏好。不要提交真实值，生产环境请存放在安全密钥管理器。
- **API 密钥注入**：Finnhub/FMP/Tiingo 等所有第三方密钥通过环境变量注入（`FINNHUB_API_KEY` 等），默认不再写入仓库。
- **安全存储目录**：运行时敏感信息会被写入 `backend/.secrets/`（已加入 `.gitignore`），确保 Git 仓库中没有凭证。
- **前端验证流程**：设置面板新增“管理令牌”输入框，验证成功后才允许保存或测试服务；请在 HTTPS 环境下访问。
- **DeepSeek AI**：将 `VITE_DEEPSEEK_API_KEY` 和 `VITE_ENABLE_DEEPSEEK=true` 写入 `.env` 后，打开应用设置页的 “AI 模型” 标签即可选择 DeepSeek 相应模型。

### 报告服务 API
- `POST /api/v1/reports/generate`：从 AkShare 获取实时&历史数据，并调用 Qlib Worker 生成回测指标；保存 JSON 报告文件，返回下载信息。
- `GET /api/v1/reports/history`：列出已经生成的报告记录，可供前端展示和下载。
- `GET /api/v1/reports/download/{id}`：下载具体报告文件（需要 `X-Admin-Token`）。
- `POST /api/v1/reports/schedules`：创建按日/周/月执行的自动报告任务，调度器会在服务启动时运行并定期调用 Qlib/AkShare。
```

## API接口

### 市场数据
```bash
# 获取K线数据
GET /api/v1/market/kline/600519?period=1D&limit=500

# 批量行情
POST /api/v1/market/quotes
{"symbols": ["600519", "300750"]}

# 股票搜索
GET /api/v1/market/search?keyword=茅台
```

### 策略回测
```bash
# 运行回测
POST /api/v1/strategy/backtest
{
  "strategy_id": "ma_cross",
  "symbols": ["600519"],
  "start_date": "2023-01-01",
  "end_date": "2024-01-01"
}
```

## 性能指标
- **API响应时间**: <200ms (P95)
- **WebSocket延迟**: <50ms  
- **数据缓存命中率**: >90%
- **并发用户**: 100+ (单实例)

## 贡献指南
1. Fork项目
2. 创建功能分支
3. 提交PR

## 许可证
MIT License

---
**⚠️ 风险提示**: 本平台仅供学习研究使用，投资有风险，入市需谨慎。
  

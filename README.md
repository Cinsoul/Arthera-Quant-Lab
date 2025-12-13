# Arthera Quant Lab

![Image](https://github.com/user-attachments/assets/f004f6ad-0a85-4694-a0e1-172935710d7b)

<h2 align="center">面向华语投资者的开源量化终端</h2>

<p align="center">
  <strong>多智能体研究</strong> · <strong>实时风险洞察</strong> · <strong>自托管安全</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-18%2B-61dafb?logo=react&logoColor=282c34" alt="React" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue" alt="License" /></a>
  <a href="https://x.com/xindi_w"><img src="https://img.shields.io/badge/X-%E5%85%B3%E6%B3%A8-000000?logo=x&logoColor=white" /></a>
  <a href="https://www.linkedin.com/in/xindi-wang19990526/"><img src="https://img.shields.io/badge/LinkedIn-%E8%81%94%E7%B3%BB-0A66C2?logo=LinkedIn&logoColor=white" alt="LinkedIn" /></a>
</p>

<p align="center">
  Arthera Quant Lab 将TuShare/AkShare/QuantEngine 数据源以及 DeepSeek AI 助手整合到一个完全开源的终端中。所有敏感密钥本地加密，既可离线体验也可一键连接真实行情。
</p>

---

## 产品亮点

- **专业界面**：命令面板可配置 Workspace。  
- **多智能体内核**：QuantEngine、Qlib、DeepSeek Reasoner 协同完成选股、回测、研报生成。  
- **实时风险**：WebSocket 行情、VaR/CVaR、智能再平衡、组合医生面板。  
- **自托管安全**：配置加密、自动备份、Settings Admin Token 授权机制，支持完全离线演示。  
- **开放扩展**：FastAPI + React + Docker 结构，易于集成更多数据源或自研模型。

### 界面预览
<img width="1512" height="827" alt="Screenshot 2025-12-12 at 5 58 10 pm" src="https://github.com/user-attachments/assets/bace2774-5d1a-42da-8f1a-d835b76dde51" />
<img width="1512" height="819" alt="Screenshot 2025-12-12 at 8 53 12 pm" src="https://github.com/user-attachments/assets/2b63bc77-6874-4190-9a08-acab19190e60" />
<img width="919" height="746" alt="Screenshot 2025-12-12 at 6 14 04 pm" src="https://github.com/user-attachments/assets/07d29bd2-99dc-441d-93b4-0052693e70cb" />
<img width="908" height="743" alt="Screenshot 2025-12-12 at 6 14 10 pm" src="https://github.com/user-attachments/assets/bbaccaca-2383-40a8-980e-1dc1b00bd347" />
<img width="920" height="707" alt="Screenshot 2025-12-12 at 6 14 15 pm" src="https://github.com/user-attachments/assets/eb7ceceb-a3e2-4c52-920c-463feec31963" />
<img width="1512" height="826" alt="Screenshot 2025-12-12 at 5 58 24 pm" src="https://github.com/user-attachments/assets/bc15c52c-32f9-43a6-b35a-cc1009262923" />
<img width="1512" height="827" alt="Screenshot 2025-12-12 at 5 58 33 pm" src="https://github.com/user-attachments/assets/c52fcd85-e794-4122-83b7-cd0078f25b92" />


## 🛠 技术栈 & 架构

**Frontend**

- React 18 + TypeScript
- Tailwind CSS + 自研 Bloomberg 风格设计系统
- Recharts / ECharts（图表）
- Command Bar（`Ctrl + K`）+ Workspace 布局

**Backend**

- FastAPI 作为 API Gateway
- PostgreSQL 作为主数据存储
- Redis + Celery 处理任务队列与异步回测
- QuantEngine / Qlib Worker / TuShare & AkShare 代理服务

**Deployment**

- 本地：裸机启动脚本 + `.env` 配置
- 生产：推荐 Docker / Docker Compose + Nginx 反向代理

```text
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                       │
│   React 18 + Bloomberg UI + CommandBar + Workspace         │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST / WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                     API Gateway (FastAPI)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼───────────────┐
        │              │               │
┌───────▼──────┐ ┌─────▼───────┐ ┌─────▼─────────┐
│ QuantEngine │ │ Data Layer  │ │ Task Queue    │
│  Service    │ │ (AkShare…)  │ │ (Celery/Redis)│
└──────────────┘ └─────────────┘ └───────────────┘


## 功能 & 技术栈

| 模块 | 能力 |
| --- | --- |
| 组合体检 | 实时盈亏、风控雷达、持仓 Top10、智能调仓 | 
| 策略实验室 | 选股池构建、参数配置、Qlib/QuantEngine 回测、AI 研报导出 |
| 选股 / 报告中心 | TuShare/AkShare 数据、DeepSeek AI 摘要、批量导出 PDF/JSON |
| 系统设置 | API 密钥管理、AI 模型切换、风险控制、自动备份、通知中心 |

**前端**：React 18 · TypeScript · Tailwind · Zustand  
**后端**：FastAPI · Celery · PostgreSQL · Redis  
**数据源**：TuShare · AkShare · QuantEngine · DeepSeek · Finnhub/News API（可选）  
**部署**：Docker / docker-compose · `start_services.sh` 一键启动

## 快速开始

### 前置环境
- Node.js 18+ / npm
- Python 3.11+
- PostgreSQL、Redis（可用 Docker 默认端口）
- 推荐安装 `tuShare token`，但缺省即自动启用 Mock 数据

### 安装步骤
```bash
git clone https://github.com/your-username/Arthera_Quant_Lab.git
cd Arthera_Quant_Lab
cp .env.example .env    # 填写 ARTHERA_MASTER_KEY / SETTINGS_ADMIN_TOKEN 等
npm install
cd backend/api && pip install -r requirements.txt && cd ../..
./start_services.sh     # 启动前端 + FastAPI + QuantEngine + TuShare Proxy
open http://localhost:3000
```

- 只启动前端：`npm run dev`
- 单独调试后端：`cd backend/api && uvicorn main:app --reload --port 8004`

### 设置说明
1. `.env` 中至少填写 `ARTHERA_MASTER_KEY`、`SETTINGS_ADMIN_TOKEN`，可选地写入 `TUSHARE_TOKEN`、`FINNHUB_API_KEY` 等。  
2. 浏览器首次进入点击右上角「设置」，输入 `SETTINGS_ADMIN_TOKEN` 后即可保存 API Key。  
3. `http://localhost:8004/health` 返回 200 代表 FastAPI 正常；若提示 `ERR_CONNECTION_REFUSED`，请确认 `start_services.sh` 中的服务已全部拉起。  
4. `backend/tushare_proxy/server.py` 会把浏览器请求改为本地 8010 端口，避免 CORS/Token 泄露。

## 环境变量速查

```bash
DATABASE_URL=postgresql://quant_user:quant_pass@postgres:5432/arthera_quant
REDIS_URL=redis://redis:6379
TUSHARE_TOKEN=your_token           # 可选
AKSHARE_TOKEN=your_token
SETTINGS_ADMIN_TOKEN=xxxx          # 前端设置页所需的管理令牌
ARTHERA_MASTER_KEY=xxxx            # 后端加密密钥
VITE_API_BASE_URL=http://localhost:8004
VITE_TUSHARE_PROXY_URL=http://localhost:8010/api/v1/tushare
VITE_ENABLE_REAL_DATA=true
VITE_ENABLE_DEEPSEEK=true
VITE_DEEPSEEK_API_KEY=sk-xxxx
```

## 联系我

- X / Twitter：[@xindi_w](https://x.com/xindi_w)  
- LinkedIn：[Xindi Wang](https://www.linkedin.com/in/xindi-wang19990526/)  
- 欢迎通过 GitHub Issues/PR 反馈 Bug 或提交功能建议。

---

感谢关注 Arthera Quant Lab！希望它能帮助你更快地完成 A 股量化研究与风险管理。

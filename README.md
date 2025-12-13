# Arthera Quant Lab

[Image](https://github.com/user-attachments/assets/2e67bbe6-ef62-46c3-a130-3edebc77260a)

 
<h2 align="center">面向华语投资者的开源量化终端</h2>

<p align="center">
  <strong>多智能体研究</strong> · <strong>实时风险洞察</strong> · <strong>自托管安全</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-18%2B-61dafb?logo=react&logoColor=282c34" alt="React" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue" alt="License" /></a>
  <a href="https://x.com/xindi_w"><img src="https://img.shields.io/badge/X-%E5%85%B3%E6%B3%A8-000000?logo=x&logoColor=white" alt="X" /></a>
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

## 产品模块一览

平台整体按照一个投资者的真实工作流来设计，从选股 → 策略 → 回测 → 组合 → 报告形成闭环：

Overview 总览

一屏看到：策略表现、组合收益 & 回撤、风险偏好、AI 总结

快捷入口：Strategy Lab / Portfolio / Reports

Strategy Lab 策略实验室

预设股票池 + 自定义条件选股

参数调优、样本区间设置、压力测试场景

一键把策略送往回测或组合

Strategy Compare 数据对比

多策略横向对比：年化收益、最大回撤、Sharpe、胜率等

支持按“收益 / 风险 / 交易特征”不同视角切换

AI 生成组合建议与策略搭配方案

Stock Picker 选股器

行业 / 因子 / 市值 / 流动性多维筛选

推荐股票池 & 自定义股票池管理

直接将筛选结果送入 Strategy Lab 或 Portfolio

Portfolio Checkup 组合体检

实盘/模拟组合导入，支持手工录入或 API 同步

组合健康度雷达图、净值回测、风险指标（VaR、Beta 等）

一键 rebalance 方案与持仓贡献分析

Report Center 报告中心

回测报告 / 技术报告 / 组合报告统一管理

支持导出 PDF / PPT / JSON 原始数据（视实现而定）

自定义报告模版 & 定时任务（周报、月报）

Chart Workbench 图表工作台

专业 K 线 + 量价图 + 指标叠加

绘图工具 & 标注系统（支持交易计划 / 回顾）

右侧与因子评分、量化信号、组合持仓联动

### 界面预览
<img width="920" height="707" alt="Screenshot 2025-12-12 at 6 14 15 pm" src="https://github.com/user-attachments/assets/d0fa392a-cdbe-4453-9b5a-4620176967d9" />
<img width="919" height="746" alt="Screenshot 2025-12-12 at 6 14 04 pm" src="https://github.com/user-attachments/assets/496fcfa7-e101-422e-9f6e-d0ab0b1929c2" />
<img width="908" height="743" alt="Screenshot 2025-12-12 at 6 14 10 pm" src="https://github.com/user-attachments/assets/8313e5b8-276d-4fe7-9c02-dc1769692734" />
<img width="1512" height="827" alt="Screenshot 2025-12-12 at 5 58 33 pm" src="https://github.com/user-attachments/assets/65e3d413-f643-4386-aefc-cf549292f704" />
<img width="1512" height="826" alt="Screenshot 2025-12-12 at 5 58 24 pm" src="https://github.com/user-attachments/assets/9867d3aa-56b7-4447-a796-90c344b7c0b0" />
<img width="1512" height="827" alt="Screenshot 2025-12-12 at 5 58 10 pm" src="https://github.com/user-attachments/assets/59dc66d0-412e-4772-8815-0ddbd57181d2" />

技术栈 & 架构

Frontend

React 18 + TypeScript

Tailwind CSS + 自研 Bloomberg 风格设计系统

Recharts / ECharts（图表）

Command Bar（Ctrl + K）+ Workspace 布局

Backend

FastAPI 作为 API Gateway

PostgreSQL 作为主数据存储

Redis + Celery 处理任务队列与异步回测

QuantEngine / Qlib Worker / TuShare & AkShare 代理服务

Deployment

本地：裸机启动脚本 + .env 配置

生产：推荐 Docker / Docker Compose + Nginx 反向代理

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
git clone https://github.com/Cinsoul/Arthera-Quant-Lab.git
cd Arthera-Quant-Lab
cp .env.example .env    # 填写 SECRET_KEY / SETTINGS_ADMIN_TOKEN 等
npm install
cd backend/api && pip install -r requirements.txt && cd ../..
./start_services.sh     # 启动前端 + FastAPI + QuantEngine + TuShare Proxy
open http://localhost:3000
```

- 只启动前端：`npm run dev`
- 单独调试后端：`cd backend/api && uvicorn main:app --reload --port 8002`

### 设置说明
1. `.env` 中至少填写 `SECRET_KEY`、`SETTINGS_ADMIN_TOKEN`，可选地写入 `TUSHARE_TOKEN`、`FINNHUB_API_KEY` 等。  
2. 浏览器首次进入点击右上角「设置」，输入 `SETTINGS_ADMIN_TOKEN` 后即可保存 API Key。  
3. `http://localhost:8002/health` 返回 200 代表 FastAPI 正常；若提示 `ERR_CONNECTION_REFUSED`，请确认 `start_services.sh` 中的服务已全部拉起。  
4. `backend/tushare_proxy/server.py` 会把浏览器请求改为本地 8010 端口，避免 CORS/Token 泄露。

## 环境变量速查

```bash
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/arthera_quant
POSTGRES_DB=arthera_quant
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_secure_password
SECRET_KEY=your-super-secret-jwt-key-here-minimum-32-characters
TUSHARE_TOKEN=your-tushare-api-token-here     # 可选
AKSHARE_TOKEN=
SETTINGS_ADMIN_TOKEN=your-admin-token-here    # 前端设置页所需的管理令牌
VITE_API_URL=http://localhost:8002
VITE_TUSHARE_PROXY_URL=http://localhost:8010/api/v1/tushare
VITE_TUSHARE_TOKEN=your-tushare-api-token-here
```

> 建议把 `.env`、实际数据文件、回测结果加入 `.gitignore`，仓库仅提交 `.env.example` 与 `config_templates/`，方便发布。

## 安全与备份

- 所有敏感配置均存储在 `backend/.secrets/`，不会写入 Git。  
- Settings 面板提供"自动备份 + 加密"选项，默认每天备份一次。  
- Risk 管理页可配置默认风险偏好、最大单仓比例、贝叶斯风控开关。  
- DeepSeek / Finnhub / News API 等第三方密钥通过设置页注入，可随时测试连接。

## 联系我

- X / Twitter：[@xindi_w](https://x.com/xindi_w)  
- LinkedIn：[Xindi Wang](https://www.linkedin.com/in/xindi-wang19990526/)  
- 欢迎通过 GitHub Issues/PR 反馈 Bug 或提交功能建议。

---

感谢关注 Arthera Quant Lab！希望它能帮助你更快地完成 A 股量化研究与风险管理。

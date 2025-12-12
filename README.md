# Arthera Quant Lab

<p align="center">
  <Gemini_Generated_Image_w7m746w7m746w7m7.png" />
</p>

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

### 界面预览

<div align="center">
  <Screenshot 2025-12-12 at 5.58.10 pm" />
  <Screenshot 2025-12-12 at 8.53.12 pm" />
  <Screenshot 2025-12-12 at 6.14.25 pm" />
  <Screenshot 2025-12-12 at 6.14.10 pm" />
  <Screenshot 2025-12-12 at 5.58.33 pm" />
  <Screenshot 2025-12-12 at 5.58.24 pm" />
</div>

> 如果需要展示更多截图，只需把 PNG 放入 `docs/media/` 并在 README 中引用相对路径即可。

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

> 建议把 `.env`、实际数据文件、回测结果加入 `.gitignore`，仓库仅提交 `.env.example` 与 `config_templates/`，方便发布。

## 安全与备份

- 所有敏感配置均存储在 `backend/.secrets/`，不会写入 Git。  
- Settings 面板提供“自动备份 + 加密”选项，默认每天备份一次。  
- Risk 管理页可配置默认风险偏好、最大单仓比例、贝叶斯风控开关。  
- DeepSeek / Finnhub / News API 等第三方密钥通过设置页注入，可随时测试连接。

## 联系我

- X / Twitter：[@xindi_w](https://x.com/xindi_w)  
- LinkedIn：[Xindi Wang](https://www.linkedin.com/in/xindi-wang19990526/)  
- 欢迎通过 GitHub Issues/PR 反馈 Bug 或提交功能建议。

---

感谢关注 Arthera Quant Lab！希望它能帮助你更快地完成 A 股量化研究与风险管理。

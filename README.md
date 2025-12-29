# Arthera 统一量化交易系统

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Discord](https://img.shields.io/discord/123456789?color=7289da&logo=discord&logoColor=white)](https://discord.gg/arthera)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/xindi-wang19990526/)
[![X](https://img.shields.io/badge/X-Follow-000000?logo=x)](https://x.com/xindi_w)

[English](README.en.md) | [中文 (简体)](README.md) | [中文 (繁體)](README.zh.md)

---

## 项目简介

Arthera统一量化交易系统是一个**社区驱动的多智能体量化交易应用平台**。我们的使命是构建世界上最大的去中心化量化交易社区。

它提供了一支顶级量化策略团队，帮助您进行股票选择、研究、跟踪甚至交易。系统将您的所有敏感信息本地存储在您的设备上，确保核心数据安全。

欢迎加入我们的Discord社区，分享您遇到的反馈和问题，邀请更多开发者贡献 🔥🔥🔥

> **注意：** Arthera团队成员绝不会主动联系社区参与者。此项目仅供教育和研究目的使用。

---

## 🎯 核心特性

### 🤖 AI驱动的交易系统
- **多AI Provider支持**：集成DeepSeek、OpenAI、Claude三大AI模型
- **智能信号生成**：AI批量生成交易信号，支持自动刷新和智能fallback
- **实时AI聊天**：内置AI聊天助手，提供市场分析和交易建议
- **智能信号获取**：自动选择最佳信号源，确保交易决策质量

### 📊 专业量化策略
- **多策略支持**：贝叶斯动量、凯利优化、风险平价等专业策略
- **策略回测**：完整的回测引擎，支持历史数据验证
- **实时执行**：策略实时执行和监控，自动化交易流程

### 💼 企业级交易界面
- **Bloomberg风格界面**：专业的深色主题交易终端
- **实时数据展示**：持仓、盈亏、风险指标、交易信号实时更新
- **智能仓位管理**：Position Manager提供实时监控、一键清仓和数据导出
- **完整国际化**：中英文无缝切换，所有文本使用键值对管理

### 🔄 多数据源集成
- **智能数据聚合**：Yahoo Finance、AkShare、Tushare Pro、Binance、Kraken等
- **自动故障转移**：数据源智能切换，确保数据获取稳定性
- **实时市场数据**：股票、期货、加密货币实时行情

### 🛡️ 安全与监控
- **全平台服务监控**：25+个外部API和数据源实时健康检查
- **企业级安全配置**：敏感数据本地化，支持多平台API密钥管理
- **实时风险监控**：VaR计算、夏普比率、最大回撤等专业指标

### 📱 跨平台支持
- **iOS移动端**：Swift SDK支持，WebSocket实时推送
- **Web界面**：响应式设计，支持桌面和移动浏览器
- **API接口**：完整的RESTful API，易于第三方集成

---

## 🏗️ 系统架构

```
iOS App (现有完整量化服务)
    ↓ HTTP/WebSocket
iOS Connector (端口8002) → API Gateway (端口8001)
    ↓                           ↓
现有后端服务                     新增统一路由层
├── QuantEngine                 ├── 市场数据路由
├── Arthera_Quant_Lab          ├── 策略执行路由
├── qlib框架                   ├── 信号生成路由
├── ML模型训练工具             ├── AI服务路由
└── AI Agents (DeepSeek/       └── 投资组合路由
    OpenAI/Claude)
```

---

## 💻 系统要求

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

---

## 🚀 快速启动

### 方式 1: 一键启动（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/Cinsoul/Arthera-Quant-Lab.git
cd TradingEngine

# 2. 初始化环境
./scripts/bootstrap.sh      # 创建虚拟环境并安装依赖

# 3. 配置API密钥（可选但推荐）
cp ai_providers_config.example.json ai_providers_config.json
# 编辑 ai_providers_config.json，填入您的API密钥

# 4. 启动完整系统
./start-demo.sh             # 启动所有Docker容器
```

### 方式 2: 简化启动

```bash
# 适用于快速演示，无需复杂配置
./start-simple-demo.sh
```

### 方式 3: 本地Python运行

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 配置AI Providers（推荐）
cp ai_providers_config.example.json ai_providers_config.json
# 编辑文件并填入API密钥

# 3. 启动演示服务器
python demo_server.py

# 4. 访问界面
# 浏览器打开: http://localhost:8001
```

---

## 🔑 AI配置指南

本系统支持三大AI Provider，需要配置API密钥才能使用AI功能。

### 获取API密钥

#### 1. DeepSeek API (推荐)
- 访问：https://platform.deepseek.com
- 注册并创建API密钥
- 格式：`sk-xxxxxxxx`

#### 2. OpenAI API
- 访问：https://platform.openai.com
- 创建API密钥
- 格式：`sk-proj-xxxxxxxx`

#### 3. Claude API (Anthropic)
- 访问：https://console.anthropic.com
- 创建API密钥
- 格式：`sk-ant-xxxxxxxx`

### 配置步骤

1. **复制配置示例**
```bash
cp ai_providers_config.example.json ai_providers_config.json
```

2. **编辑配置文件**
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

3. **启动服务**
```bash
python demo_server.py
```

4. **验证配置**
- 访问 http://localhost:8001
- 进入 `CONFIG → AI配置` 页面
- 确认所有Provider显示为 "CONNECTED"

详细配置指南请查看 [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)

---

## 🌐 服务访问

启动成功后，以下服务将可用：

### 核心API端点
- **API Gateway**: http://localhost:8001
- **iOS Connector**: http://localhost:8002
- **系统健康检查**: http://localhost:8001/health
- **AI状态**: http://localhost:8001/api/ai/status

### 演示面板
- **主界面**: http://localhost:8001/
- **系统状态**: http://localhost:8001/dashboard/system-status
- **交易统计**: http://localhost:8001/dashboard/trading-stats

### AI功能端点
- **AI聊天**: http://localhost:8001/api/ai-chat/analyze
- **批量信号生成**: http://localhost:8001/api/ai/batch-generate-signals
- **最近信号**: http://localhost:8001/signals/recent

### iOS连接
- **API Base URL**: `http://localhost:8001`
- **iOS专用端点**: `http://localhost:8002`
- **WebSocket**: `ws://localhost:8002/ios/ws`

---

## 📚 文档

- **AI配置指南**: [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)
- **策略和算法文档**: [STRATEGIES_AND_ALGORITHMS.md](STRATEGIES_AND_ALGORITHMS.md)
- **功能文档**: [ENHANCED_FEATURES.md](ENHANCED_FEATURES.md)
- **安全检查清单**: [GITHUB_COMMIT_CHECKLIST.md](GITHUB_COMMIT_CHECKLIST.md)
- **快速提交指南**: [QUICK_COMMIT_GUIDE.md](QUICK_COMMIT_GUIDE.md)

---

## 🔐 安全提醒

⚠️ **重要安全提示**：

1. **永远不要**在代码中硬编码API密钥
2. **不要**将 `ai_providers_config.json` 提交到Git
3. **不要**将 `.env` 文件提交到Git
4. **不要**分享包含真实密钥的配置文件

✅ **安全做法**：

1. 使用 `ai_providers_config.example.json` 作为模板
2. 本地创建 `ai_providers_config.json` 并填入密钥
3. 定期轮换API密钥
4. 使用提交前检查脚本：`./PRE_COMMIT_CHECK.sh`

---

## 🛠️ 开发指南

### 项目结构

```
TradingEngine/
├── demo_server.py              # 主服务器
├── index.html                  # 前端界面
├── ai_providers_config.json    # AI配置（不提交）
├── .env                        # 环境变量（不提交）
├── services/
│   ├── api-gateway/           # API网关
│   ├── ios-connector/         # iOS连接器
│   ├── quant-engine/          # 量化引擎
│   └── ai-agents/             # AI代理
├── config/
│   └── pools.json             # 股票池配置
└── static/
    ├── ai-chat-widget.html    # AI聊天组件
    └── ai-chat-loader.js      # AI聊天加载器
```

### 提交代码前

```bash
# 运行安全检查
./PRE_COMMIT_CHECK.sh

# 如果检查通过，提交代码
git add <files>
git commit -m "your message"
git push origin main
```

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

1. Fork本项目
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个Pull Request

请确保：
- 代码符合项目规范
- 运行 `./PRE_COMMIT_CHECK.sh` 检查通过
- 更新相关文档
- 不包含敏感信息

---

## 📜 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 📞 联系方式

- **Discord**: https://discord.gg/arthera
- **LinkedIn**: https://www.linkedin.com/in/xindi-wang19990526/
- **X (Twitter)**: https://x.com/xindi_w
- **GitHub Issues**: https://github.com/Cinsoul/Arthera-Quant-Lab/issues

---

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和社区成员！

特别感谢：
- DeepSeek、OpenAI、Anthropic 提供AI服务
- Yahoo Finance、AkShare、Tushare提供数据支持
- 开源社区提供的各种优秀工具和库

---

## ⚠️ 免责声明

本项目仅供教育和研究目的使用。使用本系统进行实际交易需自行承担风险。开发团队不对任何交易损失负责。

请遵守当地法律法规，谨慎交易。

---

**最后更新**: 2025-12-29
**版本**: 2.0.0

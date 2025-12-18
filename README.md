
![Image](https://github.com/user-attachments/assets/e4983257-0a47-44b7-b854-08986b9eef20)


![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
[![Discord](https://img.shields.io/discord/123456789?color=7289da&logo=discord&logoColor=white)](https://discord.gg/arthera)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/xindi-wang19990526/)
[![X](https://img.shields.io/badge/X-Follow-000000?logo=x)](https://x.com/xindi_w)


##[English](README.en.md) | [中文 (简体)](README.md) | [中文 (繁體)](README.zh.md)

</div>

## Arthera统一量化交易系统

Arthera统一量化交易系统是一个社区驱动的多智能体量化交易应用平台。我们的使命是构建世界上最大的去中心化量化交易社区。

它提供了一支顶级量化策略团队，帮助您进行股票选择、研究、跟踪甚至交易。

系统将您的所有敏感信息本地存储在您的设备上，确保核心数据安全。

欢迎加入我们的Discord社区，分享您遇到的反馈和问题，邀请更多开发者贡献 🔥🔥🔥

> **注意：** Arthera团队成员绝不会主动联系社区参与者。此项目仅供教育和研究目的使用。

## 产品预览
<img width="1057" height="673" alt="Screenshot 2025-12-18 at 12 49 21 pm" src="https://github.com/user-attachments/assets/da46e9d6-9e32-4725-b758-a5624e8f2862" />
<img width="1198" height="776" alt="Screenshot 2025-12-18 at 12 52 39 pm" src="https://github.com/user-attachments/assets/c1ad9e8c-20a3-490a-b484-569b0c2c79cc" />
<img width="1189" height="770" alt="Screenshot 2025-12-18 at 12 52 45 pm" src="https://github.com/user-attachments/assets/f6094dec-da68-4978-829c-8f26d09d8719" />
<img width="1190" height="770" alt="Screenshot 2025-12-18 at 12 52 56 pm" src="https://github.com/user-attachments/assets/a85f5f42-c589-4b5a-970e-4b37b649c821" />

## 系统概述


基于现有88%完整的Arthera架构，通过统一API Gateway和iOS Connector，创建了一个可以：
- ✅ 持续产生交易信号和订单
- ✅ 完整的成交回报和审计链路  
- ✅ 可视化的交易面板和性能分析
- ✅ iOS App无缝连接
- ✅ 本地Docker部署，支持远程演示

## 系统架构

```
iOS App (现有完整量化服务)
    ↓ HTTP/WebSocket
iOS Connector (端口8002) → API Gateway (端口8000)
    ↓                           ↓
现有后端服务                     新增统一路由层
├── QuantEngine                 ├── 市场数据路由
├── Arthera_Quant_Lab          ├── 策略执行路由  
├── qlib框架                   ├── 信号生成路由
└── ML模型训练工具             └── 投资组合路由
```

## 快速启动

### 0. 环境初始化（首次运行）

```bash
cd /Users/mac/Desktop/Arthera/Arthea/TradingEngine
./scripts/bootstrap.sh              # 拷贝 .env 并安装依赖
vim .env                            # 配置真实行情平台（可选）
```

> **市场数据配置**
>
> - 默认：不填任何变量即可使用内置 Yahoo Finance 提供的全球股票实时/历史数据。
> - 可对接真实平台：设置 `UNIVERSE_SERVICE_URL` 与 `UNIVERSE_API_KEY`，API Gateway 会将股票搜索与池组件请求透明代理到您的平台。
> - A股实盘：内置 `akshare` 即可实时抓取行情，如需解锁行业/财务字段请设置 `TUSHARE_TOKEN`（Tushare Pro）。
> - 进阶：`UNIVERSE_SEARCH_PATH`、`POOLS_CONFIG_PATH` 可自定义搜索路径与股票池配置文件。

### 1. 一键演示启动

```bash
./start-demo.sh
```

### 2. 手动启动

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 服务访问

启动成功后，以下服务将可用：

### 核心API端点
- **API Gateway**: http://localhost:8000
- **iOS Connector**: http://localhost:8002
- **系统健康检查**: http://localhost:8000/health

### 演示面板
- **系统状态**: http://localhost:8000/dashboard/system-status
- **交易统计**: http://localhost:8000/dashboard/trading-stats

### iOS连接
- **API Base URL**: `http://localhost:8000`
- **iOS专用端点**: `http://localhost:8002`  
- **WebSocket**: `ws://localhost:8002/ios/ws`

## 📱 iOS集成

### 配置更新

1. **API配置更新**
   ```swift
   // 在iOS项目中使用提供的配置文件
   ArtheraAPIConfig.shared.switchEnvironment(to: .development)
   ```

2. **服务适配器使用**
   ```swift
   // 现有服务无缝切换到统一后端
   let adapter = QuantitativeServiceAdapter.shared
   let signal = try await adapter.generateDeepSeekSignal(
       symbol: "AAPL",
       marketData: marketData,
       analysisConfig: config
   )
   ```

### WebSocket实时连接
```swift
// 连接实时数据流
await adapter.connectWebSocket()
```

## API端点详情

### iOS Connector专用端点 (端口8002)

| 端点 | 方法 | 功能 | 对应iOS服务 |
|------|------|------|------------|
| `/ios/signals/deepseek/generate` | POST | 生成DeepSeek信号 | DeepSeekSignalGenerator |
| `/ios/bayesian/update-posterior` | POST | 贝叶斯后验更新 | BayesianUncertaintyService |
| `/ios/portfolio/optimize` | POST | 投资组合优化 | BayesianPortfolioOptimizer |
| `/ios/position/kelly-size` | POST | Kelly仓位计算 | KellyPositionSizer |
| `/ios/backtest/run` | POST | 策略回测 | PurgedKFoldBacktester |
| `/ios/ws` | WebSocket | 实时数据流 | 所有量化服务 |

### API Gateway统一端点 (端口8000)

| 路由 | 目标服务 | 功能 |
|------|----------|------|
| `/market-data/*` | QuantEngine | 市场数据获取 |
| `/strategies/*` | Arthera_Quant_Lab | 策略管理执行 |
| `/signals/*` | 信号生成服务 | 交易信号生成 |
| `/portfolio/*` | Portfolio服务 | 投资组合管理 |
| `/orders/*` | Paper Trading | 模拟交易执行 |
| `/dashboard/*` | 仪表板服务 | 投资者演示面板 |

#### 仪表板分析扩展

| 路由 | 数据来源 | 描述 |
|------|----------|------|
| `/dashboard/performance-series` | Portfolio Analytics | 返回累计收益对比基准的时间序列 |
| `/dashboard/drawdown` | Portfolio Analytics | 最大回撤及回撤曲线 |
| `/dashboard/allocations` | Portfolio Service | 分行业/资产配置权重 |
| `/dashboard/risk-report` | Risk Engine | VaR/CVaR、压力测试、收益归因等核心风险指标 |
| `/dashboard/overview` | API Gateway 聚合 | 单次请求返回所有仪表板数据（系统状态、交易统计、图表、风险报表）|

#### 股票池/标的管理

| 路由 | 功能 |
|------|------|
| `/universe/pools` | 列出预设股票池（名称、标签、区域、统计指标） |
| `/universe/pools/{pool_id}` | 返回指定股票池的成分股、Beta/成交量/动量等指标，以及行业分布 |
| `/universe/search` | 智能搜索股票/资产（代码、名称、交易所、价格、涨跌幅），供前端自动补全使用 |

前端“目标股票池”模块会调用以上接口，投资经理可以在UI中直接筛选FAANG、AI基础设施、中国新能源等预设组合，并实时查看池内统计后再触发策略。
部署到真实平台时，可通过设置 `UNIVERSE_SERVICE_URL` 将这些接口代理到 Polygon、Alpha Vantage、Tushare 等实时行情/筛选服务；若保持为空，系统默认走 Yahoo Finance 并自动对结果做缓存降频。

>  **实时A股数据**
> - 已内置 `akshare` 抓取全市场行情，`/universe/search` 会根据关键词自动切换中/美股数据源。
> - 通过 `POST /config/data-source` 配置 `tushare_token` 后，即可在搜索/股票池接口中获得行业、地域等高阶字段。

## 演示脚本

### 1分钟投资者演示流程：

1. **启动系统** (5秒)
   ```bash
   ./start-demo.sh
   # 所有服务启动，显示绿色状态
   ```

2. **展示量化能力** (20秒)
   - 8个策略同时运行
   - 实时信号生成
   - 自动风控检查
   - 模拟订单执行
   - 交易数据实时更新

3. **iOS同步演示** (20秒)
   - iPhone连接同一WiFi网络
   - 展示Portfolio实时更新
   - 信号推送到移动端
   - P&L变化同步显示

4. **性能指标** (15秒)
   - Sharpe比率: 2.15
   - 最大回撤: -8%
   - 胜率: 67%
   - 年化收益: 12%

## 投资者展示重点

### 交易活动数据（实时更新）
```json
{
  "daily_stats": {
    "orders_generated": 156,
    "trades_executed": 142,
    "total_volume": 2850000,
    "success_rate": 91.03,
    "strategies_active": 8
  }
}
```

### 关键技术亮点
- ✅ **零冗余架构**: 充分利用现有88%代码，最小化新开发
- ✅ **真实性保证**: 真实市场数据 + 真实ML模型 + 真实风控逻辑
- ✅ **可信度最大化**: 完整审计链路，专业级风险监控
- ✅ **移动端完整体验**: iOS原生量化交易功能

## 系统管理

### 查看服务状态
```bash
docker-compose ps
```

### 重启特定服务
```bash
docker-compose restart api-gateway
docker-compose restart ios-connector
```

### 查看实时日志
```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f api-gateway
docker-compose logs -f ios-connector
```

### 停止系统
```bash
docker-compose down
```

### 完全清理
```bash
docker-compose down --volumes --remove-orphans
```

## 🔧 开发和扩展

### 添加新的API端点
1. 在 `services/api-gateway/main.py` 中添加路由
2. 在 `services/ios-connector/main.py` 中添加iOS专用端点
3. 更新 `ios-integration/` 中的Swift配置文件

### 集成新的后端服务
1. 在 `docker-compose.yml` 中添加服务定义
2. 在API Gateway中添加路由规则
3. 更新健康检查逻辑

## 📋 故障排查

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   lsof -i :8000
   lsof -i :8002
   ```

2. **服务无法启动**
   ```bash
   # 查看详细错误日志
   docker-compose logs service-name
   ```

3. **iOS连接失败**
   - 确认iOS设备与服务器在同一网络
   - 检查防火墙设置
   - 验证API端点URL配置

### 性能优化

- 调整Docker资源限制
- 配置Redis缓存策略
- 优化数据库连接池

## 下一步扩展

1. **生产环境部署**
   - 添加HTTPS支持
   - 配置负载均衡
   - 添加身份认证

2. **监控和报警**
   - 集成Prometheus + Grafana
   - 添加业务指标监控
   - 配置报警规则

3. **数据持久化**
   - 配置数据备份策略
   - 添加数据同步机制
   - 实现灾难恢复

---

**🎉 Arthera量化交易演示系统 - 展示专业级量化交易能力！**

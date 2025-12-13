# 🔒 端口配置已统一固定

## 📋 固定端口分配

### 主要服务
- **前端应用**: `3000` (首选) / `3001` (备用)
- **后端 API**: `8002` (固定)

### 外部服务预留端口
- **QuantEngine**: `8003`
- **Qlib Service**: `8004`

## ✅ 已修复的文件

### 1. 环境配置文件
- **`.env`**: 统一使用 8002 端口
- **`backend/api/config.py`**: 添加固定端口配置
- **`vite.config.ts`**: 设置前端端口为 3000

### 2. 后端配置
- **`backend/api/main.py`**: CORS 配置仅允许 3000/3001 端口
- **`backend/api/config.py`**: 新增 API_HOST 和 API_PORT 配置

### 3. 前端服务配置
- **`src/services/MarketDataProvider.ts`**: 8000 → 8002
- **`src/services/StockInfoService.ts`**: 8000 → 8002  
- **`src/services/Level2DataService.ts`**: 8000 → 8002
- **`src/services/QuantEngineService.ts`**: 使用环境变量 8003
- **`src/services/index.ts`**: 健康检查端点统一为 8002

## 🚀 启动方式

### 方式一：使用启动脚本 (推荐)
```bash
./start_services.sh
```

### 方式二：手动启动
```bash
# 后端 (端口 8002)
cd backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8002

# 前端 (端口 3000)
npm run dev
```

## 🎯 访问地址

- **前端**: http://localhost:3000 (或 3001)
- **后端 API**: http://localhost:8002
- **API 文档**: http://localhost:8002/docs
- **健康检查**: http://localhost:8002/health

## 📌 重要说明

1. **不再随意更改端口** - 所有端口现已固定配置
2. **统一使用环境变量** - 通过 .env 文件管理配置
3. **CORS 配置精简** - 仅允许必要的前端端口访问
4. **向前兼容** - 保留 3001 端口作为前端备用

## 🔍 端口检查命令

```bash
# 检查前端端口
lsof -i :3000

# 检查后端端口
lsof -i :8002

# 一键检查所有端口
lsof -i :3000,:3001,:8002,:8003,:8004
```

## ✨ 好处

- **避免端口冲突** - 固定配置减少随机端口问题
- **简化部署** - 统一的端口配置便于运维
- **提高稳定性** - 减少因端口变动导致的服务不匹配
- **便于调试** - 固定端口便于问题排查

现在所有服务都使用固定端口，不会再出现端口不匹配的问题！
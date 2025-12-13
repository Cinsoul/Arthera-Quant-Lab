# 🔒 Arthera Quant Lab 固定端口配置

## 统一端口分配

### 前端服务
- **开发服务器**: `3000` (固定)
- **备用端口**: 仅在 3000 被占用时使用系统分配

### 后端服务
- **FastAPI 主服务**: `8002` (固定)
- **健康检查**: http://localhost:8002/health
- **API 文档**: http://localhost:8002/docs

### 外部服务端口（预留）
- **QuantEngine**: `8003` 
- **Qlib Service**: `8004`
- **WebSocket**: `8002` (与主服务共用)

## 配置说明

### 1. 环境变量 (.env)
```env
# 固定配置，请勿修改
REACT_APP_API_URL=http://localhost:8002
REACT_APP_WS_URL=ws://localhost:8002
REACT_APP_API_PORT=8002
```

### 2. Vite 配置 (vite.config.ts)
```typescript
server: {
  port: 3000,
  strictPort: false, // 允许在端口被占用时自动切换
  host: 'localhost'
}
```

### 3. 后端配置 (backend/config.py)
```python
API_PORT = 8002
API_HOST = "0.0.0.0"
```

## 启动命令

### 前端
```bash
npm run dev
# 访问: http://localhost:3000
```

### 后端
```bash
cd backend
uvicorn api.main:app --reload --port 8002
# 访问: http://localhost:8002
```

## 注意事项

1. **请勿随意更改端口配置**，所有服务已按此配置优化
2. 如遇端口冲突，请先检查并关闭占用端口的服务
3. 生产环境部署时需要更新为相应的生产端口和域名

## 端口占用检查

```bash
# 检查前端端口
lsof -i :3000

# 检查后端端口  
lsof -i :8002

# 强制释放端口（慎用）
kill -9 $(lsof -ti:3000)
kill -9 $(lsof -ti:8002)
```
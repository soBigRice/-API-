# API Collection Server

基于 NestJS + TypeORM + MySQL 的接口聚合服务，当前用于给个人网站提供公共 API 的统一访问入口。

## 当前已接入能力

- 油价查询（按城市关键字）
- 24 小时数据库缓存，减少上游免费额度消耗

## 技术栈

- NestJS 11
- TypeORM 0.3
- MySQL（`mysql2`）
- Node.js（建议 18+，推荐 20+）

## 环境变量

建议先从模板复制：

```bash
cp .env.example .env
```

再按你的环境修改 `.env`：

```env
DATABASE_URL=mysql://user:password@host:3306/dbname

# 可选，不填则使用代码内默认值
OILPRICE_API_URL=https://api.istero.com/resource/v2/oilprice

# 必填
OILPRICE_API_TOKEN=your_token_here
```

变量说明：
- `DATABASE_URL`：MySQL 连接串（必填）
- `OILPRICE_API_URL`：上游油价接口地址（可选）
- `OILPRICE_API_TOKEN`：上游油价接口 Bearer Token（必填，未配置将启动失败）

## 安装与启动

```bash
npm install
```

开发模式：

```bash
npm run start:dev
```

生产构建与启动：

```bash
npm run build
npm run start:prod
```

默认服务地址：`http://localhost:3000`

## Docker 部署

### 部署方式总览

- 方式 A（推荐生产）：`API 容器 + 外部 MySQL`（云数据库/已有数据库）
- 方式 B（本地或小型服务）：`API 容器 + Compose 内置 MySQL`
- 方式 C（服务器更新发布）：`docker compose up -d --build` 滚动更新当前服务

### 1) 直接构建并运行（连接外部 MySQL）

先准备环境变量文件：

```bash
cp .env.example .env
```

然后确保 `.env` 至少包含：

```env
DATABASE_URL=mysql://user:password@host:3306/dbname
OILPRICE_API_TOKEN=your_token_here
```

构建镜像：

```bash
docker build -t api-collection-server:latest .
```

启动容器：

```bash
docker run -d \
  --name api-collection-server \
  --env-file .env \
  --restart unless-stopped \
  -p 3000:3000 \
  api-collection-server:latest
```

### 2) 使用 Docker Compose（一键启动 API + MySQL）

```bash
docker compose up -d --build
```

说明：
- `api` 服务默认访问 `mysql` 容器：`mysql://api_user:api_password@mysql:3306/api_collection`
- 如果你希望连接外部数据库，设置 `.env` 里的 `DATABASE_URL`，它会覆盖 Compose 默认值
- 如果你修改了 `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE`，请同步修改 `DATABASE_URL`
- `OILPRICE_API_TOKEN` 为必填项；未配置时 `api` 服务不会启动

查看日志：

```bash
docker compose logs -f api
```

停止并清理：

```bash
docker compose down
```

同时清理 MySQL 数据卷（谨慎）：

```bash
docker compose down -v
```

### 3) 服务器更新发布（已有部署时）

```bash
# 进入项目目录
cd /path/to/APICollectionServer

# 更新代码
git pull

# 按最新代码重建并重启
docker compose up -d --build

# 查看运行状态
docker compose ps
docker compose logs -f api
```

### 4) 常用运维命令

```bash
# 查看容器
docker ps

# 查看 API 日志
docker compose logs -f api

# 重启 API
docker compose restart api

# 停止服务
docker compose down
```

## 对外接口清单

> 这里是你网站前端可以直接调用的接口，每个接口用途单独列出。

| 接口 | 用途 | 请求参数 | 缓存 |
| --- | --- | --- | --- |
| `GET /` | 服务连通性检查（基础测试） | 无 | 无 |
| `GET /oilprice/:keyword` | 按路径参数查询城市油价 | `keyword`（城市名） | 24 小时 |
| `GET /oilprice?keyword=xxx` | 按 Query 参数查询城市油价 | `keyword`（城市名） | 24 小时 |

## 接口详情

### 1) `GET /`

用途：快速确认服务是否启动。

示例：

```bash
curl "http://localhost:3000/"
```

示例响应：

```text
Hello World!
```

### 2) `GET /oilprice/:keyword`

用途：按路径参数查询油价（例如路由参数来自前端页面路径时使用）。

示例：

```bash
curl "http://localhost:3000/oilprice/上海"
```

### 3) `GET /oilprice?keyword=xxx`

用途：按 query 参数查询油价（例如常规搜索框场景）。

示例：

```bash
curl "http://localhost:3000/oilprice?keyword=上海"
```

### 油价接口返回结构（两种写法一致）

```json
{
  "keyword": "上海",
  "source": "api",
  "updatedAt": "2026-03-26T01:23:45.000Z",
  "data": {
    "code": 200,
    "msg": "ok",
    "data": {}
  }
}
```

字段说明：
- `keyword`：查询关键字（城市）
- `source`：数据来源，`api` 表示来自上游接口，`database` 表示命中本地缓存
- `updatedAt`：当前返回数据在本地数据库的更新时间
- `data`：上游接口原始响应体

## 上游接口说明（服务内部调用）

数据来源标注：
- 数据提供方：`api.istero.com`
- 服务内调用地址：`https://api.istero.com/resource/v2/oilprice`
- 鉴权方式：`Authorization: Bearer <OILPRICE_API_TOKEN>`

- 上游地址：`OILPRICE_API_URL`
- 调用方式：`POST` + `Authorization: Bearer <token>`
- 请求体：`{ "keyword": "城市名" }`
- 说明：该上游接口不直接暴露给前端，统一由本服务转发与缓存

## 缓存逻辑

1. 根据 `keyword` 查询表 `oil_price_cache`
2. 记录不存在：请求上游并写入数据库
3. 记录存在且 `updatedAt` 在 24 小时内：直接返回缓存
4. 记录存在但超过 24 小时：请求上游并更新数据库

## 错误说明

- `400 Bad Request`：未传 `keyword` 或传入为空
- `502 Bad Gateway`：调用上游油价接口失败

## 数据表说明

项目通过 TypeORM 自动建表（当前配置 `synchronize: true`）：

- 表名：`oil_price_cache`
- `id`：主键
- `keyword`：城市关键字（唯一）
- `data`：缓存的上游响应（JSON）
- `createdAt`：创建时间
- `updatedAt`：更新时间

## 常用脚本

```bash
npm run start
npm run start:dev
npm run build
npm run start:prod
npm run test
npm run test:e2e
```

## 核心目录

```text
src/
  app.module.ts
  database.module.ts
  oil-price.controller.ts
  oil-price.service.ts
  oil-price-cache.entity.ts
```

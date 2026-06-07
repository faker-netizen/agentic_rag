# 阿里云 ECS 部署指南

> **本文以 Ubuntu 22.04 LTS（jammy）为准**——与你当前 ECS 一致。其他系统见文末附录。

架构：**MySQL（Docker）** + **Node 后端** + **Nginx（前端 + `/api` 反代）** + **上传文件 ECS 磁盘**（volume）。与本地一样用容器跑 MySQL，**不需要 RDS**。

---

## 一、Ubuntu 22.04 部署步骤

### 1. 安全组

| 端口 | 用途 |
|------|------|
| 22 | SSH（建议仅你的 IP） |
| 80 | HTTP |
| 443 | HTTPS（可选） |

### 2. 安装 Docker（阿里云镜像，勿用 get.docker.com）

国内访问 `get.docker.com` 常会 `Connection reset by peer`，**下面命令可直接整段复制**（jammy = Ubuntu 22.04）：

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu jammy stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
```

确认安装成功：

```bash
docker --version
docker compose version
getent group docker
```

加入 docker 组（避免每次 sudo）：

```bash
sudo usermod -aG docker $USER
```

**退出 SSH 重新登录**，再执行 `docker ps`。若懒得加组，后面命令前加 `sudo` 即可。

### 3. 安装 Git（若尚未安装）

```bash
sudo apt-get install -y git
```

### 4. 拉代码、配置、启动

MySQL 会由 `docker-compose.prod.yml` **自动拉起**，不用单独买 RDS、不用手动建库。

```bash
git clone <你的仓库地址> design_to_code
cd design_to_code/deploy
cp .env.production.example .env
nano .env
```

`.env` 最少填写：

```bash
HTTP_PORT=80
CORS_ORIGIN=http://<ECS公网IP>

DB_NAME=rag_db
DB_USER=rag
DB_PASSWORD=你的数据库密码
MYSQL_ROOT_PASSWORD=你的root密码

JWT_SECRET=粘贴 openssl rand -base64 32 的结果
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=你的管理员密码
QWEN_API_KEY=sk-...
NODE_ENV=production
```

`DB_HOST` 保持默认 `mysql` 即可（compose 里 backend 连 MySQL 容器名）。

启动：

```bash
chmod +x deploy.sh
./deploy.sh
# 若 docker 未加组：sudo ./deploy.sh
```

### 5. 验证

```bash
curl http://127.0.0.1/health
```

浏览器打开 `http://<ECS公网IP>`，用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录。

### 6. 更新版本

```bash
cd ~/design_to_code
git pull
cd deploy
./deploy.sh
```

---
## 二、你需要提供 / 填写的信息

把下面内容填进 **`deploy/.env`**（不要发群里、不要提交 Git）。

### 必填

| 变量 | 说明 | 示例 |
|------|------|------|
| `CORS_ORIGIN` | 浏览器访问地址 | `http://47.xxx.xxx.xxx` |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL 容器账号（自行设定） | `rag` / 强密码 / `rag_db` |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | 强密码 |
| `JWT_SECRET` | 随机长字符串 | `openssl rand -base64 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 首次 Web 管理员 | |
| `QWEN_API_KEY` | DashScope API Key | |

**不需要 RDS、不需要 OSS。** MySQL 与上传文件均在 Docker volume（ECS 磁盘）。

### 可选给我（排查部署问题时）

- 是否有域名 / HTTPS
- `docker compose -f docker-compose.prod.yml logs backend` 或 `logs mysql` 输出

---

## 三、仓库里已准备好的内容

| 路径 | 作用 |
|------|------|
| `deploy/docker-compose.prod.yml` | MySQL + backend + web(Nginx) |
| `deploy/Dockerfile.backend` | 后端镜像 |
| `deploy/Dockerfile.web` | 前端构建 + Nginx |
| `deploy/nginx/default.conf` | 静态站 + `/api` SSE 反代 |
| `deploy/.env.production.example` | 环境变量模板 |
| `deploy/deploy.sh` | 一键构建启动 |

前端生产环境默认 **同域访问 API**（Nginx 反代 `/api`），无需单独配置 `VITE_API_BASE_URL`。

---

## 四、常用运维命令

```bash
cd deploy

# 查看状态
docker compose -f docker-compose.prod.yml ps

# 日志
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f web

# 停止
docker compose -f docker-compose.prod.yml down

# 仅重建后端
docker compose -f docker-compose.prod.yml up -d --build backend
```

上传与数据库保存在 Docker volume 中，**不要** `docker compose down -v`（会删 MySQL 与上传文件）。

---

## 五、HTTPS（可选）

1. 在阿里云申请免费 SSL 证书，或 Let's Encrypt
2. 将证书放到 ECS，例如 `/etc/nginx/ssl/fullchain.pem`、`privkey.pem`
3. 扩展 `deploy/nginx/default.conf` 增加 443 server（或宿主机 Nginx 终止 TLS 反代到 8080）

配置 HTTPS 后，请确保：

- `CORS_ORIGIN=https://你的域名`
- `NODE_ENV=production`（refresh cookie 走 Secure）

---

## 六、故障排查

| 现象 | 检查 |
|------|------|
| `group docker does not exist` | Docker 未装好，重做「§2 安装 Docker」 |
| `get.docker.com` SSL 失败 | 正常，勿用官方脚本，用阿里云镜像 |
| 502 / 无法访问 API | `docker compose logs backend` / `logs mysql`；检查 `.env` 数据库密码 |
| 登录后立刻掉线 | `CORS_ORIGIN` 与浏览器地址一致（含 `http://`） |
| 上传失败 | 千问 Key；文件 ≤50MB |
| CORS 报错 | `.env` 中 `CORS_ORIGIN` 缺协议或端口不对 |

---

## 八、附录：其他操作系统

### Ubuntu 24.04 (noble)

与 §2 相同，仅把 apt 源里的 `jammy` 改成 `noble`。

### Debian / Alibaba Cloud Linux

- **Debian**：镜像 URL 用 `.../linux/debian`，代号如 `bookworm`
- **Alibaba Cloud Linux / CentOS**：用 yum 安装，见 [Docker 阿里云镜像文档](https://developer.aliyun.com/mirror/docker-ce)

---

## 七、下一步（可选）

- [ ] GitHub Actions 构建镜像推 ACR
- [ ] HTTPS 443 配置
- [ ] 多实例 + SLB（需迁对象存储或共享盘）

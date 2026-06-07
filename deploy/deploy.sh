#!/usr/bin/env bash
# 在 ECS 上首次或更新部署时执行（需已安装 Docker + Compose 插件）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "缺少 deploy/.env"
  echo "请执行: cp .env.production.example .env  并填写数据库、JWT、千问 Key 等"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "==> 构建并启动容器..."
docker compose -f docker-compose.prod.yml up -d --build

echo "==> 等待健康检查..."
for i in {1..30}; do
  if curl -sf "http://127.0.0.1:${HTTP_PORT:-80}/health" >/dev/null 2>&1; then
    echo "OK: /health 通过"
    docker compose -f docker-compose.prod.yml ps
    exit 0
  fi
  sleep 2
done

echo "WARN: /health 未在 60s 内就绪，请检查日志:"
echo "  docker compose -f docker-compose.prod.yml logs -f backend"
exit 1

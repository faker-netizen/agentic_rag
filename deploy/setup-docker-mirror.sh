#!/usr/bin/env bash
# 国内 ECS 拉 Docker Hub 易超时，首次部署前执行一次：sudo ./setup-docker-mirror.sh
set -euo pipefail

DAEMON_JSON="/etc/docker/daemon.json"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "请使用 root 或 sudo 运行：sudo $0"
  exit 1
fi

mkdir -p /etc/docker

if [[ -f "$DAEMON_JSON" ]] && grep -q 'registry-mirrors' "$DAEMON_JSON" 2>/dev/null; then
  echo "已存在 registry-mirrors 配置："
  cat "$DAEMON_JSON"
  echo "若仍拉取失败，请追加镜像源后 systemctl restart docker"
  exit 0
fi

cat >"$DAEMON_JSON" <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run",
    "https://dockerpull.org"
  ]
}
EOF

systemctl daemon-reload
systemctl restart docker

echo "==> 镜像加速已写入 $DAEMON_JSON"
docker info 2>/dev/null | grep -A6 'Registry Mirrors' || true
echo "==> 测试拉取 node 镜像..."
docker pull node:22-alpine
echo "OK"

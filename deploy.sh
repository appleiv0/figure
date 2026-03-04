#!/bin/bash

echo "=== 기존 컨테이너 정리 ==="
docker stop abuse-frontend abuse-backend abuse-mongodb 2>/dev/null
docker rm abuse-frontend abuse-backend abuse-mongodb 2>/dev/null

echo "=== 필요한 디렉토리 생성 ==="
mkdir -p /volume1/docker/abuse/mongodb_data
mkdir -p /volume1/docker/abuse/logs
mkdir -p /volume1/docker/abuse/therapy_result

echo "=== 이미지 빌드 ==="
cd /volume1/docker/abuse

echo "[1/2] Backend 빌드 중..."
docker build -t abuse-backend ./backend

echo "[2/2] Frontend 빌드 중..."
docker build -t abuse-frontend --build-arg VITE_ENV_API_BACKEND_DOMAIN=/api ./frontend

echo "=== 컨테이너 실행 ==="

echo "[1/3] MongoDB 시작..."
docker run -d --name abuse-mongodb --restart always -p 27017:27017 -v /volume1/docker/abuse/mongodb_data:/data/db mongo:7

echo "[2/3] Backend 시작..."
docker run -d --name abuse-backend --restart always --link abuse-mongodb:mongodb -p 3301:3301 -e PRODUCTION=True -e PORT=3301 -e HOST=0.0.0.0 -e MONGODB_URI=mongodb://mongodb:27017 -e MONGODB_DB_NAME=abuse_therapy -e "OPENAI_API_KEY=${OPENAI_API_KEY}" -e "CORS_ORIGINS=*" -v /volume1/docker/abuse/logs:/app/logs -v /volume1/docker/abuse/therapy_result:/app/therapy_result abuse-backend

echo "[3/3] Frontend 시작..."
docker run -d --name abuse-frontend --restart always --link abuse-backend:backend -p 3000:80 abuse-frontend

echo "=== 컨테이너 상태 확인 ==="
sleep 3
docker ps --filter "name=abuse"

echo ""
echo "=== 배포 완료 ==="
echo "프론트엔드: http://NAS_IP:3000"
echo "백엔드 API: http://NAS_IP:3301"

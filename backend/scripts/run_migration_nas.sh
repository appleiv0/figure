#!/bin/bash
# ============================================================
# AI 가족평가 — 라벨 마이그레이션 V2 (NAS 실행용)
#
# Python 스크립트는 abuse-backend 컨테이너 안에서 실행됩니다.
# (pymongo 등 의존성이 컨테이너에만 있으므로)
#
# 사용법:
#   1. NAS에 이 파일과 migrate_v2_labels.py 업로드
#   2. sudo chmod +x scripts/run_migration_nas.sh
#   3. sudo ./scripts/run_migration_nas.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$BACKEND_DIR/../backups/$(date +%Y%m%d)"
BACKUP_FILE="$BACKUP_DIR/pre_migration_v2.archive"
MONGODB_DB="${MONGODB_DB_NAME:-abuse_therapy}"

# 컨테이너 안 경로 (docker-compose volume 기준)
CONTAINER_SCRIPTS="/app/scripts"
CONTAINER_BACKUP="/app/backups"

cd "$BACKEND_DIR"

echo "============================================"
echo "  AI 가족평가 라벨 마이그레이션 V2"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# ─── Step 1: 백업 ───
echo "[Step 1/5] MongoDB 백업 생성..."
mkdir -p "$BACKUP_DIR"
docker exec abuse-mongodb mongodump --uri="mongodb://localhost:27017" --db="$MONGODB_DB" \
  --archive --gzip > "$BACKUP_FILE" 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️  백업 실패. 중단합니다."
  echo "에러 내용:"
  cat "$BACKUP_FILE" 2>/dev/null
  exit 1
fi

echo ""
echo "백업 파일:"
ls -lh "$BACKUP_FILE"
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
if [ "$BACKUP_SIZE" -lt 1000 ]; then
  echo "⚠️  백업 파일이 너무 작습니다 ($BACKUP_SIZE bytes). 중단합니다."
  exit 1
fi
echo "✓ 백업 완료 ($BACKUP_SIZE bytes)"
echo ""

# ─── Step 2: Dry-run (컨테이너 안에서 실행) ───
echo "[Step 2/5] Dry-run 실행 (DB 변경 없음)..."

# scripts/migrate_v2_labels.py가 컨테이너 볼륨에 있는지 확인
docker exec abuse-backend ls /app/scripts/migrate_v2_labels.py > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️  컨테이너에 migrate_v2_labels.py가 없습니다."
  echo "   scripts/ 폴더가 컨테이너 볼륨에 마운트되어 있지 않을 수 있습니다."
  echo "   대안: docker cp로 복사합니다..."
  docker cp "$SCRIPT_DIR/migrate_v2_labels.py" abuse-backend:/app/scripts/migrate_v2_labels.py
  docker exec abuse-backend mkdir -p /app/backups
fi

# 컨테이너 안에 백업 파일 복사 (--confirm-backup 검증용)
docker cp "$BACKUP_FILE" abuse-backend:/app/backups/pre_migration_v2.archive

# Dry-run 실행
docker exec abuse-backend python3 /app/scripts/migrate_v2_labels.py 2>&1 | head -8

echo ""

# ─── Step 3: 확인 ───
echo "[Step 3/5] 위 내용을 확인하세요."
echo ""
read -p "마이그레이션을 진행하시겠습니까? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "중단되었습니다."
  exit 0
fi
echo ""

# ─── Step 4: Apply (컨테이너 안에서 실행, 인터랙티브) ───
echo "[Step 4/5] 마이그레이션 적용 중..."
echo "  (컨테이너 안에서 'yes'를 입력해야 합니다)"
echo ""
docker exec -it abuse-backend python3 /app/scripts/migrate_v2_labels.py \
  --apply --confirm-backup /app/backups/pre_migration_v2.archive
echo ""

# ─── Step 5: 검증 ───
echo "[Step 5/5] 검증 쿼리 실행..."
echo ""

docker exec abuse-mongodb mongosh --quiet "mongodb://localhost:27017/$MONGODB_DB" --eval '
  const migrated = db.sessions.countDocuments({"_migration_v2": {$exists: true}});
  const hasNa = db.sessions.countDocuments({"family_members": "나"});
  const total = db.sessions.countDocuments({});

  print("============================================");
  print("  검증 결과");
  print("============================================");
  print("총 세션:              " + total);
  print("마이그레이션 적용됨:  " + migrated);
  print("family_members에 나:  " + hasNa);
  print("============================================");
' 2>&1

echo ""
echo "✓ 마이그레이션 완료."
echo ""
echo "문제 발생 시 복구 명령:"
echo "  cat \"$BACKUP_FILE\" | docker exec -i abuse-mongodb mongorestore --uri=\"mongodb://localhost:27017\" --archive --gzip --drop"
echo ""

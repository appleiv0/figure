# 시놀로지 NAS Docker 배포 가이드

이 프로젝트를 시놀로지 NAS에 배포하기 위한 가이드입니다.

## 1. 사전 준비

1.  **시놀로지 NAS 설정**:
    *   패키지 센터에서 `Container Manager` (구 Docker)를 설치합니다.
    *   제어판 -> 터미널 및 SNMP -> SSH 서비스 활성화를 체크합니다.

2.  **프로젝트 파일 준비**:
    *   `abuse` 폴더 전체를 시놀로지 NAS의 적당한 위치(예: `/volume1/docker/abuse`)에 업로드합니다.
        *   File Station을 이용하거나 SMB, SCP 등을 이용하세요.

## 2. 설정 수정

업로드한 폴더 내의 `docker-compose.yml` 파일을 수정해야 합니다. (시놀로지 텍스트 편집기나 SSH에서 vi 사용)

1.  **Frontend API 주소 수정**:
    *   `docker-compose.yml` 파일에서 `VITE_ENV_API_BACKEND_DOMAIN` 항목을 찾습니다.
    *   `http://YOUR_NAS_IP:3301` 부분을 실제 NAS의 IP 주소로 변경하세요.
    *   예: `VITE_ENV_API_BACKEND_DOMAIN=http://192.168.0.50:3301`

2.  **Environment (.env)**:
    *   `backend/.env` 파일이 올바르게 설정되어 있는지 확인하세요.
    *   데이터베이스(DB) 등이 외부가 아닌 로컬호스트를 참조하고 있다면, NAS 환경에 맞게 IP를 변경해야 할 수 있습니다.

## 3. 실행 (SSH 이용)

가장 안정적인 방법은 SSH를 이용하는 것입니다.

1.  SSH로 NAS에 접속합니다.
    ```bash
    ssh 계정명@NAS_IP -p 22
    ```
2.  프로젝트 폴더로 이동합니다.
    ```bash
    cd /volume1/docker/abuse
    ```
3.  Docker 컨테이너를 빌드하고 실행합니다.
    ```bash
    sudo docker-compose up -d --build
    ```
    *   `sudo` 비밀번호를 입력하세요.
    *   처음 실행 시 이미지를 빌드하느라 시간이 조금 걸립니다.

## 4. 접속 확인

브라우저를 열고 NAS IP와 포트로 접속합니다.

*   **Frontend**: `http://NAS_IP:3000`
*   **Backend API**: `http://NAS_IP:3301/docs`

## 5. 업데이트 방법

코드가 수정되어 다시 배포하려면:

1.  수정된 파일을 NAS에 덮어씌웁니다.
2.  SSH에서 다시 명령어를 실행합니다.
    ```bash
    sudo docker-compose up -d --build
    ```
    (변경된 부분만 다시 빌드됩니다)

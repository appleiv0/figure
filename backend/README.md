# 인형치료 Webapp Backend

## 개요
- Backend 서버

## 개발환경

- 환경: Ubuntu 22.04.6 LTS
- python 3.10

## 설치 및 설정
- 환경변수
  - .env 사용

- python 설치

- 패키지 설치
  - 서버 구동을 위한 requirements 설치
  ```
  python -m pip install -r requirements.txt
  ```

## 실행 방법

```
python main.py
```

## API

- swagger
  - url
    - http://\$host:\$port/docs
- $protocol://$host:$port/docs
- localhost일때 url
  - http://localhost:3301/docs

## 주요 file 구조

### environment/
- docker-compose 및 server 환경변수
### app/
- app/config/
  - 서버 코드에서 사용하는 변수 정의 코드
- app/controllers/
  - 서버 내 알고리즘 코드
- app/models/
  - request, response model 정의 코드
- app/routers/
  - API endpoint 등 정의 코드
### libcommon/
- 서버 내 공통 사용 코드
### logs
- 서버 log
### therapy_result/
- 인형치료 결과 저장 directory
- 0_template.json : 결과 저장 용 template
### .env
- 환경변수
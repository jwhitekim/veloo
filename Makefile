ENV_NAME := veloo

.PHONY: help conda-env install run dev frontend-install frontend-dev frontend-build build docker-build docker-run

help:
	@echo "make conda-env         - conda 환경 생성 ($(ENV_NAME), python=3.11)"
	@echo "make install           - 백엔드 의존성 설치 (requirements.txt)"
	@echo "make run               - 백엔드 실행 (http://localhost:9000)"
	@echo "make frontend-install  - 프론트엔드 의존성 설치"
	@echo "make dev               - 프론트엔드 개발 서버 (http://localhost:5173)"
	@echo "make frontend-build    - 프론트엔드 빌드 (frontend/dist)"
	@echo "make build             - 프론트엔드 빌드 후 백엔드 실행 (운영 빌드 확인)"
	@echo "make docker-build      - Docker 이미지 빌드"
	@echo "make docker-run        - Docker 컨테이너 실행"

conda-env:
	conda create -n $(ENV_NAME) python=3.11 -y

install:
	conda run -n $(ENV_NAME) pip install -r requirements.txt

run:
	conda run --no-capture-output -n $(ENV_NAME) python -m server.main

frontend-install:
	cd frontend && npm install

dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

build: frontend-build
	conda run --no-capture-output -n $(ENV_NAME) python -m server.main

docker-build:
	docker build -t veloo .

docker-run:
	docker run --env-file .env -p 9000:9000 veloo

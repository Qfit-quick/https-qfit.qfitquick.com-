# AI Agent Constraints & Privacy Rules

## 1. Sensitive Files Protection (민감 파일 접근 금지)
다음 파일들은 보안 및 환경 변수가 포함되어 있으므로 **절대로 읽거나, 분석하거나, 생성/수정하지 마세요.**
- `.dev.vars`
- `.env`
- `.env.*` (예: `.env.local`, `.env.production` 등)
- `*.pem`, `*.key`, `*.p12` 등 모든 비밀키/인증서 파일

## 2. Directory Exploration & Token Optimization (탐색 제한 및 토큰 절약)
- **세부 소스 파일 미독해:** 전체 구조 파악 시 개별 소스 코드 파일의 내부 내용을 직접 읽지 마세요.
- **설정 파일만 읽기:** 프레임워크 및 라이브러리 파악이 필요한 경우 최상위의 패키지/의존성 설정 파일(`package.json`, `Cargo.toml`, `pyproject.toml` 등)만 최소한으로 참조하세요.
- **제외 디렉토리:** `node_modules/`, `.git/`, `dist/`, `build/`, `.next/` 등 빌드 및 의존성 아티팩트 폴더는 탐색 대상에서 제외하세요.
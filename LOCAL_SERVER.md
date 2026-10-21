# 로컬 서버로 실행하기 (Windows)

이 버전은 Vercel에 배포된 최신 코드와 **같은 API 코드**(`api/` 폴더)를 내 PC에서 그대로 실행합니다.
화면(프론트엔드)과 API가 명령 하나로 함께 켜지고, 주소는 `http://localhost:3000` 입니다.

## 처음 한 번만 준비

1. **Node.js 설치**: https://nodejs.org 에서 **LTS** 버전을 받아 설치합니다. (설치 중 옵션은 기본값 그대로)
2. **소스 받기**: GitHub에서 이 브랜치를 ZIP으로 받아 압축을 풀거나, `git clone` 으로 받습니다.

## 실행하기 (가장 쉬운 방법)

1. 압축을 푼 폴더에서 **`start-local.bat`** 을 더블클릭합니다.
2. 처음 실행하면 메모장으로 `.env` 파일이 열립니다. 아래처럼 따옴표 안에 키를 넣고 **저장 후 메모장을 닫습니다.**
   ```
   GEMINI_API_KEY="여기에_Gemini_키"
   NVIDIA_API_KEY="여기에_NVIDIA_키"
   SUPABASE_URL="https://xxxx.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="여기에_Supabase_service_role_키"
   ```
   - Gemini만 쓸 거면 `GEMINI_API_KEY` 하나만 넣어도 됩니다.
   - NVIDIA 검토는 `NVIDIA_API_KEY` 와 Supabase 두 값이 모두 필요합니다.
3. 처음에는 패키지 설치로 몇 분 걸리고, 끝나면 브라우저가 자동으로 `http://localhost:3000` 을 엽니다.
4. **끄기**: 검은 명령창에서 `Ctrl + C` 를 누르거나 창을 닫습니다.

다음부터는 `start-local.bat` 더블클릭만 하면 바로 켜집니다.

## Google Cloud Vision OCR을 키 없이 쓰기 (gcloud 로그인)

Vision API 키 대신 내 Google 계정 로그인(ADC)으로 OCR을 쓸 수 있습니다.

1. 명령창에서 한 번만 실행합니다. (브라우저가 열리면 Google 계정으로 로그인)
   ```cmd
   gcloud auth application-default login
   gcloud auth application-default set-quota-project 내프로젝트ID
   ```
2. Google Cloud 콘솔에서 그 프로젝트에 **Cloud Vision API** 가 "사용 설정"되어 있는지 확인합니다.
3. `.env` 에 다음 한 줄을 넣고 서버를 껐다 켭니다.
   ```
   GOOGLE_CLOUD_VISION_USE_ADC="true"
   ```

Vision에 연결하지 못하면 검토는 멈추지 않고 Gemini만으로 진행되며, 서버 검은 창에 `Google Cloud Vision OCR skipped: 원인` 이 표시됩니다.

이 방식은 내 PC에서만 동작합니다. Vercel 배포 사이트는 계속 `GOOGLE_CLOUD_VISION_API_KEY` 를 사용합니다.
Gemini 검토 자체에는 여전히 `GEMINI_API_KEY` 가 필요합니다.

## Gemini 모델 순서와 사용량 한도(429)

별도 설정이 없으면 **고성능 모델부터** 차례로 시도하고, 안 되면 다음 모델로 자동으로 넘어갑니다.

1. `gemini-3.8-flash` (가장 고성능)
2. `gemini-3.6-flash`
3. `gemini-3.5-flash-lite`
4. `gemini-3.1-flash-lite` (가장 가벼움)

- 문제가 생긴 모델은 일정 시간 건너뛰어 다음 페이지부터 바로 쓸 수 있는 모델로 검토합니다: 일일 한도 초과(429) 1시간, 분당 한도 초과(429) Google이 알려 준 대기 시간(최소 10초), 과부하(503) 30초, 응답 지연(기본 120초, `GEMINI_TIMEOUT_MS`) 3분, 사용 불가(403/404) 1시간.
- 모든 모델이 막혀 있으면, 가장 먼저 풀리는 모델을 최대 90초(`GEMINI_MAX_WAIT_MS`)까지 기다렸다가 이어서 검토합니다. 그보다 오래 기다려야 하면(일일 한도 소진 등) Google에 요청을 다시 보내지 않고 바로 `All Gemini models are out of quota` 로 알려 줍니다.
- 법규 근거를 붙인 2차 검토가 한도에 걸리면 이미 받은 1차 검토 결과를 그대로 사용합니다.
- Vision이 권한 오류(403 등)로 실패하면 10분 동안 Vision 호출을 쉬고 Gemini만으로 검토합니다.
- 모두 무료 API 키로 쓸 수 있는 모델입니다. 실제로 사용된 모델은 검토 결과와 서버 창에 표시됩니다.
- 유료 전용 모델(`gemini-4-argon`, `gemini-3.1-pro-preview`)은 결제 계정을 연결한 뒤 `GEMINI_MODELS` 에 직접 넣으면 쓸 수 있습니다.
- 무료 사용량은 **모델마다 따로** 계산되고 매일 한국 시간 오후 4~5시에 초기화됩니다.
- 순서를 직접 정하려면 `.env` 에 `GEMINI_MODELS="gemini-3.8-flash,gemini-3.6-flash"` 처럼 넣습니다.
- 한 페이지 검토에 Gemini 요청이 최대 2번 쓰입니다(법규 근거를 붙인 2차 검토).

## 회사 PC에서 `fetch failed` 가 날 때

브라우저로는 접속되는데 검토만 `fetch failed` 로 실패하면, 보통 회사 보안 장비(프록시 또는 HTTPS 검사) 때문입니다.

1. 명령창에서 프로그램 폴더로 이동한 뒤 **연결 점검**을 실행합니다.
   ```cmd
   npm run check-network
   ```
   각 서비스마다 `[OK]` 또는 `[실패]` 와 원인이 표시됩니다. 검토 실패 시 서버 검은 창에도 같은 원인이 출력됩니다.
2. 원인에 따라 `.env` 에 추가하고 서버를 껐다 켭니다.

| 점검 결과에 보이는 원인 | 해결 |
| --- | --- |
| `SELF_SIGNED_CERT...`, `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | 회사가 HTTPS를 검사하는 중입니다. 서버는 Windows 인증서 저장소를 자동으로 사용하지만, 그래도 실패하면 IT 부서에서 **회사 루트 인증서(.pem 또는 Base64 .crt)** 를 받아 `.env` 에 `EXTRA_CA_CERTS_FILE="C:\certs\company-root.pem"` 추가 |
| `ENOTFOUND`, `ETIMEDOUT`, `ECONNRESET`, `UND_ERR_CONNECT_TIMEOUT` | 프록시가 필요한 네트워크이거나 방화벽 차단입니다. IT에 프록시 주소를 받아 `.env` 에 `HTTPS_PROXY="http://프록시주소:포트"` 추가 |
| `Proxy response (403)` | 프록시가 그 주소를 막고 있습니다. IT 부서에 해당 주소 허용 요청 |
| `Proxy response (407)` | 프록시 로그인이 필요합니다. `HTTPS_PROXY="http://아이디:비밀번호@프록시주소:포트"` 형식으로 입력하거나 IT에 문의 |

Windows 인증서 저장소 자동 사용은 최신 Node.js LTS에서만 동작합니다. 점검 결과 첫 줄에 `Windows 인증서 사용: unsupported` 가 보이면 https://nodejs.org 에서 최신 LTS로 다시 설치하세요.

## 명령창(cmd)으로 실행하고 싶다면

```cmd
cd 압축푼폴더경로
copy .env.example .env
notepad .env
npm install
npm run dev
```

- `npm run dev` : 개발 모드 (코드를 고치면 화면이 바로 바뀜)
- `npm run build` 후 `npm start` : 배포용으로 빌드한 화면으로 실행

## 자주 생기는 문제

| 증상 | 해결 |
| --- | --- |
| `포트 3000번이 이미 사용 중입니다` | 이미 켜진 서버 창이 있습니다. 그 창을 닫거나 브라우저에서 `http://localhost:3000` 을 그대로 쓰세요. 다른 포트를 쓰려면 `.env` 에 `PORT=3001` 추가. |
| 검토 시 `... is not configured` 오류 | `.env` 에 해당 키가 비어 있습니다. 키를 넣고 서버를 껐다 켜세요. |
| `Google Cloud Vision ADC login failed` | `gcloud auth application-default login` 을 다시 실행하세요. |
| `Google Cloud Vision 403` | 해당 프로젝트에서 Cloud Vision API 사용 설정과 결제 연결을 확인하세요. |
| `'node' is not recognized` | Node.js 설치 후 PC를 재시작하거나 명령창을 새로 여세요. |
| 브라우저가 자동으로 안 열림 | 직접 `http://localhost:3000` 을 주소창에 입력하세요. |

## 주의

- `.env` 파일에는 비밀 키가 들어 있으므로 **절대 GitHub에 올리거나 다른 사람에게 보내지 마세요.** (`.gitignore` 에 이미 제외되어 있습니다)
- 여러 페이지 PDF의 "전체 도면 종합 분석" 단계(`/api/gemini/synthesize-review`)는 현재 배포 사이트에도 없는 기능이라 로컬에서도 건너뜁니다. 페이지별 검토 결과는 그대로 표시됩니다.

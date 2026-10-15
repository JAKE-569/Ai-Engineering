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

이 방식은 내 PC에서만 동작합니다. Vercel 배포 사이트는 계속 `GOOGLE_CLOUD_VISION_API_KEY` 를 사용합니다.
Gemini 검토 자체에는 여전히 `GEMINI_API_KEY` 가 필요합니다.

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

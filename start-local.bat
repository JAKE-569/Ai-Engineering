@echo off
chcp 65001 >nul
cd /d "%~dp0"
title AI Engineering Local Server

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [오류] Node.js 가 설치되어 있지 않습니다.
  echo https://nodejs.org 에서 LTS 버전을 설치한 뒤 이 파일을 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo [안내] .env 파일을 새로 만들었습니다. 메모장이 열리면 API 키를 입력하고 저장한 뒤 닫으세요.
  echo.
  notepad ".env"
)

if not exist "node_modules" (
  echo.
  echo [1/2] 처음 실행이라 필요한 패키지를 설치합니다. 몇 분 걸릴 수 있습니다...
  call npm install
  if errorlevel 1 (
    echo [오류] 패키지 설치에 실패했습니다. 인터넷 연결을 확인하고 다시 실행하세요.
    pause
    exit /b 1
  )
)

echo.
echo [2/2] 로컬 서버를 시작합니다. 잠시 후 브라우저가 자동으로 열립니다.
call npm run dev
pause

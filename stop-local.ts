import './local-env';
const { findLocalServer, localPort } = await import('./local-server-control');
const server = await findLocalServer();
if (!server) {
  console.log(`포트 ${localPort}에서 이 폴더의 실행 중인 서버를 찾지 못했습니다. 이미 종료됐거나 다른 프로그램이 사용 중일 수 있습니다.`);
  process.exit(0);
}
try {
  // Only stop the server that identifies itself as belonging to this workspace.
  process.kill(server.pid, 'SIGTERM');
  console.log(`AI설계검토Agent 로컬 서버를 종료했습니다. 저장된 도면과 검토의견은 유지됩니다.`);
} catch (error: any) {
  if (error.code === 'ESRCH') console.log('서버가 이미 종료되었습니다.');
  else { console.error('서버를 종료하지 못했습니다:', error.message); process.exitCode = 1; }
}

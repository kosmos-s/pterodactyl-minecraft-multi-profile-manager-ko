# 변경 내역

## v2.2.0

- 한글/Unicode 프로필 이름 지원 추가
- 최신 Paper `latest.log` 형식에서 Minecraft 버전 자동 감지 추가
- `latest.log` 기반 서버 종류 감지 fallback 추가
- `versions/` 폴더 기반 버전 감지 fallback 추가
- 실행 JAR 이름이 단순히 `server.jar`인 기존 서버 가져오기 개선
- `SERVER_MEMORY=0`이 Java 최대 힙 128MB로 잘못 처리되던 문제 수정
- Java 8/11/16/17/21/25 자동 선택 및 캐시 유지
- 실제 Pterodactyl 환경에서 프로필 전환 백업과 `BACKUP_KEEP` 검증
- 실험용 동적 Startup 드롭다운 / Panel 패치 제거
- 대용량 파일 업로드 권장 방식으로 Pterodactyl `Launch SFTP` + WinSCP 문서화
- AI(ChatGPT) 사용 공개 추가
- 실제 Minecraft 클라이언트 접속 및 프로필 왕복 테스트 완료

# 변경 내역

## Unreleased

- Fabric/Paperclip JAR 후보 중복 집계 수정
- Forge/NeoForge script 모드에 프로필 JVM 옵션 전달
- 신규 profile.conf가 전역 백업 설정을 상속하도록 수정
- dry-run에서 설정·EULA·백업·활성 상태 변경 제거
- 실행 JAR 메타데이터 우선 감지와 다중 캐시/라이브러리 버전 차단
- 초기 JAR 다운로드의 임시 파일·SHA-256·ZIP 검증 및 실패 정리
- 실행기/설치기 소스 분리, Egg 생성 도구와 회귀 검사/CI 추가
- 제거된 Panel 패치 안내 정리와 백업 복원 안내 추가

자동 검사 통과 여부와 실제 Pterodactyl/Minecraft 검증은 별도로 기록합니다.

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

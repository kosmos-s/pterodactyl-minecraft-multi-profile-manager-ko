# 변경 내역

## v2.2.1 (2026-10-28)

- unzip이 없는 기본 Java 이미지에서 JDK jar로 메타데이터를 읽고, 두 도구 모두 없으면 경고
- script 모드의 모듈 옵션 공백 형식 정규화와 런처 전용 인수 사전 차단
- SCRIPT_MEMORY_MODE=script로 모드팩의 Xms/Xmx 정책 유지 가능
- Alpine 설치기에 CRC를 검사하는 Info-ZIP 확보 및 설치기 셸 단독 TERM 시 curl 종료
- 실제 yolk/Alpine 이미지 CI 추가, Update Egg·재설치·LF 줄바꿈 안내 보완
- 콘솔에 Manager version 2.2.1 표시 및 새 Egg 파일 제공

호환성: 여러 캐시/라이브러리 버전이 남은 프로필은 MINECRAFT_VERSION 지정이 필요할 수 있습니다. script 모드 기본 메모리 정책은 manager이며 기존 모드팩 설정을 유지하려면 SCRIPT_MEMORY_MODE=script를 지정하세요.

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

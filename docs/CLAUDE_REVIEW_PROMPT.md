다음 저장소의 수정 브랜치를 독립적으로 코드 리뷰해줘.

저장소: https://github.com/kosmos-s/pterodactyl-minecraft-multi-profile-manager-ko
수정 브랜치: fix/launcher-reliability
PR: https://github.com/kosmos-s/pterodactyl-minecraft-multi-profile-manager-ko/pull/1
비교 기준: 79d6f13405d14fdaa451cda312f270800d5ef498
비교 범위: 기준 커밋부터 수정 브랜치 HEAD까지의 전체 diff

목표는 Pterodactyl 서버 하나에서 Minecraft 프로필 하나만 실행하는 기존 구조를 유지하면서 런처의 결함과 설치 실패 처리를 개선하는 것이야. 우선 읽기 전용으로 검토하고, 수정이나 운영 서버 배포는 하지 마.

다음 설명을 그대로 신뢰하지 말고 코드와 테스트를 직접 확인해줘.

검토할 변경:
1. fabric-server-launch.jar, paperclip.jar가 여러 패턴에 중복으로 잡혀 실행이 막히는 문제.
2. Forge/NeoForge script 모드에서 Xms, Xmx, JAVA_ARGS를 _JAVA_OPTIONS로 전달하는 방식. 기존 환경 변수 및 user_jvm_args.txt와의 우선순위, Java 8/21/25 HotSpot 호환성, 커스텀 스크립트의 한계를 확인해줘.
3. 새 profile.conf가 Startup의 백업 설정을 상속하고, 기존 명시 설정은 유지하는지.
4. MULTI_DRY_RUN=true에서 설정 파일·EULA·백업·보관 개수·last_profile이 변경되지 않는지.
5. 현재 JAR의 version.json이 오래된 로그/캐시보다 우선하고, 캐시/라이브러리에 여러 버전이 남아 있으면 안전하게 중단하는지.
6. Paper 또는 커스텀 JAR을 임시 파일에 받고, 체크섬과 ZIP 검증을 통과한 뒤에만 server.jar로 옮기는지. 실패·신호 종료·재설치 시 기존 파일과 임시 파일을 확인해줘.
7. src/의 소스와 생성된 Egg JSON이 일치하며, Egg 하나만 Import해도 동작하는지.
8. README, 마이그레이션, 복원 안내가 실제 동작과 맞는지.

검증:
- Node.js 22 이상과 POSIX sh, jq, unzip, sha256sum, tar가 있는 Linux 환경에서 npm run check와 npm test를 실행해줘.
- tests/는 생성된 Egg의 런처와 설치기를 실행해. Java 실행/다운로드 경계 일부는 대체되므로 테스트 통과만으로 실제 Minecraft 정상 구동을 단정하면 안 돼.
- JAVA_BIN_REAL을 실제 Java 실행 파일의 절대 경로로 지정하면 실제 JVM의 Runtime.maxMemory()와 시스템 속성으로 옵션 적용을 확인할 수 있어. JAVA_HOME이 있으면 그 경로도 사용해.
- GitHub Actions 결과와 테스트에서 skip된 항목도 확인해줘.
- 실제 Pterodactyl, Forge/NeoForge 전체 모드팩, 클라이언트 접속 검증은 별도야.

답변:
- 실제 결함을 심각도순으로 제시하고 파일/라인, 재현 조건, 사용자 영향, 최소 수정 방향을 포함해줘.
- 기존부터 있던 문제와 이번 변경이 만든 회귀를 구분해줘.
- 근거가 부족한 의심은 확정 결함과 구분해줘.
- 문제가 없으면 그 사실을 말하고, 배포 전에 필요한 실제 서버 검증 목록을 적어줘.

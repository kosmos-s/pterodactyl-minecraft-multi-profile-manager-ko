# 기여 가이드

이 프로젝트에 대한 버그 제보, 문서 개선, 호환성 추가, Pull Request를 환영합니다.

## 버그를 제보할 때

가능하면 다음 정보를 포함해주세요.

- Pterodactyl Panel 버전
- Minecraft 버전
- 서버 종류와 버전 (Paper, Forge, Fabric 등)
- 사용 중인 `profile.conf`의 관련 설정
- 프로필 루트에 있는 주요 파일 이름
- 문제가 발생한 부분의 콘솔 로그

월드 파일 전체, 비밀번호, API Key, 토큰, 개인 서버 주소 등 민감한 정보는 올리지 마세요.

## Pull Request

변경 사항은 가능한 한 작고 명확하게 유지해주세요. 서버 자동 감지 로직을 수정하는 경우 기존 Paper/Forge/Fabric 등의 동작을 깨뜨리지 않는지 확인해주세요.

## 소스와 Egg 생성

`src/profile-launcher.sh`가 실행기 소스이고 `src/install.sh`는 실행기를 삽입할 설치기 템플릿입니다. Egg 메타데이터는 `src/egg.template.json`에서 관리합니다. 생성된 Egg의 긴 JSON 문자열을 직접 편집하지 마세요.

Node.js 22 이상에서 다음을 실행합니다. 외부 npm 패키지 설치는 필요하지 않습니다.

```sh
npm run build
npm run check
npm test
```

테스트는 POSIX sh, tar, unzip, sha256sum, jq를 사용합니다. `SH_BIN`으로 셸 경로를 지정할 수 있습니다. Windows에서는 Git의 sh와 기본 tar를 사용하며, 테스트에 한해 ZIP/해시/권한 명령을 보완합니다. jq가 없는 환경에서는 공식 API 응답 검사 두 개가, Windows에서는 POSIX 종료 신호 검사 한 개가 skip됩니다. Linux CI에서는 실제 도구로 전체를 실행합니다.

실제 JVM 검사에는 `JAVA_BIN_REAL`에 Java 실행 파일의 절대 경로를 지정하거나 `JAVA_HOME`을 설정하세요. 이 검사는 JVM 옵션 적용을 확인하며 Minecraft 서버 구동을 대신하지 않습니다.

생성된 Egg도 함께 커밋해야 합니다. GitHub Actions는 소스와 Egg 일치, 셸 구문, 동작 검사를 수행합니다. 실제 서버 검증에는 Panel/Wings 버전, 서버 종류와 Java 버전, 프로필 전환·정상 종료·복원·클라이언트 접속 결과를 기록하세요.

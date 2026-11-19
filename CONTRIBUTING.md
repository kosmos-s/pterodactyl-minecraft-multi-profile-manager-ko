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

테스트는 POSIX sh, tar, Info-ZIP unzip, sha256sum을 사용합니다. `SH_BIN`으로 셸 경로를 지정할 수 있습니다. Windows에서는 현재 버전의 Git for Windows를 설치하고 Git Bash에서 실행하거나 PowerShell에서 다음처럼 셸 경로를 지정하세요. ZIP 검사와 해시 계산에는 Git for Windows에 포함된 실제 도구를 사용합니다.

```powershell
$env:SH_BIN = 'C:\Program Files\Git\bin\sh.exe'
npm.cmd test
```

jq가 없으면 공식 API 응답 검사 두 개를 건너뜁니다. POSIX 종료 신호 검사는 Linux에서 실행합니다.

실제 JVM 검사에는 `JAVA_BIN_REAL`에 Java 실행 파일의 절대 경로를 지정하거나 `JAVA_HOME`을 설정하세요. 이 검사는 JVM 옵션 적용을 확인하며 Minecraft 서버 구동을 대신하지 않습니다.

unzip 없는 환경의 실제 JDK fallback 검사는 `JAR_BIN_REAL` 또는 `JAVA_HOME/bin/jar`를 사용합니다. 테스트는 PATH를 제한하고 원래 도구를 실행하며, 모의 JSON 추출기로 대체하지 않습니다.

CI는 Ubuntu와 Windows에서 테스트를 실행합니다. `ghcr.io/pterodactyl/yolks:java_25`에서는 unzip을 추가하지 않은 런처를 검사하고, `ghcr.io/pterodactyl/installers:alpine`에서는 BusyBox ash 기반 설치기를 검사합니다. Alpine 컨테이너에는 검사 실행용 Node.js만 먼저 추가하고, Info-ZIP은 실제 설치기 코드가 확보하도록 합니다.

생성된 Egg도 함께 커밋해야 합니다. GitHub Actions는 소스와 Egg 일치, 셸 구문, 동작 검사를 수행합니다. 실제 서버 검증에는 Panel/Wings 버전, 서버 종류와 Java 버전, 프로필 전환·정상 종료·복원·클라이언트 접속 결과를 기록하세요.

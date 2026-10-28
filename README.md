# Pterodactyl Minecraft Multi-Profile Manager v2.2.1

> 영문 저장소: https://github.com/kosmos-s/pterodactyl-minecraft-multi-profile-manager

Pterodactyl 서버 **1개 + Primary Allocation 1개** 안에 여러 Minecraft 서버 폴더를 보관하고, 필요한 프로필 하나만 선택해서 실행하는 Egg입니다.

여러 월드, 모드팩, 테스트 서버, 예전 서버를 보관하지만 각 서버마다 별도의 Pterodactyl Allocation을 만들고 싶지 않은 홈서버/소규모 서버 운영 환경을 위해 만들었습니다.

> Pterodactyl Software의 공식 프로젝트가 아니며, 제휴 또는 보증을 받지 않았습니다.

## 주요 기능

- 여러 Minecraft 서버 폴더를 `/home/container/servers/` 아래에 보관
- 한 번에 프로필 하나만 실행
- 한글/Unicode 프로필 폴더명 지원
- `profile.conf` 자동 생성
- Paper / Purpur / Folia / Spigot / Vanilla / Fabric / Quilt / Forge / NeoForge 등 일반적인 서버 구조 자동 감지
- `logs/latest.log`, `versions/`, JAR 이름/구조 등을 이용한 Minecraft 버전 감지
- Java 8 / 11 / 16 / 17 / 21 / 25 자동 선택 및 캐시
- Pterodactyl `Memory=0 (Unlimited)` 정상 지원
- 프로필별 설정 자동 적용
- 프로필 전환 시 이전 프로필 자동 백업
- `BACKUP_KEEP`을 이용한 백업 보관 개수 관리
- 현재 Primary Allocation 포트를 `server.properties`에 자동 적용
- 잘못되거나 애매한 프로필은 추측해서 실행하지 않고 안전하게 중단

## 기본 구조

```text
/home/container/
├─ servers/
│  ├─ default/
│  ├─ 마크서버/
│  ├─ 모드서버/
│  └─ 친구서버/
├─ profile-backups/
├─ .multijava/
├─ .multi-profile-state/
└─ profile-launcher.sh
```

## 설치

1. Pterodactyl 관리자 페이지에서 Minecraft Nest에 `egg/egg-minecraft-multi-profile-manager-v2.2.1.json`을 Import합니다.
2. 이 Egg로 새 서버를 생성합니다.
3. Primary Allocation을 하나만 지정합니다. 예: `25565`
4. Minecraft EULA에 동의하는 경우에만 `ACCEPT_EULA=true`로 설정합니다.
5. 서버를 시작합니다.

## 서버 프로필 변경

기본 사용법은 단순합니다.

```text
서버 Stop
→ Startup
→ SERVER_PROFILE 변경
→ Start
```

예:

```text
SERVER_PROFILE=마크서버
```

실제 실행 폴더:

```text
/home/container/servers/마크서버/
```

프로필 이름에는 한글/영문/숫자와 `.`, `_`, `-`를 사용할 수 있습니다.
공백과 `/`, `\\`, `..` 같은 경로 요소는 안전을 위해 허용하지 않습니다.

## 기존 서버 가져오기

기존 Minecraft 서버 파일 전체를 프로필 폴더에 넣습니다.

```text
servers/마크서버/
├─ server.jar
├─ server.properties
├─ logs/
├─ plugins/
├─ world/
└─ ...
```

`profile.conf`가 없으면 처음 실행할 때 자동으로 생성됩니다.

기존 서버의 JAR 이름이 단순히 `server.jar`여도 `logs/latest.log`에 다음 같은 로그가 남아 있으면:

```text
Loading Paper 1.21.11-69-... for Minecraft 1.21.11
```

자동으로 다음처럼 감지할 수 있습니다.

```text
Server type      : paper
Minecraft version: 1.21.11
Java             : 21
```

자동 감지가 실패하면 `profile.conf`에서 직접 지정합니다.

```ini
MINECRAFT_VERSION=1.21.11
JAVA_VERSION=auto
```

## `profile.conf`

예:

```ini
NAME=마크서버
SERVER_TYPE=auto
MINECRAFT_VERSION=auto
JAVA_VERSION=auto
LAUNCH_MODE=auto
SERVER_JAR=auto
SERVER_SCRIPT=run.sh
JAVA_ARGS=
XMS_MB=128
MEMORY_PERCENT=95
SCRIPT_MEMORY_MODE=manager
# BACKUP_ON_SWITCH=true
# BACKUP_KEEP=5
BACKUP_EXCLUDE_LOGS=true
```

대부분은 `auto` 상태로 두면 됩니다. 자동 감지가 어려운 값만 직접 지정하면 됩니다.

주석 처리된 백업 키는 Startup의 `AUTO_BACKUP_ON_SWITCH`와 `BACKUP_KEEP`을 상속합니다. 주석을 해제하면 해당 프로필에만 적용됩니다. 기존 `profile.conf`의 명시 설정은 자동으로 변경하지 않습니다.

버전 감지는 명시한 `MINECRAFT_VERSION` → 선택한 JAR의 `version.json` → JAR 이름 → 로그 → 캐시/라이브러리 순서입니다. 캐시나 라이브러리에서 여러 버전이 발견되면 `MINECRAFT_VERSION`을 직접 지정해야 합니다.

JAR 메타데이터는 `unzip`으로 읽고, 없는 경우 기본 JDK의 `jar` 도구로 읽습니다. `jar` 경로는 임시 디렉터리에 `version.json`만 추출하고 정리합니다. 두 도구가 모두 없으면 경고 후 이름·로그 등으로 넘어갑니다. 오래된 로그가 있다면 버전을 직접 지정하세요.

## Java 자동 선택

Docker 이미지는 Java 25를 기본으로 사용하지만, 선택한 프로필에 필요한 Java가 다르면 런처가 자동으로 맞춥니다.

예:

```text
Minecraft 1.21.11 → Java 21
Minecraft 26.2    → Java 25
```

추가 Java 런타임은 다음 경로에 저장하고 재사용합니다.

```text
/home/container/.multijava/
```

## 메모리

Pterodactyl에서 `Memory=0`은 Unlimited입니다.

v2.2.0에서는 다음처럼 처리합니다.

```text
Memory=0
→ Xms=128M
→ Xmx=JVM auto
```

명시적으로 4096MB를 지정하고 기본 `MEMORY_PERCENT=95`를 사용하면:

```text
Memory=4096
→ Xmx≈3891M
```

운영 환경에서는 다른 서버/프로세스를 보호하기 위해 Pterodactyl Memory Limit을 명시적으로 지정하는 것을 권장합니다.

Forge/NeoForge의 `LAUNCH_MODE=script`에서는 기본 `SCRIPT_MEMORY_MODE=manager`일 때 HotSpot의 `_JAVA_OPTIONS`로 `XMS_MB`, `MEMORY_PERCENT`, `JAVA_ARGS`를 전달합니다. 기존 환경 옵션을 유지하면서 프로필 옵션을 뒤에 추가하므로, 표준 실행 스크립트와 `user_jvm_args.txt`의 중복 JVM 옵션보다 프로필 설정이 우선합니다. 실행 스크립트와 인수 파일의 내용은 변경하지 않습니다.

모드팩의 `user_jvm_args.txt` 또는 실행 스크립트가 메모리를 결정하게 하려면 `SCRIPT_MEMORY_MODE=script`로 설정하세요. 이때 런처는 Xms/Xmx를 추가하지 않으며 `JAVA_ARGS`만 전달합니다. 패널 메모리 제한은 계속 적용됩니다. `Memory=0`에서도 스크립트의 Xmx보다 큰 Xms를 덧붙이는 충돌을 피할 수 있습니다.

기본 힙 비율 95%는 모드팩과 네이티브 메모리 사용에 따라 여유가 부족할 수 있습니다. 실제 메모리 사용과 OOM-kill 여부를 확인하고 `MEMORY_PERCENT`를 낮추거나 모드팩의 검증된 메모리 설정을 사용하세요.

### script 모드 JAVA_ARGS

`--add-opens 값`, `--add-exports 값`, `--add-reads 값`, `--add-modules 값`, `--limit-modules 값`, `--enable-native-access 값`은 VM이 읽을 수 있는 `--옵션=값`으로 정규화합니다. 해당 옵션을 지원하는 Java 버전이 필요하며, 인용된 `-Dname="two words"` 값은 보존합니다. HotSpot의 환경 인수 규칙에 맞춰 백슬래시는 문자 그대로 보존하며 셸 이스케이프를 적용하지 않습니다.

`-cp`, `--class-path`, `--module-path`, `-jar`, `--module`, `--source`, `@argfile` 등 런처 전용 인수는 `JAVA_ARGS`에서 지원하지 않습니다. 실제 실행을 바꾸는 이 인수들은 `SERVER_SCRIPT`의 Java 명령으로 옮기세요. 런처는 실행 전에 설명과 함께 중단합니다. jar 모드의 기존 인수 처리는 유지합니다.

`_JAVA_OPTIONS`를 상속받은 Java는 stderr에 `Picked up _JAVA_OPTIONS`를 출력합니다. `java -version`의 첫 줄만 읽는 커스텀 스크립트는 버전 문장이 있는 줄을 찾도록 수정해야 합니다. 스크립트가 설치용 JVM도 실행한다면 같은 옵션이 전달됩니다. 이러한 스크립트의 자체 정책을 유지하려면 `SCRIPT_MEMORY_MODE=script`, 빈 `JAVA_ARGS`를 사용하세요. 환경 변수를 지우거나 Java 경로를 고정하는 스크립트는 별도 확인이 필요합니다.

## 자동 백업

프로필을 전환하면 이전 프로필을 자동으로 백업할 수 있습니다.

예:

```text
mcs → default
```

전환 시:

```text
/home/container/profile-backups/mcs/
└─ mcs-YYYYMMDD-HHMMSS-1-switch.tar.gz
```

형태로 생성됩니다.

`BACKUP_KEEP=5`라면 프로필별 최신 5개를 유지합니다.

이 백업은 Pterodactyl 기본 `Backups` 탭과 별도의 `.tar.gz` 파일입니다.

`BACKUP_KEEP=0`은 개수 제한 없이 보관합니다. 복원 절차는 [프로필 백업 복원](docs/RESTORE.md)을 참고하세요.

## 진단 실행

컨테이너 셸에서 `MULTI_DRY_RUN=true sh /home/container/profile-launcher.sh`를 실행하면 선택한 프로필, 버전, Java와 메모리 계획을 확인합니다. 설정·EULA·백업·활성 프로필 상태를 변경하지 않으며 Java 다운로드와 서버 실행도 생략합니다. `SERVER_PROFILE`, `SERVER_PORT` 등 기존 실행 환경 변수가 필요합니다.

## 수정판 적용과 다운로드 검증

v2.2.1은 2026-10-28에 공개한 수정판입니다. 실행 시작 요약의 `Manager version : 2.2.1`로 적용 여부를 확인할 수 있습니다. 기존 v2.2.0 Egg 파일은 과거 릴리스 그대로 보관합니다.

새 서버는 v2.2.1 Egg를 **Import**한 뒤 그 Egg로 생성합니다. Import는 새 Egg를 만들며 기존 서버의 Egg 연결이나 설치된 런처를 바꾸지 않습니다.

기존 서버의 정식 업데이트 경로는 서버를 완전히 정지하고 전체 백업 → 현재 서버에 연결된 Egg의 **Update Egg**에서 v2.2.1 JSON 적용 → 해당 서버 **Reinstall**입니다. 갱신된 Egg를 사용해야 새 설치기가 실행됩니다. 새 Egg를 Import하는 방식을 택한다면 먼저 서버의 Egg 연결을 새 Egg로 변경해야 합니다.

이 설치기의 재설치는 `profile-launcher.sh`와 `profile.conf.example`을 덮어씁니다. 기존 프로필 폴더, 기존 JAR, `profile.conf`, `server.properties`는 보존합니다. `servers/default` 루트에 JAR이 없다면 초기 Paper를 다운로드하므로, 재설치 전에 이 조건도 확인하세요. 관리자 전용 `DL_SHA256` 변수가 갱신된 Egg에 있는지 확인합니다.

런처만 교체하려면 정지·백업 후 `src/profile-launcher.sh`를 `/home/container/profile-launcher.sh`에 업로드할 수 있습니다. 이 경로는 Egg와 설치기를 갱신하지 않습니다. Windows 편집기로 저장할 때 UTF-8, **LF 줄바꿈**을 유지하세요.

v2.2.1은 모호한 캐시 버전 중 최신을 임의로 선택하지 않습니다. 이전에 실행되던 프로필도 여러 버전이 남아 있으면 중단될 수 있으니, 진단 결과를 확인하고 `MINECRAFT_VERSION`을 지정하세요.

기존 `profile.conf`의 `BACKUP_ON_SWITCH`와 `BACKUP_KEEP`을 전역 설정에 맡기려면 해당 줄을 주석 처리하거나 제거하세요.

초기 Paper 다운로드는 공식 API의 SHA-256과 Info-ZIP의 CRC 검사를 통과한 뒤 `server.jar`로 옮깁니다. Alpine 설치 이미지의 BusyBox unzip만 있으면 설치기가 `apk add --no-cache unzip`으로 Info-ZIP을 확보합니다. 패키지 설치가 실패하면 다운로드를 진행하지 않고 중단합니다.

관리자 전용 `DL_PATH`에는 선택적으로 `DL_SHA256`을 지정할 수 있습니다. 커스텀 URL은 신뢰할 수 있는 배포처의 SHA-256을 지정하는 것을 권장합니다. CRC는 우발적 손상을 감지하며 출처나 변조를 인증하지 않습니다. 커스텀 URL과 `MINECRAFT_VERSION=latest`를 함께 쓰면 버전은 `auto`로 남겨 실제 파일에서 감지합니다.

설치기 셸에 TERM이 오면 다운로드 중인 curl도 종료하고 임시 파일을 정리합니다. SIGKILL 또는 호스트 중단에서는 정리 코드를 실행할 수 없어 `.server.download.*`가 남을 수 있습니다. 남은 파일은 JAR로 인식하지 않습니다.

개발 및 검증 방법은 [기여 가이드](CONTRIBUTING.md)를 참고하세요.

## 대용량 파일 업로드: Launch SFTP + WinSCP

Pterodactyl 웹 File Manager는 환경에 따라 100MB 업로드 제한에 걸릴 수 있습니다.

대용량 월드, 서버 압축파일, 백업 파일 업로드는 **Pterodactyl의 `Launch SFTP` + WinSCP** 사용을 권장합니다.

Pterodactyl 서버 화면:

```text
Settings
→ SFTP Details
→ Launch SFTP
→ WinSCP
```

Windows에서는 WinSCP를 설치해 `sftp://` 링크 연결 프로그램으로 사용하면 Pterodactyl의 **Launch SFTP** 버튼으로 바로 접속할 수 있어 편합니다.

PowerShell의 `sftp`/`scp`도 사용할 수 있지만, 서버 파일을 자주 관리한다면 WinSCP가 더 편합니다.

## 중요한 제한 사항

- 동시에 프로필 하나만 실행하는 용도입니다.
- 모든 프로필은 하나의 Pterodactyl 서버 자원 제한을 공유합니다.
- 자동 감지가 모든 커스텀/고도 수정 서버 구성을 식별할 수 있는 것은 아닙니다.
- 프로필 백업은 Pterodactyl 기본 Backups 기능과 별도로 저장됩니다.
- 중요한 월드는 이 기능과 별도로 정기적인 외부 백업도 유지하는 것을 권장합니다.

## 실제 Pterodactyl 환경 테스트

기존 v2.2.0 릴리스에서 실제 환경으로 확인한 항목입니다. v2.2.1 수정 사항은 자동 검사와 별도로 실제 Pterodactyl 재검증이 필요합니다.

- 최종 Egg 신규 실행
- `Memory=0` Unlimited 처리
- 한글 프로필명
- `profile.conf` 자동 생성
- 기존 Paper 서버의 `latest.log` 기반 자동 감지
- Java 21 ↔ Java 25 자동 전환
- Primary Allocation 포트 자동 적용
- 프로필 전환 자동 백업
- `BACKUP_KEEP` 보관 개수 정리
- 존재하지 않는 프로필 안전 차단
- 실제 Minecraft 클라이언트 접속 및 프로필 왕복 후 월드 유지

## AI 사용 공개

이 프로젝트는 설계 논의, 코드 작성/수정, 디버깅, 문서화, 릴리스 준비 과정에서 OpenAI ChatGPT의 도움을 받아 개발되었습니다.
최종 기능 선택, 실제 Pterodactyl 환경에서의 테스트, 배포 및 저장소 관리는 프로젝트 소유자가 수행합니다.

자세한 내용은 [AI_ASSISTANCE.md](AI_ASSISTANCE.md)를 확인하세요.

## 변경 내역

[CHANGELOG.md](CHANGELOG.md)를 확인하세요.

## 라이선스

MIT License를 사용합니다. 자세한 내용은 [LICENSE](LICENSE)를 확인하세요.

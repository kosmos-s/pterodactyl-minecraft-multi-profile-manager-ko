# Pterodactyl Minecraft Multi-Profile Manager v2.2.0

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

1. Pterodactyl 관리자 페이지에서 Minecraft Nest에 `egg/egg-minecraft-multi-profile-manager-v2.2.0.json`을 Import합니다.
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
BACKUP_ON_SWITCH=true
BACKUP_KEEP=5
BACKUP_EXCLUDE_LOGS=true
```

대부분은 `auto` 상태로 두면 됩니다. 자동 감지가 어려운 값만 직접 지정하면 됩니다.

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

v2.2.0은 실제 환경에서 다음을 확인했습니다.

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

# Pterodactyl Minecraft Multi-Profile Manager 한국어판

**Pterodactyl 서버 1개 + Allocation 1개**로 여러 개의 독립적인 Minecraft 서버 폴더를 보관하고, 필요할 때 하나의 프로필만 선택해서 실행하는 프로젝트입니다.

여러 월드, 모드팩, 테스트 서버, 친구 서버를 보관하지만 각각에 별도 포트를 할당하고 싶지 않은 홈서버/소규모 서버 운영자를 위해 만들었습니다.

> Pterodactyl Software의 공식 프로젝트가 아니며, 제휴 또는 보증을 받지 않았습니다.
>
> 영문 저장소: https://github.com/kosmos-s/pterodactyl-minecraft-multi-profile-manager

## 왜 만들었나요?

일반적인 Pterodactyl 서버는 서버가 꺼져 있어도 Primary Allocation이 필요합니다. 그래서 Minecraft 서버를 각각 별도의 Pterodactyl 서버로 만들어 보관하면, 서버 수만큼 Allocation도 계속 늘어나게 됩니다.

이 프로젝트는 여러 Minecraft 서버를 하나의 Pterodactyl 서버 안에서 **프로필 폴더**로 보관합니다.

```text
/home/container/
├─ servers/
│  ├─ survival/
│  ├─ modded/
│  ├─ hardcore/
│  └─ friends/
├─ profile-backups/
└─ .multijava/
```

실제로 실행되는 서버는 선택한 프로필 하나뿐이며, 모든 프로필이 같은 Pterodactyl Primary Allocation을 사용합니다.

## 주요 기능

- Pterodactyl 서버 1개 + Primary Allocation 1개
- 여러 개의 독립적인 Minecraft 서버 폴더 보관
- `profile.conf`이 없으면 자동 생성
- 서버 종류 자동 감지
- 가능한 경우 Minecraft 버전 자동 감지
- Java 버전 자동 선택
- 프로필별 설정 적용
- 존재하지 않거나 잘못된 프로필 실행 방지
- 프로필 전환 시 이전 프로필 자동 백업
- 현재 Primary Allocation 포트를 `server.properties`에 자동 적용
- 선택 사항: `/servers` 폴더를 자동 감지하는 `SERVER_PROFILE` 동적 드롭다운

## 지원하는 서버 종류

자동 감지를 기준으로 다음과 같은 일반적인 서버 구성을 지원하도록 설계했습니다.

- Paper
- Purpur
- Folia
- Spigot
- Vanilla
- Fabric
- Quilt
- Forge
- NeoForge
- Mohist
- Magma
- Arclight

자동 감지는 일부러 보수적으로 동작합니다. Minecraft 버전이나 Java 버전을 안전하게 판단할 수 없으면 임의로 실행하지 않고, `profile.conf`에서 직접 지정하도록 중단합니다.

## 설치 방법

### 1. Egg 가져오기

Pterodactyl 관리자 페이지의 Minecraft Nest에서 아래 파일을 Import 합니다.

```text
egg/egg-minecraft-multi-profile-manager-v2.1.json
```

이 Egg로 Pterodactyl 서버를 하나 생성하고 Primary Allocation을 하나만 지정합니다.

예:

```text
25565
```

Minecraft EULA에 동의하는 경우에만 Startup에서 다음 값을 설정합니다.

```text
ACCEPT_EULA=true
```

### 2. 프로필 추가

기존 Minecraft 서버 파일을 각각 별도 폴더에 넣습니다.

```text
/home/container/servers/
├─ survival/
│  ├─ server.jar
│  ├─ server.properties
│  ├─ world/
│  └─ plugins/
└─ modded/
   ├─ run.sh
   ├─ libraries/
   ├─ mods/
   └─ world/
```

그다음 Startup에서 폴더 이름을 `SERVER_PROFILE`로 선택하고 서버를 시작하면 됩니다.

## `profile.conf`

프로필 폴더에 `profile.conf`이 없다면 처음 실행할 때 자동으로 생성됩니다.

예:

```ini
NAME=야생 서버
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

예를 들어 Minecraft 버전을 직접 지정하려면:

```ini
MINECRAFT_VERSION=1.20.1
```

Java 버전을 직접 지정하려면:

```ini
JAVA_VERSION=17
```

## Java 자동 선택

프로필마다 필요한 Java 버전이 달라도 서버를 바꿀 때마다 Pterodactyl Docker Image를 수동 변경할 필요가 없도록 설계했습니다.

필요한 Java 런타임은 다음 경로에 저장해서 재사용할 수 있습니다.

```text
/home/container/.multijava/
```

예:

```text
survival → Java 21
modded   → Java 17
old      → Java 8
```

자동 판단이 애매하면 실행을 강행하지 않고 `profile.conf`에서 Java 버전을 직접 지정하도록 안내합니다.

## 서버 프로필 변경

기본적인 사용 순서는 다음과 같습니다.

```text
서버 Stop
→ Startup
→ SERVER_PROFILE 변경
→ 서버 Start
```

예를 들어:

```text
survival → modded
```

로 바꾸면 이전에 사용하던 `survival` 프로필을 필요에 따라 백업한 뒤 `modded` 프로필을 실행합니다.

## 동적 프로필 드롭다운 (선택 사항)

`panel-patch/` 폴더에는 Pterodactyl Panel 프론트엔드용 선택적 패치가 포함되어 있습니다.

기존 Startup의 `SERVER_PROFILE` 텍스트 입력칸을 `/home/container/servers/` 폴더를 읽는 동적 드롭다운으로 변경합니다.

예를 들어:

```text
servers/
├─ survival/
├─ modded/
└─ hardcore/
```

가 있으면 Startup에서 자동으로:

```text
SERVER_PROFILE
[ survival ▼ ]

survival
modded
hardcore
```

처럼 표시됩니다.

Startup 화면을 열 때 프로필 목록을 가져오고, 드롭다운을 클릭할 때도 다시 확인합니다.

### Panel 패치 설치

Pterodactyl Panel이 설치된 서버에서:

```bash
cd panel-patch
sudo bash install.sh /var/www/pterodactyl

cd /var/www/pterodactyl
yarn build:production
```

그다음 브라우저에서 `Ctrl + F5`로 새로고침합니다.

이 패치는 기존 Pterodactyl 파일 목록 API를 사용하며 Wings나 별도 백엔드 API를 수정하지 않습니다.

### Panel 패치 제거

```bash
cd panel-patch
sudo bash uninstall.sh /var/www/pterodactyl

cd /var/www/pterodactyl
yarn build:production
```

## 백업

프로필 전환 시 이전 프로필을 별도로 압축해서 보관할 수 있습니다.

```text
/home/container/profile-backups/
├─ survival/
├─ modded/
└─ hardcore/
```

`BACKUP_KEEP` 값으로 프로필별 보관 개수를 제한할 수 있습니다.

```ini
BACKUP_ON_SWITCH=true
BACKUP_KEEP=5
```

이 백업은 Pterodactyl 기본 `Backups` 탭의 백업과는 별도입니다.

## 중요한 제한 사항

- 한 번에 프로필 하나만 실행하는 용도로 설계했습니다.
- 프로필들은 Pterodactyl 서버 목록에서 각각의 서버로 표시되지 않습니다.
- 동적 드롭다운 기능은 Pterodactyl Panel 프론트엔드 소스를 수정하므로 Panel 업데이트 후 다시 적용해야 할 수 있습니다.
- 프로필 백업은 Pterodactyl 기본 Backups 기능과 별도로 저장됩니다.
- 이름을 크게 변경했거나 커스텀된 서버는 자동 감지가 실패할 수 있습니다.
- 중요한 월드라면 이 프로젝트의 백업 기능과 별도로 정기적인 외부 백업도 권장합니다.

## 저장소 구조

```text
.
├─ egg/
│  └─ egg-minecraft-multi-profile-manager-v2.1.json
├─ panel-patch/
│  ├─ DynamicProfileSelect.tsx
│  ├─ install.sh
│  ├─ patch_variablebox.py
│  └─ uninstall.sh
├─ docs/
│  └─ MIGRATION-v1-to-v2.md
├─ CONTRIBUTING.md
├─ SECURITY.md
├─ LICENSE
└─ README.md
```

## 기여

버그 제보와 Pull Request를 환영합니다.

자동 감지 문제가 있다면 다음 정보를 함께 알려주세요.

- Pterodactyl Panel 버전
- Minecraft 버전
- 서버 종류 및 버전 (Paper / Forge / Fabric 등)
- 프로필 폴더에 들어 있는 주요 파일 이름
- Multi-Profile 런처의 관련 콘솔 로그

월드 파일, 비밀번호, API Key, 토큰 등 개인정보나 민감한 서버 데이터는 업로드하지 마세요.

## 라이선스

MIT License를 사용합니다. 자세한 내용은 [LICENSE](LICENSE)를 확인하세요.

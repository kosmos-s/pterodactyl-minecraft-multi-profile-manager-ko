# v1 → v2 마이그레이션

v2는 기존의 단순 프로필 전환 구조에 다음 기능을 추가했습니다.

- `profile.conf` 자동 생성 및 프로필별 설정
- 서버 종류 자동 감지
- Minecraft 버전 감지
- Java 런타임 자동 선택
- 잘못된 프로필 실행 방지
- 프로필 전환 시 이전 프로필 백업

## 기존 프로필

기존 `servers/<프로필>/` 구조는 그대로 사용할 수 있습니다.

```text
servers/
├─ survival/
├─ modded/
└─ hardcore/
```

`profile.conf`이 없다면 처음 실행할 때 기본 설정 파일이 자동 생성됩니다.

## Startup

기본적으로 계속 `SERVER_PROFILE` 변수만 변경해서 사용할 수 있습니다.

```text
SERVER_PROFILE=survival
```

v2.2.0에서 실험용 Panel 패치와 동적 드롭다운은 제거되었습니다. Startup에서 프로필 폴더명을 직접 입력합니다.

## Java

v1에서 프로필에 따라 Docker Image를 직접 바꿨다면, v2에서는 Java 자동 선택 기능을 사용할 수 있습니다.

자동 감지가 어려운 서버는 해당 프로필의 `profile.conf`에 직접 지정하세요.

```ini
JAVA_VERSION=17
```

## 백업

v2의 프로필 백업은 다음 위치에 별도로 저장됩니다.

```text
/home/container/profile-backups/
```

Pterodactyl 기본 Backups 탭과는 별개의 기능입니다.

기존 `profile.conf`에 `BACKUP_ON_SWITCH` 또는 `BACKUP_KEEP`이 있으면 해당 값이 우선합니다. 전역 설정을 상속하려면 그 줄을 주석 처리하거나 제거하세요. 복원 방법은 [프로필 백업 복원](RESTORE.md)을 참고하세요.

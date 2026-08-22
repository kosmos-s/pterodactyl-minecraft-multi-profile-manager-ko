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

Panel 패치는 Pterodactyl 버전에 따라 영향을 받을 수 있으므로, 관련 변경에는 테스트한 Panel 버전을 적어주세요.

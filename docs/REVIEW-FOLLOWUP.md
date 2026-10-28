# PR #1 외부 리뷰 후속 조치

검토 기준: d3193506f6741677504939a8e7af8fca75ac0656. 수정판: v2.2.1 (미출시).

| 검토 항목 | 조치 |
| --- | --- |
| 기본 Java 이미지에 unzip이 없음 | 실제 Dockerfile에서 의존성 차이를 확인했다. JDK jar fallback과 도구 부재 경고를 추가하고 unzip을 제외한 PATH에서 실제 JDK로 검사한다. |
| script JAVA_ARGS의 모듈 옵션 공백 형식 | 쉘 eval 없이 토큰을 읽어 --add-opens 등 지원 옵션을 = 형식으로 정규화한다. 클래스패스/진입점/@argfile은 스크립트로 옮기라는 설명과 함께 사전 차단한다. |
| BusyBox unzip의 stored 항목 CRC 누락 | Alpine 설치기가 Info-ZIP을 설치하고 unzip -tq로 CRC를 검사한다. 확보할 수 없으면 안전하게 중단한다. |
| 기존 서버 업데이트 문서 | Update Egg와 Import를 구분하고 갱신된 Egg로 재설치하는 경로, 보존·덮어쓰기 대상, UTF-8/LF 저장을 설명한다. 콘솔에서 2.2.1을 확인한다. |
| 셸 단독 TERM 시 정리 지연 | curl을 자식으로 실행하고 wait하는 동안 셸 TERM을 처리해 자식 종료·임시 파일 정리를 수행한다. 셸에만 TERM을 보내는 검사를 추가한다. SIGKILL의 정리 한계는 명시한다. |
| script 메모리 정책 | SCRIPT_MEMORY_MODE=script를 추가해 모드팩의 Xms/Xmx를 유지할 수 있게 한다. 기본 manager의 우선순위와 95% 힙의 네이티브 메모리 여유 문제를 설명한다. |
| 커스텀 스크립트의 환경 변수 상속 | 버전 첫 줄 파싱과 설치용 JVM 상속 영향을 설명하고, script 메모리 모드와 빈 JAVA_ARGS로 자체 정책을 유지하는 경로를 안내한다. |

추가 CI는 실제 ghcr.io/pterodactyl/yolks:java_25와 ghcr.io/pterodactyl/installers:alpine에서 검사한다. 실행기 이미지에는 unzip을 추가하지 않는다. 설치기 이미지에는 테스트용 Node.js만 먼저 추가하고 Info-ZIP 설치는 실제 설치기 코드로 검증한다.

수정 전에 추가한 재현 검사 여섯 개가 실패하는 것을 확인했다. 첫 컨테이너 검사는 Ubuntu 38/38, 실제 yolk 26/26, Alpine 설치기 12/12로 통과했다. 독립 리뷰에서 백슬래시를 셸 이스케이프로 오해하는 회귀를 추가 재현했고, 두 회귀 검사가 실패하는 것을 확인한 뒤 HotSpot의 문자 그대로 처리하는 규칙으로 수정했다. 최종 Linux/컨테이너 결과는 PR의 해당 커밋 CI를 기준으로 확인한다.

이 PR에서 별도 작업으로 남긴 기존 항목:
- Adoptium JRE 다운로드의 체크섬·중단 복구 강화
- NeoForge 1.20.1의 net/neoforged/forge 라이브러리 경로 자동 감지
- script 모드에서 run.sh가 지정한 unix_args.txt를 읽어 버전을 확정하는 기능

실제 Minecraft/Forge/NeoForge 모드팩 시작·클라이언트 접속, Wings의 설치 컨테이너 종료 방식, 장시간 메모리 사용, 백업 복원은 별도 실서버 검증이 필요하다.

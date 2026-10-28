# 프로필 백업 복원

이 백업은 Pterodactyl Backups 탭과 별도로 저장되는 tar.gz 파일입니다. 아래 작업은 서버가 완전히 정지한 상태에서 진행하세요.

1. Pterodactyl에서 Stop을 누르고 Offline 상태를 확인합니다. 자동 재시작 일정도 일시 중지합니다.
2. SFTP로 복원할 profile-backups/<프로필>/<백업>.tar.gz를 PC에 내려받습니다. 원본 백업 파일은 보관합니다.
3. PC에서 압축파일을 열어 world/, profile.conf 등 필요한 파일이 있는지 확인합니다. BACKUP_EXCLUDE_LOGS=true이면 logs/, cache/, crash-reports/는 포함되지 않습니다.
4. 기존 servers/<프로필>/ 전체를 PC에도 보관합니다. 서버에 여유 공간이 있으면 기존 폴더를 servers/<프로필>-before-restore/로 이름을 바꿔 보존합니다. 덮어쓰기 방식으로 복원하면 예전 파일과 새 파일이 섞일 수 있습니다.
5. 비어 있는 servers/<프로필>/ 폴더를 만들고 백업 내용을 풀어 업로드합니다. 압축 최상위의 ./ 안에 있던 내용이 바로 프로필 폴더 안에 오도록 합니다. world/가 한 단계 더 깊어지지 않았는지 확인합니다.
6. profile.conf의 서버 종류, Minecraft 버전, Java 설정을 확인합니다. 모드 서버는 백업 당시의 mods/, libraries/, 실행 스크립트도 함께 복원해야 합니다.
7. Startup의 SERVER_PROFILE을 복원한 프로필로 설정하고 Start합니다. 포트는 현재 Primary Allocation 값으로 다시 적용됩니다.
8. 콘솔에서 정상 시작을 확인하고, 클라이언트로 접속해 월드와 플레이어 데이터를 확인합니다. 문제가 있으면 즉시 Stop한 뒤 보존해 둔 기존 폴더로 되돌립니다.

복원이 확인되기 전에는 기존 폴더와 내려받은 백업을 삭제하지 마세요. 백업 내용이 마지막으로 정상 저장된 시점은 이전 서버의 종료 상태에 따라 달라질 수 있습니다.

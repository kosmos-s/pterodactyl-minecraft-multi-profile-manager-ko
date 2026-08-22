#!/usr/bin/env bash
set -euo pipefail

PANEL_DIR="${1:-/var/www/pterodactyl}"
BACKUP_DIR="${PANEL_DIR}/.multi-profile-dropdown-backup"
TARGET_DIR="${PANEL_DIR}/resources/scripts/components/server/startup"
TARGET="${TARGET_DIR}/VariableBox.tsx"
NEW_COMPONENT="${TARGET_DIR}/DynamicProfileSelect.tsx"

LATEST="$(ls -1t "${BACKUP_DIR}"/VariableBox.tsx.* 2>/dev/null | head -n1 || true)"
if [[ -z "${LATEST}" ]]; then
    echo "ERROR: No VariableBox backup found under ${BACKUP_DIR}"
    exit 1
fi

cp -a "${LATEST}" "${TARGET}"
rm -f "${NEW_COMPONENT}"

echo "Restored: ${LATEST}"
echo
echo "Rebuild the Panel frontend:"
echo "  cd ${PANEL_DIR}"
echo "  yarn build:production"

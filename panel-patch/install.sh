#!/usr/bin/env bash
set -euo pipefail

PANEL_DIR="${1:-/var/www/pterodactyl}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

TARGET_DIR="${PANEL_DIR}/resources/scripts/components/server/startup"
TARGET="${TARGET_DIR}/VariableBox.tsx"
NEW_COMPONENT="${TARGET_DIR}/DynamicProfileSelect.tsx"
BACKUP_DIR="${PANEL_DIR}/.multi-profile-dropdown-backup"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "${TARGET}" ]]; then
    echo "ERROR: VariableBox.tsx not found:"
    echo "  ${TARGET}"
    echo
    echo "Usage: sudo bash install.sh /path/to/pterodactyl"
    exit 1
fi

mkdir -p "${BACKUP_DIR}"
cp -a "${TARGET}" "${BACKUP_DIR}/VariableBox.tsx.${STAMP}"
if [[ -f "${NEW_COMPONENT}" ]]; then
    cp -a "${NEW_COMPONENT}" "${BACKUP_DIR}/DynamicProfileSelect.tsx.${STAMP}"
fi

cp "${SCRIPT_DIR}/DynamicProfileSelect.tsx" "${NEW_COMPONENT}"
python3 "${SCRIPT_DIR}/patch_variablebox.py" "${TARGET}"

echo
echo "Source patch installed."
echo "Backup:"
echo "  ${BACKUP_DIR}/VariableBox.tsx.${STAMP}"
echo
echo "Now rebuild the Panel frontend:"
echo "  cd ${PANEL_DIR}"
echo "  yarn build:production"
echo
echo "Then hard-refresh the browser (Ctrl+F5)."

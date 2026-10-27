#!/bin/ash
set -eu

ROOT="/mnt/server"
PROFILE_ROOT="${ROOT}/servers"
DEFAULT_DIR="${PROFILE_ROOT}/default"
USER_AGENT="Pterodactyl-Multi-Profile/2.2.0 (https://github.com/kosmos-s/pterodactyl-minecraft-multi-profile-manager-ko)"

mkdir -p "$DEFAULT_DIR" "${ROOT}/profile-backups" "${ROOT}/.multi-profile-state" "${ROOT}/.multijava"

cat > "${ROOT}/profile-launcher.sh" <<'MULTI_LAUNCHER'
@PROFILE_LAUNCHER@
MULTI_LAUNCHER
chmod +x "${ROOT}/profile-launcher.sh"

cat > "${ROOT}/profile.conf.example" <<'PROFILE_EXAMPLE'
NAME=My Minecraft Server
SERVER_TYPE=auto
MINECRAFT_VERSION=auto
JAVA_VERSION=auto
LAUNCH_MODE=auto
SERVER_JAR=auto
SERVER_SCRIPT=run.sh
JAVA_ARGS=
XMS_MB=128
MEMORY_PERCENT=95
# Uncomment to override the Startup backup defaults for this profile.
# BACKUP_ON_SWITCH=true
# BACKUP_KEEP=5
BACKUP_EXCLUDE_LOGS=true
PROFILE_EXAMPLE

if [ ! -f "${DEFAULT_DIR}/profile.conf" ]; then
    cat > "${DEFAULT_DIR}/profile.conf" <<'DEFAULT_PROFILE'
NAME=Default Paper
SERVER_TYPE=paper
MINECRAFT_VERSION=auto
JAVA_VERSION=auto
LAUNCH_MODE=jar
SERVER_JAR=server.jar
SERVER_SCRIPT=run.sh
JAVA_ARGS=
XMS_MB=128
MEMORY_PERCENT=95
# Uncomment to override the Startup backup defaults for this profile.
# BACKUP_ON_SWITCH=true
# BACKUP_KEEP=5
BACKUP_EXCLUDE_LOGS=true
DEFAULT_PROFILE
fi

if ! find "$DEFAULT_DIR" -maxdepth 1 -type f -name '*.jar' | grep -q .; then
    PROJECT="paper"
    DOWNLOAD_SHA256=""
    if [ -n "${DL_PATH:-}" ]; then
        DOWNLOAD_URL="${DL_PATH}"; DOWNLOAD_SHA256="${DL_SHA256:-}"; FOUND_VERSION="custom"
        case "${MINECRAFT_VERSION:-}" in ""|latest|auto) ;; *) FOUND_VERSION="$MINECRAFT_VERSION" ;; esac
    else
        PROJECT_META="$(curl --fail --silent --show-error -H "User-Agent: ${USER_AGENT}" "https://fill.papermc.io/v3/projects/${PROJECT}")"
        if [ -z "${MINECRAFT_VERSION:-}" ] || [ "${MINECRAFT_VERSION}" = "latest" ]; then VERSIONS="$(echo "$PROJECT_META" | jq -r '.versions | to_entries[] | .value[]')"; else VERSIONS="${MINECRAFT_VERSION}"; fi
        DOWNLOAD_URL=""; FOUND_VERSION=""
        for VERSION in $VERSIONS; do
            BUILDS="$(curl --fail --silent --show-error -H "User-Agent: ${USER_AGENT}" "https://fill.papermc.io/v3/projects/${PROJECT}/versions/${VERSION}/builds" || true)"
            [ -n "$BUILDS" ] || continue
            URL="$(echo "$BUILDS" | jq -r 'first(.[] | select(.channel == "STABLE") | .downloads."server:default".url) // empty' 2>/dev/null || true)"
            if [ -n "$URL" ]; then
                DOWNLOAD_URL="$URL"; FOUND_VERSION="$VERSION"
                DOWNLOAD_SHA256="$(echo "$BUILDS" | jq -r 'first(.[] | select(.channel == "STABLE") | .downloads."server:default".checksums.sha256) // empty')"
                [ -n "$DOWNLOAD_SHA256" ] || { echo "[Installer] Paper metadata is missing SHA-256." >&2; exit 1; }
                break
            fi
        done
        [ -n "$DOWNLOAD_URL" ] || { echo "[Installer] Could not find a stable Paper build." >&2; exit 1; }
    fi
    echo "[Installer] Installing Paper ${FOUND_VERSION} into servers/default"
    command -v unzip >/dev/null 2>&1 || { echo "[Installer] unzip is required to validate the downloaded JAR." >&2; exit 1; }
    if [ -n "$DOWNLOAD_SHA256" ]; then
        printf '%s\n' "$DOWNLOAD_SHA256" | grep -Eq '^[0-9a-fA-F]{64}$' || { echo "[Installer] Invalid SHA-256 value." >&2; exit 1; }
        command -v sha256sum >/dev/null 2>&1 || { echo "[Installer] sha256sum is required." >&2; exit 1; }
    fi
    TEMP_JAR="$(mktemp "${DEFAULT_DIR}/.server.download.XXXXXX")"
    trap 'rm -f "$TEMP_JAR"' EXIT
    trap 'exit 1' HUP INT TERM
    if ! curl --fail --location --retry 3 --connect-timeout 20 -H "User-Agent: ${USER_AGENT}" -o "$TEMP_JAR" "$DOWNLOAD_URL"; then
        echo "[Installer] JAR download failed; server.jar was not replaced." >&2; exit 1
    fi
    if [ -n "$DOWNLOAD_SHA256" ]; then
        if ! printf '%s  %s\n' "$DOWNLOAD_SHA256" "$TEMP_JAR" | sha256sum -c -; then
            echo "[Installer] JAR checksum mismatch; server.jar was not replaced." >&2; exit 1
        fi
    else
        echo "[Installer] No custom SHA-256 supplied; checking archive integrity only."
    fi
    if ! unzip -p "$TEMP_JAR" >/dev/null 2>&1; then
        echo "[Installer] Download is not a valid JAR/ZIP archive." >&2; exit 1
    fi
    mv "$TEMP_JAR" "${DEFAULT_DIR}/server.jar"
    trap - EXIT HUP INT TERM
    if [ "$FOUND_VERSION" != "custom" ] && [ -n "$FOUND_VERSION" ]; then sed -i "s/^MINECRAFT_VERSION=.*/MINECRAFT_VERSION=${FOUND_VERSION}/" "${DEFAULT_DIR}/profile.conf"; fi
fi

if [ ! -f "${DEFAULT_DIR}/server.properties" ]; then
    cat > "${DEFAULT_DIR}/server.properties" <<'PROPERTIES'
server-ip=0.0.0.0
server-port=25565
query.port=25565
motd=Pterodactyl Multi-Profile Minecraft Server
enable-query=false
PROPERTIES
fi

echo "[Installer] Multi-Profile Manager v2 installed."
echo "[Installer] Default profile: /home/container/servers/default"
echo "[Installer] Change only SERVER_PROFILE in Startup to switch profiles."

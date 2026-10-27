#!/bin/sh
set -eu

# Pterodactyl Minecraft Multi-Profile Manager v2.2.0
# One Pterodactyl server + one allocation, many stored Minecraft profiles.

CONTAINER_ROOT="${CONTAINER_ROOT:-/home/container}"
PROFILE_ROOT="${PROFILE_ROOT:-${CONTAINER_ROOT}/servers}"
BACKUP_ROOT="${BACKUP_ROOT:-${CONTAINER_ROOT}/profile-backups}"
JAVA_ROOT="${JAVA_ROOT:-${CONTAINER_ROOT}/.multijava}"
STATE_ROOT="${STATE_ROOT:-${CONTAINER_ROOT}/.multi-profile-state}"

PROFILE="${SERVER_PROFILE:-default}"
GLOBAL_BACKUP_ON_SWITCH="${AUTO_BACKUP_ON_SWITCH:-true}"
GLOBAL_BACKUP_KEEP="${BACKUP_KEEP:-5}"
ACCEPT_EULA_VALUE="${ACCEPT_EULA:-false}"

log()  { printf '%s\n' "[Multi-Profile] $*"; }
warn() { printf '%s\n' "[Multi-Profile] WARNING: $*" >&2; }
die()  { printf '%s\n' "[Multi-Profile] ERROR: $*" >&2; exit 1; }

is_true() {
    case "${1:-false}" in
        1|true|TRUE|yes|YES|on|ON) return 0 ;;
        *) return 1 ;;
    esac
}

valid_profile_name() {
    name="${1:-}"
    [ -n "$name" ] || return 1
    case "$name" in
        .|..|.*|*..*|/*|*/*|*\\*|*[[:space:]]*) return 1 ;;
    esac
    case "$name" in
        *\**|*\?*|*\[*|*\]*) return 1 ;;
    esac
    return 0
}

list_profiles() {
    if [ ! -d "$PROFILE_ROOT" ]; then return 0; fi
    for d in "$PROFILE_ROOT"/*; do
        [ -d "$d" ] || continue
        basename "$d"
    done | sort
}

trim_value() {
    value="$(printf '%s' "$1" | tr -d '\r')"
    case "$value" in
        \"*\") value="${value#\"}"; value="${value%\"}" ;;
        \'*\') value="${value#\'}"; value="${value%\'}" ;;
    esac
    printf '%s' "$value"
}

reset_profile_config() {
    PROFILE_NAME="$PROFILE"
    CFG_SERVER_TYPE="auto"
    CFG_MINECRAFT_VERSION="auto"
    CFG_JAVA_VERSION="auto"
    CFG_LAUNCH_MODE="auto"
    CFG_SERVER_JAR="auto"
    CFG_SERVER_SCRIPT="run.sh"
    CFG_JAVA_ARGS=""
    CFG_XMS_MB="128"
    CFG_MEMORY_PERCENT="95"
    CFG_BACKUP_ON_SWITCH="$GLOBAL_BACKUP_ON_SWITCH"
    CFG_BACKUP_KEEP="$GLOBAL_BACKUP_KEEP"
    CFG_BACKUP_EXCLUDE_LOGS="true"
}

load_profile_config() {
    dir="$1"
    reset_profile_config
    cfg="$dir/profile.conf"
    if [ ! -f "$cfg" ]; then
        log "No profile.conf found; using automatic detection defaults."
        return 0
    fi
    while IFS= read -r raw || [ -n "$raw" ]; do
        line="$(printf '%s' "$raw" | tr -d '\r')"
        case "$line" in
            ''|\#*) continue ;;
            *=*) ;;
            *) warn "Ignoring malformed profile.conf line: $line"; continue ;;
        esac
        key="${line%%=*}"
        value="${line#*=}"
        value="$(trim_value "$value")"
        case "$key" in
            NAME) PROFILE_NAME="$value" ;;
            SERVER_TYPE) CFG_SERVER_TYPE="$value" ;;
            MINECRAFT_VERSION) CFG_MINECRAFT_VERSION="$value" ;;
            JAVA_VERSION) CFG_JAVA_VERSION="$value" ;;
            LAUNCH_MODE) CFG_LAUNCH_MODE="$value" ;;
            SERVER_JAR) CFG_SERVER_JAR="$value" ;;
            SERVER_SCRIPT) CFG_SERVER_SCRIPT="$value" ;;
            JAVA_ARGS) CFG_JAVA_ARGS="$value" ;;
            XMS_MB) CFG_XMS_MB="$value" ;;
            MEMORY_PERCENT) CFG_MEMORY_PERCENT="$value" ;;
            BACKUP_ON_SWITCH) CFG_BACKUP_ON_SWITCH="$value" ;;
            BACKUP_KEEP) CFG_BACKUP_KEEP="$value" ;;
            BACKUP_EXCLUDE_LOGS) CFG_BACKUP_EXCLUDE_LOGS="$value" ;;
            *) warn "Unknown profile.conf key ignored: $key" ;;
        esac
    done < "$cfg"
}

validate_profile_config() {
    case "$CFG_SERVER_TYPE" in
        auto|paper|purpur|folia|spigot|vanilla|fabric|quilt|forge|neoforge|mohist|magma|arclight|generic) ;;
        *) die "Invalid SERVER_TYPE '$CFG_SERVER_TYPE' in profile.conf." ;;
    esac
    case "$CFG_JAVA_VERSION" in
        auto|8|11|16|17|21|25) ;;
        *) die "Invalid JAVA_VERSION '$CFG_JAVA_VERSION'. Allowed: auto, 8, 11, 16, 17, 21, 25." ;;
    esac
    case "$CFG_LAUNCH_MODE" in
        auto|jar|script) ;;
        *) die "Invalid LAUNCH_MODE '$CFG_LAUNCH_MODE'. Allowed: auto, jar, script." ;;
    esac
    case "$CFG_MEMORY_PERCENT" in ''|*[!0-9]*) die "MEMORY_PERCENT must be an integer from 10 to 100." ;; esac
    [ "$CFG_MEMORY_PERCENT" -ge 10 ] && [ "$CFG_MEMORY_PERCENT" -le 100 ] || die "MEMORY_PERCENT must be from 10 to 100."
    case "$CFG_XMS_MB" in ''|*[!0-9]*) die "XMS_MB must be a non-negative integer." ;; esac
    case "$CFG_BACKUP_KEEP" in ''|*[!0-9]*) die "BACKUP_KEEP must be an integer." ;; esac
}

write_default_profile_config_if_missing() {
    dir="$1"
    cfg="$dir/profile.conf"
    [ -f "$cfg" ] && return 0
    {
        printf '%s\n' '# Minecraft Multi-Profile configuration'
        printf '%s\n' '# "auto" lets the manager detect what it can.'
        printf 'NAME=%s\n' "$PROFILE"
        cat <<'EOF'
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
EOF
    } > "$cfg"
    log "Created default profile.conf in $(basename "$dir")."
}

set_property() {
    key="$1"
    value="$2"
    file="$3"
    [ -f "$file" ] || : > "$file"
    if grep -qE "^${key}=" "$file" 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    else
        printf '%s=%s\n' "$key" "$value" >> "$file"
    fi
}

first_match() {
    for pattern in "$@"; do
        for f in $pattern; do
            [ -f "$f" ] || continue
            printf '%s\n' "$f"
            return 0
        done
    done
    return 1
}

count_root_jars() {
    count=0
    for f in ./*.jar; do [ -f "$f" ] || continue; count=$((count + 1)); done
    printf '%s\n' "$count"
}

detect_server_type_from_logs() {
    [ -f logs/latest.log ] || return 1
    if grep -qiE 'Loading Paper |This server is running Paper|Paper version ' logs/latest.log 2>/dev/null; then printf '%s\n' "paper"; return 0; fi
    if grep -qiE 'Loading Purpur |This server is running Purpur|Purpur version ' logs/latest.log 2>/dev/null; then printf '%s\n' "purpur"; return 0; fi
    if grep -qiE 'Loading Folia |This server is running Folia|Folia version ' logs/latest.log 2>/dev/null; then printf '%s\n' "folia"; return 0; fi
    if grep -qiE 'This server is running CraftBukkit|This server is running Spigot|Spigot version ' logs/latest.log 2>/dev/null; then printf '%s\n' "spigot"; return 0; fi
    if grep -qiE 'Fabric Loader|fabricloader' logs/latest.log 2>/dev/null; then printf '%s\n' "fabric"; return 0; fi
    return 1
}

detect_server_type() {
    if [ "$CFG_SERVER_TYPE" != "auto" ]; then DETECTED_SERVER_TYPE="$CFG_SERVER_TYPE"; return 0; fi
    if [ -f "${CFG_SERVER_SCRIPT:-run.sh}" ]; then
        if [ -d libraries/net/neoforged/neoforge ]; then DETECTED_SERVER_TYPE="neoforge"; return 0; fi
        if [ -d libraries/net/minecraftforge/forge ]; then DETECTED_SERVER_TYPE="forge"; return 0; fi
    fi
    if first_match "./fabric-server-launch.jar" "./fabric-server-mc*.jar" "./fabric-server*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="fabric"; return 0; fi
    if first_match "./quilt-server-launch.jar" "./quilt-server*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="quilt"; return 0; fi
    if first_match "./purpur*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="purpur"; return 0; fi
    if first_match "./folia*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="folia"; return 0; fi
    if first_match "./paper*.jar" "./paperclip*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="paper"; return 0; fi
    if first_match "./spigot*.jar" "./craftbukkit*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="spigot"; return 0; fi
    if first_match "./mohist*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="mohist"; return 0; fi
    if first_match "./magma*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="magma"; return 0; fi
    if first_match "./arclight*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="arclight"; return 0; fi
    if [ -d libraries/net/minecraftforge/forge ] || first_match "./forge-*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="forge"; return 0; fi
    if [ -d libraries/net/neoforged/neoforge ] || first_match "./neoforge-*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="neoforge"; return 0; fi
    if first_match "./minecraft_server*.jar" "./minecraft-server*.jar" >/dev/null 2>&1; then DETECTED_SERVER_TYPE="vanilla"; return 0; fi
    log_type="$(detect_server_type_from_logs || true)"
    if [ -n "$log_type" ]; then DETECTED_SERVER_TYPE="$log_type"; return 0; fi
    if [ -f ./server.jar ]; then DETECTED_SERVER_TYPE="generic"; return 0; fi
    jars="$(count_root_jars)"
    if [ "$jars" -eq 1 ]; then DETECTED_SERVER_TYPE="generic"; return 0; fi
    die "Could not safely detect a runnable server type. Add SERVER_TYPE and SERVER_JAR/SERVER_SCRIPT to profile.conf."
}

select_server_jar() {
    if [ "$CFG_SERVER_JAR" != "auto" ]; then [ -f "$CFG_SERVER_JAR" ] || die "Configured SERVER_JAR not found: $CFG_SERVER_JAR"; DETECTED_SERVER_JAR="$CFG_SERVER_JAR"; return 0; fi
    case "$DETECTED_SERVER_TYPE" in
        paper) patterns="./paper*.jar ./paperclip*.jar" ;; purpur) patterns="./purpur*.jar" ;; folia) patterns="./folia*.jar" ;;
        spigot) patterns="./spigot*.jar ./craftbukkit*.jar" ;; fabric) patterns="./fabric-server-launch.jar ./fabric-server-mc*.jar ./fabric-server*.jar" ;;
        quilt) patterns="./quilt-server-launch.jar ./quilt-server*.jar" ;; forge) patterns="./forge-*.jar" ;; neoforge) patterns="./neoforge-*.jar" ;;
        mohist) patterns="./mohist*.jar" ;; magma) patterns="./magma*.jar" ;; arclight) patterns="./arclight*.jar" ;;
        vanilla) patterns="./minecraft_server*.jar ./minecraft-server*.jar ./server.jar" ;; generic) patterns="./server.jar" ;; *) patterns="" ;;
    esac
    candidates=""; count=0
    for pattern in $patterns; do
        for f in $pattern; do
            [ -f "$f" ] || continue
            if printf '%s' "$candidates" | grep -Fqx -- "$f"; then continue; fi
            candidates="${candidates}${f}
"; count=$((count + 1))
        done
    done
    if [ "$count" -eq 0 ]; then
        root_count="$(count_root_jars)"
        if [ "$root_count" -eq 1 ]; then for f in ./*.jar; do [ -f "$f" ] || continue; DETECTED_SERVER_JAR="${f#./}"; return 0; done; fi
        die "No runnable server jar was found. Set SERVER_JAR in profile.conf."
    fi
    if [ "$count" -gt 1 ]; then
        warn "Multiple possible server jars were found:"
        printf '%s' "$candidates" | sed '/^$/d' | sed 's/^/[Multi-Profile]   - /' >&2
        die "Refusing to guess. Set SERVER_JAR=<filename> in profile.conf."
    fi
    DETECTED_SERVER_JAR="$(printf '%s' "$candidates" | sed '/^$/d' | head -n 1)"
    DETECTED_SERVER_JAR="${DETECTED_SERVER_JAR#./}"
}

detect_launch_mode() {
    if [ "$CFG_LAUNCH_MODE" != "auto" ]; then DETECTED_LAUNCH_MODE="$CFG_LAUNCH_MODE"; else
        case "$DETECTED_SERVER_TYPE" in forge|neoforge) if [ -f "$CFG_SERVER_SCRIPT" ]; then DETECTED_LAUNCH_MODE="script"; else DETECTED_LAUNCH_MODE="jar"; fi ;; *) DETECTED_LAUNCH_MODE="jar" ;; esac
    fi
    if [ "$DETECTED_LAUNCH_MODE" = "script" ]; then [ -f "$CFG_SERVER_SCRIPT" ] || die "Startup script not found: $CFG_SERVER_SCRIPT"; DETECTED_SERVER_JAR=""; else select_server_jar; fi
}

extract_version_from_text() {
    text="$1"
    printf '%s\n' "$text" | grep -Eo '(^|[^0-9])((2[6-9]|[3-9][0-9])\.[0-9]+(\.[0-9]+)?|1\.[0-9]+(\.[0-9]+)?)([^0-9]|$)' | sed -E 's/^[^0-9]*//; s/[^0-9.].*$//' | head -n 1 || true
}

detect_version_from_logs() {
    [ -f logs/latest.log ] || return 1
    v="$(grep -Eo 'for Minecraft [0-9]+(\.[0-9]+){1,2}' logs/latest.log 2>/dev/null | tail -n 1 | awk '{print $NF}' || true)"; [ -n "$v" ] && { printf '%s\n' "$v"; return 0; }
    v="$(grep -Eo '\(MC: [0-9]+(\.[0-9]+){1,2}\)' logs/latest.log 2>/dev/null | tail -n 1 | sed 's/(MC: //;s/)//' || true)"; [ -n "$v" ] && { printf '%s\n' "$v"; return 0; }
    v="$(grep -Eo 'Starting minecraft server version [0-9]+(\.[0-9]+){1,2}' logs/latest.log 2>/dev/null | tail -n 1 | awk '{print $NF}' || true)"; [ -n "$v" ] && { printf '%s\n' "$v"; return 0; }
    v="$(grep -Eo 'Loading Minecraft [0-9]+(\.[0-9]+){1,2}' logs/latest.log 2>/dev/null | tail -n 1 | awk '{print $NF}' || true)"; [ -n "$v" ] && { printf '%s\n' "$v"; return 0; }
    return 1
}

unique_version() {
    unique="$(printf '%s\n' "$1" | sed '/^$/d' | sort -u)"
    [ -n "$unique" ] || return 1
    count="$(printf '%s\n' "$unique" | wc -l | tr -d '[:space:]')"
    [ "$count" -le 1 ] || return 2
    printf '%s\n' "$unique"
}

detect_version_from_versions_dir() {
    [ -d versions ] || return 1
    candidates=""
    for entry in versions/*; do
        [ -e "$entry" ] || continue
        base="$(basename "$entry")"; v="$(extract_version_from_text "$base")"
        [ -n "$v" ] || continue
        candidates="$candidates$v
"
    done
    unique_version "$candidates"
}

detect_version_from_libraries() {
    candidates=""
    for d in libraries/net/minecraftforge/forge/* libraries/net/fabricmc/intermediary/*; do
        [ -d "$d" ] || continue
        base="$(basename "$d")"; v="$(extract_version_from_text "$base")"
        [ -n "$v" ] || continue
        candidates="$candidates$v
"
    done
    for d in libraries/net/neoforged/neoforge/*; do
        [ -d "$d" ] || continue
        base="$(basename "$d")"; major="$(printf '%s' "$base" | cut -d. -f1)"; minor="$(printf '%s' "$base" | cut -d. -f2)"
        case "$major:$minor" in *[!0-9:]*|:*|*:) continue ;; esac
        v=""
        if [ "$major" -ge 26 ]; then v="$major.$minor"; elif [ "$major" -ge 20 ]; then v="1.$major.$minor"; fi
        [ -n "$v" ] || continue
        candidates="$candidates$v
"
    done
    unique_version "$candidates"
}

detect_version_from_jar_metadata() {
    jar="$1"
    [ -n "$jar" ] && [ -f "$jar" ] || return 1
    command -v unzip >/dev/null 2>&1 || return 1
    content="$(unzip -p "$jar" version.json 2>/dev/null | head -c 8192 || true)"
    [ -n "$content" ] || return 1
    v="$(printf '%s' "$content" | grep -Eo '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -n 1 | sed -E 's/.*"([^"]+)"$/\1/' || true)"
    v="$(extract_version_from_text "$v")"
    [ -n "$v" ] && { printf '%s\n' "$v"; return 0; }
    return 1
}

detect_minecraft_version() {
    if [ "$CFG_MINECRAFT_VERSION" != "auto" ] && [ -n "$CFG_MINECRAFT_VERSION" ]; then DETECTED_MINECRAFT_VERSION="$CFG_MINECRAFT_VERSION"; return 0; fi
    v=""
    # The selected artifact is stronger evidence than logs or leftover caches.
    if [ -n "$DETECTED_SERVER_JAR" ]; then
        v="$(detect_version_from_jar_metadata "$DETECTED_SERVER_JAR" || true)"
        [ -n "$v" ] || v="$(extract_version_from_text "$DETECTED_SERVER_JAR")"
    fi
    [ -n "$v" ] || v="$(detect_version_from_logs || true)"
    if [ -z "$v" ]; then
        if v="$(detect_version_from_versions_dir)"; then :; else
            status=$?
            [ "$status" -ne 2 ] || die "Multiple cached Minecraft versions are ambiguous. Set MINECRAFT_VERSION in profile.conf."
        fi
    fi
    if [ -z "$v" ]; then
        if v="$(detect_version_from_libraries)"; then :; else
            status=$?
            [ "$status" -ne 2 ] || die "Multiple library Minecraft versions are ambiguous. Set MINECRAFT_VERSION in profile.conf."
        fi
    fi
    if [ -z "$v" ]; then DETECTED_MINECRAFT_VERSION="unknown"; else DETECTED_MINECRAFT_VERSION="$v"; fi
}

java_for_minecraft_version() {
    version="$1"; stype="$2"
    case "$version" in 2[6-9].*|[3-9][0-9].*) printf '25\n'; return 0 ;; 1.*) ;; *) return 1 ;; esac
    minor="$(printf '%s' "$version" | cut -d. -f2)"; patch="$(printf '%s' "$version" | cut -d. -f3)"; [ -n "$patch" ] || patch=0
    case "$minor:$patch" in *[!0-9:]*|:*) return 1 ;; esac
    case "$stype" in
        paper|purpur|folia)
            if [ "$minor" -le 11 ]; then printf '8\n'; elif [ "$minor" -le 15 ]; then printf '11\n'; elif [ "$minor" -eq 16 ] && [ "$patch" -le 4 ]; then printf '11\n'; elif [ "$minor" -eq 16 ]; then printf '16\n'; elif [ "$minor" -le 19 ]; then printf '17\n'; else printf '21\n'; fi
            return 0 ;;
    esac
    if [ "$minor" -le 16 ]; then printf '8\n'; elif [ "$minor" -eq 17 ]; then printf '16\n'; elif [ "$minor" -le 19 ]; then printf '17\n'; elif [ "$minor" -eq 20 ]; then if [ "$patch" -ge 5 ]; then printf '21\n'; else printf '17\n'; fi; else printf '21\n'; fi
}

select_java_version() {
    if [ "$CFG_JAVA_VERSION" != "auto" ]; then SELECTED_JAVA_VERSION="$CFG_JAVA_VERSION"; return 0; fi
    if [ "$DETECTED_MINECRAFT_VERSION" = "unknown" ]; then die "Minecraft version could not be detected, so Java cannot be selected safely. Set MINECRAFT_VERSION or JAVA_VERSION in profile.conf."; fi
    SELECTED_JAVA_VERSION="$(java_for_minecraft_version "$DETECTED_MINECRAFT_VERSION" "$DETECTED_SERVER_TYPE" || true)"
    [ -n "$SELECTED_JAVA_VERSION" ] || die "No automatic Java rule for Minecraft '$DETECTED_MINECRAFT_VERSION'. Set JAVA_VERSION in profile.conf."
}

detect_arch() {
    case "$(uname -m)" in x86_64|amd64) printf 'x64\n' ;; aarch64|arm64) printf 'aarch64\n' ;; armv7l|armv7) printf 'arm\n' ;; *) die "Unsupported CPU architecture for automatic Java download: $(uname -m)" ;; esac
}

ensure_java() {
    version="$1"; target="${JAVA_ROOT}/temurin-${version}"
    if [ -x "${target}/bin/java" ]; then JAVA_BIN="${target}/bin/java"; JAVA_HOME_SELECTED="$target"; return 0; fi
    if command -v java >/dev/null 2>&1; then
        current="$(java -version 2>&1 | head -n 1 | sed -E 's/.*version "([0-9]+).*/\1/' || true)"
        case "$(java -version 2>&1 | head -n 1)" in *'"1.8.'*) current=8 ;; esac
        if [ "$current" = "$version" ]; then JAVA_BIN="$(command -v java)"; JAVA_HOME_SELECTED="$(dirname "$(dirname "$JAVA_BIN")")"; return 0; fi
    fi
    command -v curl >/dev/null 2>&1 || die "curl is required to download Java automatically."
    command -v tar >/dev/null 2>&1 || die "tar is required to install Java automatically."
    arch="$(detect_arch)"; api="https://api.adoptium.net/v3/binary/latest/${version}/ga/linux/${arch}/jre/hotspot/normal/eclipse"
    mkdir -p "$JAVA_ROOT"
    tmp="${JAVA_ROOT}/.install-java-${version}-$$"; archive="${tmp}.tar.gz"
    rm -rf "$tmp" "$archive"; mkdir -p "$tmp"
    log "Java ${version} is not cached. Downloading Eclipse Temurin JRE (${arch})..."
    if ! curl --fail --location --retry 3 --connect-timeout 20 -A "Pterodactyl-Multi-Profile/2.2.0 (local-server-manager)" -o "$archive" "$api"; then rm -rf "$tmp" "$archive"; die "Failed to download Java ${version} from Adoptium."; fi
    if ! tar -xzf "$archive" -C "$tmp"; then rm -rf "$tmp" "$archive"; die "Failed to extract Java ${version}."; fi
    found="$(find "$tmp" -type f -path '*/bin/java' | head -n 1 || true)"
    [ -n "$found" ] || { rm -rf "$tmp" "$archive"; die "Downloaded Java archive did not contain bin/java."; }
    home="$(dirname "$(dirname "$found")")"
    rm -rf "$target"; mv "$home" "$target"; rm -rf "$tmp" "$archive"
    [ -x "${target}/bin/java" ] || die "Java ${version} installation finished but bin/java is missing."
    JAVA_BIN="${target}/bin/java"; JAVA_HOME_SELECTED="$target"
}

backup_profile() {
    profile="$1"; reason="${2:-manual}"
    valid_profile_name "$profile" || { warn "Skipping backup for invalid profile name '$profile'."; return 0; }
    src="${PROFILE_ROOT}/${profile}"
    [ -d "$src" ] || { warn "Skipping backup; profile no longer exists: $profile"; return 0; }
    keep="$GLOBAL_BACKUP_KEEP"; enabled="$GLOBAL_BACKUP_ON_SWITCH"; exclude_logs="true"; cfg="$src/profile.conf"
    if [ -f "$cfg" ]; then
        while IFS= read -r raw || [ -n "$raw" ]; do
            line="$(printf '%s' "$raw" | tr -d '\r')"
            case "$line" in BACKUP_ON_SWITCH=*) enabled="$(trim_value "${line#*=}")" ;; BACKUP_KEEP=*) keep="$(trim_value "${line#*=}")" ;; BACKUP_EXCLUDE_LOGS=*) exclude_logs="$(trim_value "${line#*=}")" ;; esac
        done < "$cfg"
    fi
    is_true "$enabled" || { log "Backup-on-switch disabled for '$profile'."; return 0; }
    case "$keep" in ''|*[!0-9]*) keep=5 ;; esac
    dest="${BACKUP_ROOT}/${profile}"; mkdir -p "$dest"
    stamp="$(date '+%Y%m%d-%H%M%S')-$$"; out="${dest}/${profile}-${stamp}-${reason}.tar.gz"
    log "Backing up previous profile '$profile' -> $out"
    if is_true "$exclude_logs"; then
        if ! tar -czf "$out" -C "$src" --exclude='./logs' --exclude='./cache' --exclude='./crash-reports' .; then rm -f "$out"; die "Profile backup failed for '$profile'. Refusing to start the next profile."; fi
    else
        if ! tar -czf "$out" -C "$src" .; then rm -f "$out"; die "Profile backup failed for '$profile'. Refusing to start the next profile."; fi
    fi
    if [ "$keep" -eq 0 ]; then return 0; fi
    idx=0
    for f in $(ls -1t "$dest"/*.tar.gz 2>/dev/null || true); do idx=$((idx + 1)); if [ "$idx" -gt "$keep" ]; then rm -f "$f"; fi; done
}

handle_profile_switch_backup() {
    mkdir -p "$STATE_ROOT"
    state_file="${STATE_ROOT}/last_profile"; previous=""
    [ -f "$state_file" ] && previous="$(cat "$state_file" 2>/dev/null | tr -d '\r\n' || true)"
    if [ -n "$previous" ] && [ "$previous" != "$PROFILE" ]; then log "Profile switch detected: $previous -> $PROFILE"; backup_profile "$previous" "switch"; fi
}

save_active_profile_state() { mkdir -p "$STATE_ROOT"; printf '%s\n' "$PROFILE" > "${STATE_ROOT}/last_profile"; }

valid_profile_name "$PROFILE" || { printf '%s\n' "[Multi-Profile] Invalid SERVER_PROFILE '$PROFILE'." >&2; printf '%s\n' "[Multi-Profile] Allowed: Unicode letters/numbers (including Korean), dot, underscore, hyphen. No paths or spaces." >&2; exit 1; }
PROFILE_DIR="${PROFILE_ROOT}/${PROFILE}"
if [ ! -d "$PROFILE_DIR" ]; then printf '%s\n' "[Multi-Profile] ERROR: Profile '$PROFILE' does not exist." >&2; printf '%s\n' "[Multi-Profile] Available profiles:" >&2; list_profiles | sed 's/^/[Multi-Profile]   - /' >&2; exit 1; fi
load_profile_config "$PROFILE_DIR"
if [ "$PROFILE_NAME" = "Unnamed Profile" ] || [ -z "$PROFILE_NAME" ]; then PROFILE_NAME="$PROFILE"; fi
validate_profile_config
cd "$PROFILE_DIR"
detect_server_type
detect_launch_mode
detect_minecraft_version
select_java_version
server_mem="${SERVER_MEMORY:-0}"
case "$server_mem" in ''|*[!0-9]*) server_mem=0 ;; esac
effective_xms_mb="$CFG_XMS_MB"; jvm_xmx_arg=""
if [ "$server_mem" -gt 0 ]; then xmx_mb=$((server_mem * CFG_MEMORY_PERCENT / 100)); [ "$xmx_mb" -ge 64 ] || xmx_mb=64; if [ "$effective_xms_mb" -gt "$xmx_mb" ]; then effective_xms_mb="$xmx_mb"; fi; jvm_xmx_arg="-Xmx${xmx_mb}M"; memory_summary="Xms=${effective_xms_mb}M / Xmx=${xmx_mb}M (${CFG_MEMORY_PERCENT}% of ${server_mem}M allocation)"; else memory_summary="Xms=${effective_xms_mb}M / Xmx=JVM auto (Pterodactyl memory limit: Unlimited)"; fi
printf '%s\n' "============================================================"
log "Profile          : $PROFILE (${PROFILE_NAME})"
log "Server type      : $DETECTED_SERVER_TYPE"
log "Minecraft version: $DETECTED_MINECRAFT_VERSION"
log "Java             : $SELECTED_JAVA_VERSION"
log "Launch mode      : $DETECTED_LAUNCH_MODE"
if [ "$DETECTED_LAUNCH_MODE" = "jar" ]; then log "Server jar       : $DETECTED_SERVER_JAR"; else log "Server script    : $CFG_SERVER_SCRIPT"; fi
log "Primary port     : ${SERVER_PORT}"
log "Memory           : ${memory_summary}"
printf '%s\n' "============================================================"
if is_true "${MULTI_DRY_RUN:-false}"; then log "Dry-run enabled; no files changed, backups created, Java downloaded or server executed."; exit 0; fi
write_default_profile_config_if_missing "$PROFILE_DIR"
handle_profile_switch_backup
set_property "server-ip" "0.0.0.0" "server.properties"
set_property "server-port" "${SERVER_PORT}" "server.properties"
set_property "query.port" "${SERVER_PORT}" "server.properties"
if is_true "$ACCEPT_EULA_VALUE"; then printf 'eula=true\n' > eula.txt; fi
ensure_java "$SELECTED_JAVA_VERSION"
export JAVA_HOME="$JAVA_HOME_SELECTED"
export PATH="${JAVA_HOME_SELECTED}/bin:${PATH}"
log "Using Java binary: $JAVA_BIN"
"$JAVA_BIN" -version
save_active_profile_state
if [ "$DETECTED_LAUNCH_MODE" = "script" ]; then
    # HotSpot reads _JAVA_OPTIONS after script/argfile options, including Java 8.
    # Preserve unrelated inherited options; manager profile options take precedence.
    export _JAVA_OPTIONS="${_JAVA_OPTIONS:+${_JAVA_OPTIONS} }-Xms${effective_xms_mb}M${jvm_xmx_arg:+ ${jvm_xmx_arg}}${CFG_JAVA_ARGS:+ ${CFG_JAVA_ARGS}}"
    log "Script JVM settings are supplied through _JAVA_OPTIONS."
    exec sh "./$CFG_SERVER_SCRIPT" nogui
fi
exec "$JAVA_BIN" -Xms"${effective_xms_mb}"M ${jvm_xmx_arg} ${CFG_JAVA_ARGS} -Dterminal.jline=false -Dterminal.ansi=true -jar "$DETECTED_SERVER_JAR" nogui

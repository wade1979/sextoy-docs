#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${SERVERS_CONFIG_PATH:-/Users/huangwei/projects/servers.config.json}"
SERVER_NAME="${DOC_SERVER_NAME:-doc-server}"
REMOTE_DIR="${DOC_REMOTE_VIDEO_DIR:-/var/www/sextoy-docs/current/videos/guide/}"
LOCAL_DIR="${ROOT_DIR}/static/videos/guide/"

if [[ ! -d "${LOCAL_DIR}" ]]; then
  echo "Local video directory does not exist: ${LOCAL_DIR}" >&2
  exit 1
fi

read -r DOC_HOST DOC_PORT DOC_USER DOC_PASSWORD < <(
  node -e '
    const fs = require("fs");
    const configPath = process.argv[1];
    const serverName = process.argv[2];
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const server = config.servers.find((item) => item.name === serverName);
    if (!server) {
      console.error(`Server not found: ${serverName}`);
      process.exit(1);
    }
    process.stdout.write(`${server.host} ${server.port || 22} ${server.username} ${server.password || ""}\n`);
  ' "${CONFIG_PATH}" "${SERVER_NAME}"
)

export DOC_HOST DOC_PORT DOC_USER DOC_PASSWORD REMOTE_DIR LOCAL_DIR

/usr/bin/expect <<'EXPECT'
set timeout -1
set password $env(DOC_PASSWORD)
set host $env(DOC_HOST)
set port $env(DOC_PORT)
set user $env(DOC_USER)
set remote_dir $env(REMOTE_DIR)

spawn ssh -o StrictHostKeyChecking=no -p $port $user@$host "mkdir -p '$remote_dir'"
expect {
  -re "(?i)password:" { send "$password\r"; exp_continue }
  eof
}
catch wait result
if {[lindex $result 3] != 0} {
  exit [lindex $result 3]
}
EXPECT

/usr/bin/expect <<'EXPECT'
set timeout -1
set password $env(DOC_PASSWORD)
set host $env(DOC_HOST)
set port $env(DOC_PORT)
set user $env(DOC_USER)
set remote_dir $env(REMOTE_DIR)
set local_dir $env(LOCAL_DIR)

spawn rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no -p $port" "$local_dir" "$user@$host:$remote_dir"
expect {
  -re "(?i)password:" { send "$password\r"; exp_continue }
  eof
}
catch wait result
exit [lindex $result 3]
EXPECT

#!/bin/sh
set -eu

TOKEN_FILE=/run/secrets/op_service_account_token
FRYBOT_KEY_FILE=/run/secrets/frybot_api_key

if [ ! -s "$TOKEN_FILE" ]; then
  echo "Missing or empty op service account token file: $TOKEN_FILE" >&2
  exit 1
fi

export OP_SERVICE_ACCOUNT_TOKEN="$(cat "$TOKEN_FILE")"
export OP_CONFIG_DIR=/tmp/op

# Load FRYBOT_API_KEY from secret file if present
# Use --env-file flag to pass it through op run
EXTRA_ENV_ARGS=""
if [ -s "$FRYBOT_KEY_FILE" ]; then
  FRYBOT_API_KEY="$(cat "$FRYBOT_KEY_FILE")"
  export FRYBOT_API_KEY
  # Pass through op run using env
  exec gosu appuser env FRYBOT_API_KEY="$FRYBOT_API_KEY" op run -- "$@"
else
  exec gosu appuser op run -- "$@"
fi

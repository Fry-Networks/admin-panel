#!/bin/bash
# Check if 1Password rate limit has cleared and restart admin_panel

set -e

TOKEN_FILE="/etc/opt/adminpanel/op_service_account_token"
TEST_SECRET="op://AdminPanel/AdminPanel/NEXTAUTH_SECRET"

echo "$(date): Testing 1Password access for admin_panel..."
export OP_SERVICE_ACCOUNT_TOKEN=$(cat "$TOKEN_FILE")

if op read "$TEST_SECRET" >/dev/null 2>&1; then
    echo "$(date): ✓ 1Password rate limit has cleared!"
    echo "Starting admin_panel..."
    cd /home/helpdesk/subdomains/admin_panel
    export MONGO_CA_CERT_PATH=/tmp/mongo-ca.crt
    docker update --restart=unless-stopped admin_panel
    docker compose up -d admin_panel
    sleep 30
    docker ps --filter name=admin_panel --format "table {{.Names}}\t{{.Status}}"
    # Remove this cron job after successful start
    echo "$(date): Removing auto-retry cron job..."
    crontab -l 2>/dev/null | grep -v "admin_panel.*check-and-restart" | crontab -
    echo "$(date): ✓ Auto-retry cron job removed"
else
    echo "$(date): ✗ Still rate limited. Try again later."
    exit 1
fi

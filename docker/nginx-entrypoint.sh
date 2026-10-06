#!/bin/sh
set -eu
DOMAIN="${DOMAIN:?DOMAIN is not set}"
HTTP_CONFIG="/etc/nginx/http.conf"
HTTPS_CONFIG="/etc/nginx/https.conf"
ACTIVE_CONFIG="/etc/nginx/conf.d/default.conf"
CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

configure_http() {
    sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$HTTP_CONFIG" > "$ACTIVE_CONFIG"
    nginx -t
}
configure_https() {
    sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$HTTPS_CONFIG" > "$ACTIVE_CONFIG"
    nginx -t
}

configure_http
nginx -g "daemon off;" &
NGINX_PID=$!

trap 'kill "$NGINX_PID" 2>/dev/null || true; wait "$NGINX_PID" 2>/dev/null || true' INT TERM
LAST_CERT_MTIME=""

while kill -0 "$NGINX_PID" 2>/dev/null; do
    if [ -f "$CERT" ] && [ -f "$KEY" ]; then
        CERT_MTIME=$(stat -c %Y "$CERT" 2>/dev/null || echo "0")
        if [ "$CERT_MTIME" != "$LAST_CERT_MTIME" ]; then
            configure_https
            nginx -s reload
            LAST_CERT_MTIME="$CERT_MTIME"
        fi
    fi
    sleep 30
done
wait "$NGINX_PID"

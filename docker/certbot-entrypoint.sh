#!/bin/sh
set -eu

DOMAIN="${DOMAIN:?DOMAIN is not set}"
EMAIL="${CERTBOT_EMAIL:?CERTBOT_EMAIL is not set}"
CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
WEBROOT="/var/www/certbot"

wait_for_nginx() {
    echo "Waiting for Nginx HTTP endpoint..."
    while ! wget -q -O /dev/null "http://nginx/.well-known/acme-challenge/healthcheck"; do
        sleep 2
    done
    echo "Nginx HTTP endpoint is ready."
}

obtain_certificate() {
    echo "Requesting Let's Encrypt certificate for $DOMAIN..."
    certbot certonly \
        --webroot \
        --webroot-path="$WEBROOT" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d "$DOMAIN"
}

wait_for_nginx

while [ ! -f "$CERT" ]; do
    if obtain_certificate; then
        echo "Certificate obtained successfully."
        break
    fi
    echo "Certificate request failed. Retrying in 30 seconds..."
    sleep 30
done

while true; do
    certbot renew --webroot --webroot-path="$WEBROOT" --quiet || true
    sleep 12h
done

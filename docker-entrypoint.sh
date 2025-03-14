#!/bin/sh
set -e

# Replace environment variables in the config.js template
envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js

# Execute the main container command
exec "$@" 
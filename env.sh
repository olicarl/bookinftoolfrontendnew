#!/bin/sh

# Replace environment variables in the JavaScript files
for file in /usr/share/nginx/html/assets/*.js; do
  sed -i "s|VITE_SUPABASE_URL_PLACEHOLDER|${VITE_SUPABASE_URL}|g" $file
  sed -i "s|VITE_SUPABASE_ANON_KEY_PLACEHOLDER|${VITE_SUPABASE_ANON_KEY}|g" $file
done 
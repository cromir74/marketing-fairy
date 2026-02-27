#!/bin/bash
echo ">>> Starting Deployment..."
git pull origin master
echo "NEXT_PUBLIC_SITE_URL=http://49.50.138.92:3000" >> .env.local
# Remove duplicates if any
sort -u .env.local -o .env.local
npm run build
pm2 restart all
echo ">>> Deployment Complete!"

#!/bin/sh
set -eu

mkdir -p /data

npx prisma migrate deploy --schema backend/prisma/schema.prisma
node --import tsx backend/prisma/seed.ts

exec node backend/dist/server.js

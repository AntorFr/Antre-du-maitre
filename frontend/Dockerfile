FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install
COPY tsconfig.base.json ./
COPY frontend ./frontend
COPY packages/shared ./packages/shared
RUN npm run build --workspace @antre-du-maitre/shared
RUN npm run build --workspace @antre-du-maitre/frontend

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html


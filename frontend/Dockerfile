# Stage 1: Build static bundle
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --prefer-offline || npm install

COPY . .
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:1.25-alpine
WORKDIR /usr/share/nginx/html

# Clean default assets and copy production build
RUN rm -rf ./*
COPY --from=builder /app/dist .

# Copy custom Nginx offline configuration
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /uploads/ { \
        proxy_pass http://api:5000/uploads/; \
    } \
    location /api/ { \
        proxy_pass http://api:5000/api/; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

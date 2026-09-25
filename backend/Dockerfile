FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production --prefer-offline || npm install --production

COPY . .

# Ensure upload directory exists and set permissions
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
EXPOSE 5000

CMD ["node", "src/index.js"]

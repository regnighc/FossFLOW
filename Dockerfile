# Build stage: compile frontend
FROM node:24 AS build

WORKDIR /app

COPY package*.json ./
COPY packages/fossflow-lib/package*.json ./packages/fossflow-lib/
COPY packages/fossflow-app/package*.json ./packages/fossflow-app/
COPY packages/fossflow-backend/package*.json ./packages/fossflow-backend/

RUN npm install

COPY . .

RUN npm run build:lib && npm run build:app

# Runtime stage
FROM node:24-alpine

# Web server and utilities
RUN apk add --no-cache nginx openssl su-exec

# Copy backend source
COPY --from=build /app/packages/fossflow-backend /app/packages/fossflow-backend

WORKDIR /app/packages/fossflow-backend

# Install backend deps (pure JS — no native compilation needed)
RUN npm install --omit=dev

# Copy the built React app to nginx document root
COPY --from=build /app/packages/fossflow-app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create data directory
RUN mkdir -p /data/diagrams

EXPOSE 80 3001

ENV ENABLE_SERVER_STORAGE=true
ENV STORAGE_PATH=/data/diagrams
ENV BACKEND_PORT=3001

ENTRYPOINT ["/docker-entrypoint.sh"]

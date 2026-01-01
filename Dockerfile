FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --frozen-lockfile

COPY frontend/ .

# --- PUBLIC CONFIGURATION ---
# The browser will ALWAYS try to hit the local proxy
ENV NEXT_PUBLIC_API_BASE_URL="/api-proxy"

# Firebase Keys (Safe to expose)
ENV NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAbVS9JiCsDTbhmmq2zJL2QR8SrStblg90"
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="promptforge-c27e8.firebaseapp.com"
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID="promptforge-c27e8"
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="promptforge-c27e8.firebasestorage.app"
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1098334131721"
ENV NEXT_PUBLIC_FIREBASE_APP_ID="1:1098334131721:web:4090937731a3f92505cad8"
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID="1098334131721-97g5v0l4ss5cjdjsps1ok4shufilopvs.apps.googleusercontent.com"

# Build Bypasses
ENV NEXT_IGNORE_TYPECHECK=1
ENV NEXT_IGNORE_ESLINT=1

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
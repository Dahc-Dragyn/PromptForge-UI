# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
    FROM node:20-alpine AS builder

    WORKDIR /app
    
    # Copy package files
    COPY frontend/package.json frontend/package-lock.json* ./
    RUN npm ci --frozen-lockfile
    
    # Copy source
    COPY frontend/ .
    
    # --- THIS IS THE FIX ---
    # Provide the PUBLIC Firebase/API keys to the build stage.
    # 'next build' needs these to pre-render static pages.
    ENV NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAbVS9JiCsDTbhmmq2zJL2QR8SrStblg90"
    ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="promptforge-c27e8.firebaseapp.com"
    ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID="promptforge-c27e8"
    ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="promptforge-c27e8.firebasestorage.app"
    ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1098334131721"
    ENV NEXT_PUBLIC_FIREBASE_APP_ID="1:1098334131721:web:4090937731a3f92505cad8"
    ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID="1098334131721-97g5v0l4ss5cjdjsps1ok4shufilopvs.apps.googleusercontent.com"
    ENV NEXT_PUBLIC_API_BASE_URL="/api-proxy"
    ENV NEXT_PUBLIC_BACKEND_API_URL="https://db4f-24-22-90-227.ngrok-free.app"
    # --- END OF FIX ---
    
    # Your existing bypasses:
    ENV NEXT_IGNORE_TYPECHECK=1
    ENV NEXT_IGNORE_ESLINT=1
    
    # Build without type or lint errors blocking
    RUN npm run build
    
    # -----------------------------------------------------------------------------
    # Stage 2: Runner (Next.js Standalone)
    # -----------------------------------------------------------------------------
    FROM node:20-alpine AS runner
    
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV PORT=3000
    
    # Copy standalone output (includes server.js + minimal node_modules)
    COPY --from=builder /app/.next/standalone ./
    
    # Copy static assets
    COPY --from=builder /app/.next/static ./.next/static
    COPY --from=builder /app/public ./public
    
    # Expose port
    EXPOSE 3000
    
    # Healthcheck (from your file)
    HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
      CMD node -e "require('http').get('http://localhost:3000/api/health' in process.env ? '/api/health' : '/', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1
    
    # Start the app
    CMD ["node", "server.js"]
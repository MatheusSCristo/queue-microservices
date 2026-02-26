FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx esbuild src/index.ts --bundle --platform=node --target=node20 --outfile=dist/index.js --format=cjs

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist/index.js ./index.js
COPY --from=builder /app/node_modules ./node_modules
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
USER appuser
EXPOSE 3001
CMD ["node", "index.js"]

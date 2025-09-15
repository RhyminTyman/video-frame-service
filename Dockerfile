# Build
FROM node:20-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./
RUN corepack enable && corepack prepare pnpm@latest --activate || true
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile;     elif [ -f package-lock.json ]; then npm ci;     else pnpm install; fi
COPY tsconfig.json ./
COPY src ./src
RUN npm run build || pnpm build

# Runtime
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 3001
CMD ["node", "--enable-source-maps", "dist/server.js"]

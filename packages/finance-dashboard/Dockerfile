# Stage 1: Install dependencies
FROM node:22-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/finance-dashboard/package.json ./packages/finance-dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter finance-dashboard

# Stage 2: Build the application
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/finance-dashboard/node_modules ./packages/finance-dashboard/node_modules

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy source code
COPY packages/finance-dashboard ./packages/finance-dashboard

WORKDIR /app/packages/finance-dashboard

# Build argument for API URL (baked into client bundle)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the application
RUN pnpm build

# Stage 3: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/packages/finance-dashboard/.next/standalone ./
COPY --from=builder /app/packages/finance-dashboard/.next/static ./packages/finance-dashboard/.next/static
COPY --from=builder /app/packages/finance-dashboard/public ./packages/finance-dashboard/public

# Set correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application
CMD ["node", "packages/finance-dashboard/server.js"]

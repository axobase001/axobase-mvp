FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build
RUN npm run build

# Create logs directory
RUN mkdir -p logs snapshots

EXPOSE 3000

CMD ["node", "dist/index.js"]

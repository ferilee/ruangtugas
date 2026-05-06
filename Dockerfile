# Use the official Bun image
FROM oven/bun:1.1.20-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Expose the port
EXPOSE 2003

# Run the application
CMD ["bun", "run", "start"]

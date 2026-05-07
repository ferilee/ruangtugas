# Use Bun version aligned with the lockfile generated in this repo
FROM oven/bun:1.3-slim AS base
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

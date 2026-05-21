# Stage 1: Python builder to produce resources/index.usearch and labels.bin
FROM python:3.11-slim AS py-builder
WORKDIR /build
COPY . .
# Install minimal dependencies required to run scripts/build_index.py inside the builder
RUN pip install --no-cache-dir numpy usearch || true
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt || true; fi
RUN if [ -f scripts/build_index.py ]; then python scripts/build_index.py; fi

# Stage 2: Bun builder for app deps
FROM oven/bun:1 AS bun-builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN if [ -f package.json ] && grep -q "build" package.json; then bun run build || true; fi

# Stage 3: runtime image with index copied in
FROM oven/bun:1 AS runtime
WORKDIR /app
COPY --from=bun-builder /app .
COPY --from=py-builder /build/resources ./resources
ENV PORT=9999
EXPOSE 9999
CMD ["bun", "run", "src/index.ts"]

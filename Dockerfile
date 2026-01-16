FROM popwers/mini-bun:v1.3.1 AS builder
WORKDIR /app

COPY package.json ./
RUN bun install

COPY . ./
RUN bun build ./src/index.ts --outdir build --target bun

# ----------------------------

FROM popwers/mini-bun:v1.3.1
WORKDIR /app

COPY --from=builder /app/build ./build

CMD ["bun", "build/index.js"]

# Jaanch — aiKart sandbox image (Method 1) and self-hostable API (Method 2)
# Build:  docker build -t jaanch:1.0.0 .
# Sandbox run:  docker run --rm -v "$PWD/examples/aikart:/aikart" jaanch:1.0.0
# API run:      docker run --rm -p 3000:3000 -e GROQ_API_KEY=... jaanch:1.0.0 npm start
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
# Models (open weights on Groq). GROQ_API_KEY is optional: without it the sandbox runner delegates to the hosted API.
ENV VISION_MODEL=qwen/qwen3.8-27b TEXT_MODEL=openai/gpt-oss-120b HELPER_MODEL=openai/gpt-oss-20b AI_PROVIDER=groq
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY package.json next.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
COPY sandbox ./sandbox
RUN mkdir -p /aikart && chmod 777 /aikart
EXPOSE 3000
# Method 1: aiKart sandbox contract (reads /aikart/input.json, writes /aikart/output.json)
CMD ["node", "--import", "tsx", "sandbox/run.ts"]

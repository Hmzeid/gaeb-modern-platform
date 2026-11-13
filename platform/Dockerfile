FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
COPY assets ./assets
COPY tests/testvectors.json tests/codepage_vectors.json ./tests/
RUN npm install --no-save typescript@5.6.2 @types/node @types/express @types/pg && npx tsc -p tsconfig.json && cp -r src/codepages dist/src/ && npm prune --omit=dev
EXPOSE 8080
CMD ["node", "dist/src/server.js"]

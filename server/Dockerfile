FROM node:20-alpine

WORKDIR /app

# Chromium for PDF export (puppeteer-core). @sparticuz/chromium only runs on Render/Vercel/Lambda,
# so in this container pdf.js uses the system Chromium via PUPPETEER_EXECUTABLE_PATH.
RUN apk add --no-cache chromium nss freetype harfbuzz ttf-freefont font-noto
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

COPY . .

RUN mkdir -p uploads

EXPOSE 5004

CMD ["node", "src/index.js"]

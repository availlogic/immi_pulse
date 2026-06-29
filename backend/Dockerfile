FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
EXPOSE 3000
CMD ["node", "--import", "tsx", "src/server.ts"]
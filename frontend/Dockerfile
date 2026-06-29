FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY tests ./tests
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
FROM docker.io/library/node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --no-fund --no-audit

COPY app.js ./

EXPOSE 3001

CMD ["node", "app.js"]
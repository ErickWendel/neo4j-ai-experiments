from node:22-alpine

ADD . /app

WORKDIR /app

RUN npm ci --only=production

CMD npm start
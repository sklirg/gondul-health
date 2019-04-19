FROM node:alpine

EXPOSE 3000

RUN mkdir /app
WORKDIR /app

COPY yarn.lock .
COPY package.json .
RUN yarn

COPY . .

CMD ["node", "--experimental-modules", "server.mjs"]

FROM node:19-alpine

WORKDIR /app

ENV NODE_ENV=production
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --production

COPY . .

RUN mkdir -p /app/public

EXPOSE 8885

CMD [ "node", "index.js" ]

 
FROM node:alpine

WORKDIR /app
COPY . /app

RUN npm install && npm run build

VOLUME /app/data

EXPOSE 3000

CMD ["npm", "run", "start"]


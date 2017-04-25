 
FROM node:alpine

WORKDIR /var/lib/app
ADD . /var/lib/app
VOLUME /var/lib/app/data

RUN npm install && npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]


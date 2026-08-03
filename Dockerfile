FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY src ./src

ENV PORT=5001
EXPOSE 5001

CMD ["npm", "start"]

FROM node:16
WORKDIR /usr/src/real-nft
COPY package*.json ./
RUN npm install
COPY ./src ./src
COPY ./views ./views
EXPOSE 8080
CMD [ "npx", "ts-node", "src/index.ts" ]

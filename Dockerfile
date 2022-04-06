FROM node:16-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# RUN npm ci
RUN npm install

COPY . .

EXPOSE 8000

CMD ["npm", "run", "start"];
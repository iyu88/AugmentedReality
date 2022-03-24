# Start Project Settings

## 1. Pull Project

- git remote add origin https://github.com/iyu88/AugmentedReality.git

## 2. NPM Dependencies

- npm init -y
- npm install express nodemon three

## 3. Dockerfile

```
FROM node:16-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . ./

ENTRYPOINT ["npm", "start"]
```

## 4. Build Image

- docker pull `OLD_IMAGE_NAME:TAG`
- docker push `NEW_IMAGE_NAME:TAG`
- docker build -f Dockerfile -t `IMAGE_NAME:TAG` .
- docker run -d -p 8000:8000 --name `CONTAINER_NAME` -v ${PWD}:/app `IMAGE_NAME:TAG`

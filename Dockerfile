# node version
FROM node:10.12.0-alpine

# install build dependencies for some node module to be able to be built natively.
# --no-cache: download package index on-the-fly, no need to cleanup afterwards
# --virtual: bundle packages, remove whole bundle at once, when done
RUN apk add --no-cache --virtual .gyp python make g++

# create and set /app directory as default working directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# install npm packages
RUN npm install --only=production && npm cache clean --force

# delete build dependencies
RUN apk del .gyp

# copy source files
COPY . .

# expose port 3000
EXPOSE 8080

# cmd to start service
CMD [ "node", "src/index.js" ]

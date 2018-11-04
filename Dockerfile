# node version
FROM node:10.12.0-alpine

# create and set /app directory as default working directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# install npm packages
RUN npm install --only=production && npm cache clean --force

# copy source files
COPY . .

# expose port 3000
EXPOSE 3000

# cmd to start service
CMD [ "node", "src/index.js" ]

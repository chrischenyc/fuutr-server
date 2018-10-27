# node version
FROM node:10-alpine

# create app directory in container
RUN mkdir -p /app

# set /app directory as default working directory
WORKDIR /app

# copy source files
COPY . .

# install npm packages
RUN npm install

# expose port 3000
EXPOSE 3000

# cmd to start service
CMD [ "node", "index.js" ]

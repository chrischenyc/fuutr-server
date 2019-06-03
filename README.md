# About

- Node.js back-end: https://github.com/chrischenyc/fuutr-server
- React admin portal: https://github.com/chrischenyc/fuutr-admin-web
- iOS rider app: https://github.com/chrischenyc/fuutr-rider-app-ios

## System Architecture

![System Architecture](https://www.capturedlabs.com/fuutr-architecture.png)

## Overview

This is a Node.js application using ES6 and Express with Code Coverage and JWT Authentication.

### Features

| Feature                                                                                             | Summary                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ES6 via Babel                                                                                       | ES6 support using [Babel](https://babeljs.io/).                                                                                                                                                                                                                                                                                                                             |
| Authentication via JsonWebToken                                                                     | Supports authentication using [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken).                                                                                                                                                                                                                                                                                   |
| Code Linting                                                                                        | JavaScript code linting is done using [ESLint](http://eslint.org) - a pluggable linter tool for identifying and reporting on patterns in JavaScript. Uses ESLint with [eslint-config-airbnb](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb), which tries to follow the Airbnb JavaScript style guide.                                      |
| Auto server restart                                                                                 | Restart the server using [nodemon](https://github.com/remy/nodemon) in real-time anytime an edit is made, with babel compilation and eslint.                                                                                                                                                                                                                                |
| ES6 Code Coverage via [istanbul](https://www.npmjs.com/package/istanbul)                            | Supports code coverage of ES6 code using istanbul and mocha. Code coverage reports are saved in `coverage/` directory post `yarn test` execution. Open `coverage/lcov-report/index.html` to view coverage report. `yarn test` also displays code coverage summary on console. Code coverage can also be enforced overall and per file as well, configured via .istanbul.yml |
| Debugging via [debug](https://www.npmjs.com/package/debug)                                          | Instead of inserting and deleting console.log you can replace it with the debug function and just leave it there. You can then selectively debug portions of your code by setting DEBUG env variable. If DEBUG env variable is not set, nothing is displayed to the console.                                                                                                |
| Promisified Code via [bluebird](https://github.com/petkaantonov/bluebird)                           | We love promise, don't we ? All our code is promisified and even so our tests via [supertest-as-promised](https://www.npmjs.com/package/supertest-as-promised).                                                                                                                                                                                                             |
| API parameter validation via [express-validation](https://www.npmjs.com/package/express-validation) | Validate body, params, query, headers and cookies of a request (via middleware) and return a response with errors; if any of the configured validation rules fail. You won't anymore need to make your route handler dirty with such validations.                                                                                                                           |
| Pre-commit hooks                                                                                    | Runs lint and tests before any commit is made locally, making sure that only tested and quality code is committed                                                                                                                                                                                                                                                           |
| Secure app via [helmet](https://github.com/helmetjs/helmet)                                         | Helmet helps secure Express apps by setting various HTTP headers.                                                                                                                                                                                                                                                                                                           |
| CORS support via [cors](https://github.com/expressjs/cors)                                          |                                                                                                                                                                                                                                                                                                                                                                             |
| [http-status](https://www.npmjs.com/package/http-status)                                            | to set http status code. It is recommended to use `httpStatus.INTERNAL_SERVER_ERROR` instead of directly using `500` when setting status code.                                                                                                                                                                                                                              |
| `.editorconfig`                                                                                     | helps developers define and maintain consistent coding styles between different editors and IDEs.                                                                                                                                                                                                                                                                           |

## Getting Started

Install MongoDB database on local machine:

```sh
brew install mongodb@4.0.3
```

Install dependencies:

```sh
npm install
```

Start a local server:

```sh
# Start a local server
npm run start

# Start a local server with debug output
npm run start:debug

# verify local server
http://localhost:3000/api/health-check
```

## Docker

#### Using Docker Compose for Development

```sh
# open up a local development system
docker-compose -f "docker-compose.yml" up -d --build
# shut down the local development system
docker-compose -f "docker-compose.yml" down
```

## Deploy

Build Docker images for staging or production

Attach and push Docker image to AWS ECR

Define ECS task

Run ECS task to spawn EC2 instance

Whitelist EC2 instance's IP address on MongoDB Atlas

Re-launch EC2 instance

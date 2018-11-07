const Joi = require('joi');

// require and configure dotenv, will load vars in .env into PROCESS.ENV and validate them
require('dotenv').config();

// define validation for all the env vars
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .allow(['development', 'production', 'staging'])
    .default('development'),
  PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string()
    .required()
    .description('JWT Secret required to sign'),
  MONGO_URI: Joi.string()
    .required()
    .description('Mongo DB host url'),
  TWILIO_API_KEY: Joi.string()
    .required()
    .description('Twilio app api key'),
})
  .unknown()
  .required();

const { error } = Joi.validate(process.env, envVarsSchema);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

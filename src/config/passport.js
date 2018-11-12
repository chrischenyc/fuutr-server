const passport = require('passport');
const FacebookTokenStrategy = require('passport-facebook-token');
const _ = require('lodash');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const User = require('../models/user');
const { sendWelcomeEmail } = require('../helpers/send-email');

passport.use(
  new FacebookTokenStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
    },
    async (accessToken, refreshToken, profile, done) => {
      const {
        id: facebookId, displayName, emails, photos,
      } = profile;

      const email = emails && emails[0] && emails[0].value;
      const photo = photos && photos[0] && photos[0].value;

      try {
        // match existing users with same facebook id or email
        const existingUser = await User.findOne({ $or: [{ facebookId }, { email }] }).exec();
        if (existingUser) {
          // merge facebook profile into existing User record if necessary
          if (_.isNil(existingUser.facebookId)) {
            existingUser.facebookId = facebookId;
          }
          if (_.isNil(existingUser.displayName)) {
            existingUser.displayName = displayName;
          }
          if (_.isNil(existingUser.photo)) {
            existingUser.photo = photo;
          }

          await existingUser.save();

          return done(null, existingUser);
        }

        // create new user and Stripe customer
        const stripeCustomer = await stripe.customers.create({ email });
        if (stripeCustomer) {
          const user = new User({
            facebookId,
            email,
            displayName,
            photo,
            stripeCustomerId: stripeCustomer.id,
          });
          await user.save();

          sendWelcomeEmail(email);
          done(null, user);
        }
      } catch (err) {
        done(err, null);
      }
    }
  )
);

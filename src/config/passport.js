const passport = require('passport');
const FacebookTokenStrategy = require('passport-facebook-token');
const _ = require('lodash');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const User = require('../models/user');

passport.use(
  new FacebookTokenStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
    },
    (accessToken, refreshToken, profile, done) => {
      const {
        id: facebookId, displayName, emails, photos,
      } = profile;

      const email = emails && emails[0] && emails[0].value;
      const photo = photos && photos[0] && photos[0].value;

      // try to match with facebook id
      User.findOne({ $or: [{ facebookId }, { email }] })
        .exec()
        .then((existingUser) => {
          if (existingUser) {
            // merge facebook profile into existing User record if necessary
            existingUser.facebookId = _.isNil(existingUser.facebookId) && facebookId;
            existingUser.displayName = _.isNil(existingUser.displayName) && displayName;
            existingUser.photo = _.isNil(existingUser.photo) && photo;
            existingUser.save();

            return done(null, existingUser);
          }

          // create stripe customer first
          return stripe.customers.create({ email });
        })
        .then((stripeCustomer) => {
          if (stripeCustomer) {
            const user = new User({
              facebookId,
              email,
              displayName,
              photo,
              stripeCustomerId: stripeCustomer.id,
            });

            user.save().then((newUser) => {
              done(null, newUser);
            });
          }
        })
        .catch((err) => {
          done(err, null);
        });
    }
  )
);

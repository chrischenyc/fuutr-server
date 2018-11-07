const passport = require('passport');
const FacebookTokenStrategy = require('passport-facebook-token');
const _ = require('lodash');

const User = require('../models/user');

passport.use(
  new FacebookTokenStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
    },
    (accessToken, refreshToken, profile, done) => {
      console.log(profile);

      const {
        id: facebookId, displayName, name, emails, photos,
      } = profile;

      const email = emails && emails[0] && emails[0].value;
      const photo = photos && photos[0] && photos[0].value;

      // try to match with facebook id
      User.findOne({ facebookId })
        .exec()
        .then(
          userWithSameId => new Promise((resolve, reject) => {
            if (userWithSameId) {
              resolve(userWithSameId);
            } else if (!_.isNil(email)) {
              // try to match with facebook email
              User.findOne({ email }).then((userWithSameEmail) => {
                if (userWithSameEmail) {
                  resolve(userWithSameEmail);
                } else {
                  // don't even have an email, create a new user
                  const user = new User({ facebookId, email });
                  user.save().then((newUser) => {
                    resolve(newUser);
                  });
                }
              });
            } else {
              // can't match with facebook id and have no email to match, create a new user
              const user = new User({ facebookId, email });
              user.save().then((newUser) => {
                resolve(newUser);
              });
            }
          })
        )
        .then((user) => {
          if (user) {
            done(null, user);
          }
        })
        .catch((err) => {
          done(err, null);
        });
    }
  )
);

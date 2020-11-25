import * as passwordless from 'passwordless';

import sendEmail from './aws-ses';
import getEmailTemplate from './models/EmailTemplate';
import User from './models/User';
import Invitation from './models/Invitation';

import PasswordlessMongoStore from './passwordless-token-mongostore';

function setupPasswordless({ server }) {
  const mongoStore = new PasswordlessMongoStore();

  passwordless.addDelivery(async (tokenToSend, uidToSend, recipient, callback) => {
    try {
      const template = await getEmailTemplate('login', {
        loginURL: `${
          process.env.URL_API
        }/auth/logged_in?token=${tokenToSend}&uid=${encodeURIComponent(uidToSend)}`,
      });

      await sendEmail({
        from: `Kelly from saas-app.builderbook.org <${process.env.EMAIL_SUPPORT_FROM_ADDRESS}>`,
        to: [recipient],
        subject: template.subject,
        body: template.message,
      });

      callback();
    } catch (err) {
      console.error('Email sending error:', err);
      callback(err);
    }
  });

  passwordless.init(mongoStore);
  server.use(passwordless.sessionSupport());

  server.use((req, __, next) => {
    if (req.user && typeof req.user === 'string') {
      User.findById(req.user, User.publicFields(), (err, user) => {
        req.user = user;
        console.log('passwordless middleware');
        next(err);
      });
    } else {
      next();
    }
  });

  server.post(
    '/auth/email-login-link',
    passwordless.requestToken(async (email, __, callback) => {
      try {
        const user = await User.findOne({ email })
          .select('_id')
          .setOptions({ lean: true });

        if (user) {
          callback(null, user._id);
        } else {
          const id = await mongoStore.storeOrUpdateByEmail(email);
          callback(null, id);
        }
      } catch (error) {
        callback(error, null);
      }
    }),
    (req, res) => {
      if (req.query && req.query.invitationToken) {
        req.session.invitationToken = req.query.invitationToken;
      } else {
        req.session.invitationToken = null;
      }

      res.json({ done: 1 });
    },
  );

  server.get(
    '/auth/logged_in',
    passwordless.acceptToken(),
    (req, __, next) => {
      if (req.user && typeof req.user === 'string') {
        User.findById(req.user, User.publicFields(), (err, user) => {
          req.user = user;
          next(err);
        });
      } else {
        next();
      }
    },
    (req, res) => {
      if (req.user && req.session.invitationToken) {
        Invitation.addUserToTeam({
          token: req.session.invitationToken,
          user: req.user,
        }).catch((err) => console.error(err));

        req.session.invitationToken = null;
      }

      let redirectUrlAfterLogin;

      if (req.user && !req.user.defaultTeamSlug) {
        redirectUrlAfterLogin = '/create-team';
      } else {
        redirectUrlAfterLogin = `/your-settings`;
      }

      res.redirect(`${process.env.URL_APP}${redirectUrlAfterLogin}`);
    },
  );

  server.get('/logout', passwordless.logout(), (req, res) => {
    req.logout();
    res.redirect(`${process.env.URL_APP}/login`);
  });
}

export { setupPasswordless };
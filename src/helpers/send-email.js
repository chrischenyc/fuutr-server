const SendGridMail = require('@sendgrid/mail');
const htmlToText = require('html-to-text');

SendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = (to, subject, html) => {
  const msg = {
    to,
    from: process.env.APP_SENDER_EMAIL,
    subject,
    text: htmlToText.fromString(html, { wordwrap: 130 }),
    html,
  };

  SendGridMail.send(msg);
};

exports.sendWelcomeEmail = (to) => {
  sendEmail(to, `Welcome to ${process.env.APP_NAME}`, '<p>Hi, thanks for joining!</p>');
};

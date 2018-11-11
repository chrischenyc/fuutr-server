const SendGridMail = require('@sendgrid/mail');
const htmlToText = require('html-to-text');

SendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

const getPrivateFile = require('./get-private-file');
const templateToHTML = require('./template-to-html');
const logger = require('./logger');

const sendEmail = (to, subject, template, templateConstants) => {
  try {
    const templateFile = getPrivateFile(`/src/templates/${template}.html`);
    const html = templateToHTML(templateFile, templateConstants || {});
    const msg = {
      to,
      from: process.env.APP_SENDER_EMAIL,
      subject,
      text: htmlToText.fromString(html, { wordwrap: 130 }),
      html,
    };

    SendGridMail.send(msg);
  } catch (error) {
    logger.error(error);
  }
};

exports.sendWelcomeEmail = (to) => {
  sendEmail(to, `Welcome to ${process.env.APP_NAME}`, 'welcome');
};

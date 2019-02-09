const SendGridMail = require('@sendgrid/mail');
const htmlToText = require('html-to-text');

SendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

const getPrivateFile = require('./get-private-file');
const templateToHTML = require('./template-to-html');
const logger = require('./logger');

const {
  APP_NAME,
  APP_COMPANY,
  APP_SENDER_EMAIL,
  APP_SUPPORT_EMAIL,
  APP_WEB,
  APP_TWITTER_URL,
  APP_FACEBOOK_URL,
  APP_INSTAGRAM_URL,
} = process.env;

let commonConstants = {
  APP_NAME,
  APP_COMPANY,
  APP_SENDER_EMAIL,
  APP_SUPPORT_EMAIL,
  APP_WEB,
  APP_TWITTER_URL,
  APP_FACEBOOK_URL,
  APP_INSTAGRAM_URL,
};

commonConstants = {
  ...commonConstants,
  footer: templateToHTML(getPrivateFile('/src/templates/footer.html'), commonConstants),
};

const sendEmail = (to, subject, template, templateConstants) => {
  try {
    const templateFile = getPrivateFile(`/src/templates/${template}.html`);
    const html = templateToHTML(templateFile, {
      ...commonConstants,
      title: subject,
      ...(templateConstants || {}),
    });
    const msg = {
      to,
      from: { email: APP_SENDER_EMAIL, name: APP_NAME },
      subject,
      text: htmlToText.fromString(html, { wordwrap: 130 }),
      html,
    };

    SendGridMail.send(msg);
  } catch (error) {
    logger.error(JSON.stringify(error));
  }
};

exports.sendWelcomeEmail = (to) => {
  sendEmail(to, `Welcome to ${process.env.APP_NAME}`, 'welcome');
};

exports.sendPasswordResetCodeEmail = (to, code) => {
  sendEmail(to, 'Your password reset code', 'password-reset-code', { code });
};

exports.sendInvoiceEmail = (to, invoiceNumber, items, total, date) => {
  sendEmail(to, `Your invoice ${invoiceNumber}`, 'template-billing', {
    invoiceNumber,
    items,
    total,
    date,
  });
};

exports.sendNewContactEmail = (to, name, phone, email, message) => {
  sendEmail(to, `${name} sent a contact form`, 'admin-new-contact-form', {
    name,
    phone,
    email,
    message,
  });
};

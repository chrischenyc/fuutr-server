const handlebars = require('handlebars');
const juice = require('juice');

const templateToHtml = (handlebarsMarkup, context, options) => {
  if (handlebarsMarkup && context) {
    // Use handlebars to compile to HTML
    const template = handlebars.compile(handlebarsMarkup);

    // Use juice to inline CSS <style></style> styles from <head> unless disabled.
    return options && !options.inlineCss ? template(context) : juice(template(context));
  }

  throw new Error(
    'Please pass Handlebars markup to compile and a context object with data mapping to the Handlebars expressions used in your template.'
  );
};

module.exports = templateToHtml;

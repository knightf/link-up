var util = require('./utils.js');
var logger = require('./logger.js');

var linkLayers = require('./link.js');

function handler(isDirect, context) {
  logger.setLogger(context.document.showMessage);

  if (!util.preReq(context)) {
    logger.info('Please select 2 artboards.');
    return false;
  }

  try {
    linkLayers(isDirect, context);
  } catch(e) {
    logger.log(e.message);
  }
}

self.onDirectLink = function(context) {
  handler(true, context);
};

self.onSmartLink = function(context) {
  handler(false, context);
};


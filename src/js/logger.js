function logStr(str) {
  return str;
}

var logger = {
  log: function(str) {
    if (process.env.NODE_ENV == 'dev'){
      logger.logfunc(str.toString());
    }
  },
  info: function(str) {
    logger.logfunc(str.toString());
  },
  logfunc: logStr,
  setLogger: function(func) {
    logger.logfunc = func;
  },
};

module.exports = logger;



const auth = require('basic-auth');
const logger = require('firebase-functions/lib/logger');

global.authBasic = function (req, res, basicauthors) {
  let user = auth(req);
  if (user === undefined || false == (basicauthors[user['name']] && user['pass'] == basicauthors[user['name']])) {
    res.setHeader('WWW-Authenticate', 'Basic realm="AuthBasic"');
    return false;
  }
  return true;
};

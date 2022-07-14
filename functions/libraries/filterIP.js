
const requestIP = require('request-ip');
const ipRangeCheck = require('ip-range-check');
const is = require('is_js');

global.filterIP = function (request, allowIPs) {
  if (!allowIPs || 0 == allowIPs.length) {
    // IP指定無しはtrue
    return true;
  }
  const clientIP = is.ip(request.headers['fastly-client-ip']) ? request.headers['fastly-client-ip'] : requestIP.getClientIp(request);
  console.log('getClientIp=' + requestIP.getClientIp(request));
  console.log('clientIP=' + clientIP);
  if (null == clientIP) {
    // XXX 一旦IPなしはローカルホストとしてtrueとする
    return true;
  }
  return ipRangeCheck(clientIP, allowIPs);
};

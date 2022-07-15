
const request = require('request');

global.notifyLine = async function (argtoken, argmessage) {
  const options = {
    url: 'https://notify-api.line.me/api/notify',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Bearer ${argtoken}` },
    form: { message: '\n' + argmessage },
    json: true,
  };
  const res = await new Promise (function (resolve) {
    request(options, function (error, response, body) {
      //console.log('response=', response);
      if (response.statusCode == 200) {
        resolve(body);
      }
      else {
        resolve(error);
      }
    });
  });
  console.log('notify res=', res);
  return res;
};

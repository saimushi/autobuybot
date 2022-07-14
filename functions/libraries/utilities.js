
// Dateライブラリを利用する
require('date-utils');
var AES = require("crypto-js/aes");
var CryptoJS = require("crypto-js");

global.util = require('util');

// Firebaseの初期化
global.functions = require('firebase-functions');

// 外部ライブラリ
global.url = require('url');

const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const cors = require('cors')({origin: true});
// Using Gmail
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: global.mastermailaddr,
        pass: global.mastermailpass
    }
});
global.sendmail = async function (to, subject, msg) {
  if (false === global.production) {
    subject = '【テスト配信】' + subject;
  }
  let mailOptions = {
    from: global.mastermailaddr,
    to: to,
    subject: subject,
  };
  if (0 < to.indexOf('@softbank.ne.jp') || 0 < to.indexOf('@vodafone.ne.jp') || 0 < to.indexOf('@docomo.ne.jp') || 0 < to.indexOf('@ezweb.ne.jp') || 0 < to.indexOf('@au.com')) {
    mailOptions.text = `${msg}`;
  }
  else {
    msg = msg.replace(/\n/g, '<br/>');
    msg = msg.replace(/((?<!href="|href='|src="|src=')(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, '<a href="$1">$1</a>');
    mailOptions.html = `${msg}`;
  }

  console.log('mailOptions=', mailOptions);
  let sended = false;
  if ('string' == typeof global.sendgridAPIKey && 0 < global.sendgridAPIKey.length) {
    // SendGridでメール送信
    sgMail.setApiKey(global.sendgridAPIKey);
    sended = await sgMail.send(mailOptions);
  }
  else {
    // Gmailでメール送信
    sended = await (() => new Promise(function(resolve) {
      transporter.sendMail(mailOptions, (error, info) => {
        if(error){
          console.log('send erro=', error);
          console.log('send info=', info);
          resolve(false);
        }
        resolve(true);
      });
    }))();
  }
  console.log('sended=', sended);
  return sended;
};

global.SHA256 = function (plaintxt) {
  return CryptoJS.enc.Hex.stringify(CryptoJS.SHA256(plaintxt));
}

global.encryptAESToUTF8Base64 = function (plaintxt, key, iv) {
  if (true != ('string' == typeof key && 16 <= key.length)) {
    key = global.aeskey;
  }
  if (true != ('string' == typeof iv && 16 <= iv.length)) {
    iv = global.aesiv;
  }
  console.log('key=', key);
  console.log('iv=', iv);
  var _key = CryptoJS.enc.Base64.parse(key);
  var _iv = CryptoJS.enc.Base64.parse(iv);
  var encryptdata = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plaintxt), _key, {iv: _iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return encryptdata.ciphertext.toString(CryptoJS.enc.Base64);
};

global.decryptAESFromUTF8Base64 = function (encryptBase64Str, key, iv) {
  if (true != ('string' == typeof key && 16 <= key.length)) {
    key = global.aeskey;
  }
  if (true != ('string' == typeof iv && 16 <= iv.length)) {
    iv = global.aesiv;
  }
  console.log('key=', key);
  console.log('iv=', iv);
  var _key = CryptoJS.enc.Base64.parse(key);
  var _iv = CryptoJS.enc.Base64.parse(iv);
  var encryptdata = CryptoJS.enc.Base64.parse(encryptBase64Str);
  var decryptdata = CryptoJS.AES.decrypt({ciphertext:encryptdata}, _key, {iv: _iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  return decryptdata.toString(CryptoJS.enc.Utf8);
};

global.heredoc = function (cb) {
  return cb.toString().split(/\n/).slice(1, -1).join('\n');
};

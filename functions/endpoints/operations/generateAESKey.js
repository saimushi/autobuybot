
var AES = require("crypto-js/aes");
var CryptoJS = require("crypto-js");

module.exports = functions.region('asia-northeast1').https.onRequest(async (request, response) => {

  if (request.headers.host != 'localhost:5001') {
    return response.status(403).end('access error');
  }

  //var _key = CryptoJS.PBKDF2('ユニークなKeyの元にしたい使いたい16文字', 'salt32文字', {keySize: 4, iterations: 500});
  var _key = CryptoJS.PBKDF2('autobuy-20220713', 'autobuybot-2022-07-13-16:47dfghr', {keySize: 4, iterations: 500});
  //console.log('key=', _key);
  console.log('key=', CryptoJS.enc.Base64.stringify(_key));

  //var _key = CryptoJS.PBKDF2('ユニークなIVの元に使いたい32文字の16進数文字列');
  // https://rakko.tools/tools/77/ で16バイトの文字列を16進数に治して使うと楽
  // 今回はautobuy-20220713を16進数に変換
  var _iv = CryptoJS.enc.Hex.parse('6175746f6275792d3230323230373133');
  //console.log('iv=', _iv);
  console.log('iv=', CryptoJS.enc.Base64.stringify(_iv));

  // テスト
  console.log('check encrypt---------------------');
  var plaintxt = 'saimushi@gmail.com';
  var key = CryptoJS.enc.Base64.parse(global.aeskey);
  //console.log('key=', key);
  var iv = CryptoJS.enc.Base64.parse(global.aesiv);
  //console.log('iv=', iv);
  console.log('plaintxt=', plaintxt);
  console.log('strlength=', plaintxt.length);
  var encryptdata = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plaintxt), key, {iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  //console.log('encryptdata=', encryptdata);
  var encryptstr = encryptdata.ciphertext.toString(CryptoJS.enc.Base64);
  //var encryptstr = 'u7eOYQFXn6cog4JX5YxR3zvxUWEyIQwN6MnzTGucRJc=';
  console.log('encryptstr=', encryptstr);
  var encryptdata = CryptoJS.enc.Base64.parse(encryptstr);
  //console.log('encryptdata=', encryptdata);
  var decryptdata = CryptoJS.AES.decrypt({ciphertext:encryptdata}, key, {iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  //console.log('decryptdata=', decryptdata);
  var decryptstr = decryptdata.toString(CryptoJS.enc.Utf8);
  console.log('decryptstr=', decryptstr);
  console.log('decryptstrlength=', decryptstr.length);

  return response.status(200).end('success!');
});

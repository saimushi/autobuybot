// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

require('./const');
require('./libraries/utilities');
require('./libraries/firestore');
require('./libraries/filterIP');
require('./libraries/authBasic');

// Functions読み込み
loadFunctions = (funcsObj) => {
  for(let name in funcsObj){
    if(! process.env.FUNCTION_NAME || process.env.FUNCTION_NAME === name) {
      exports[name] = require(funcsObj[name])
    }
  }
}

// 実行
loadFunctions(funcs)
console.log('exports:', exports)

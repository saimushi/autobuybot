
global.admin = require('firebase-admin');

if (process.env.FUNCTIONS_EMULATOR == 'true') {
  // ローカル用
  try {
    console.log('global.production=', global.production);
    var serviceAccount = require('../serviceAccount-dev.json');
    if (true === global.production) {
      serviceAccount = require('../serviceAccount-prod.json');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: JSON.parse(process.env.FIREBASE_CONFIG).storageBucket,
      },
      functions.config().firebase
    );
  }
  catch (exception) {
    console.log('init functions exception=', exception);
    console.log('try nomal init');
    admin.initializeApp();
    console.log('nomal init done');
  }
}
else {
  admin.initializeApp();
}

//db.settings
global.firestore = admin.firestore();
firestore.settings({timestampsInSnapshots: true});

// エラーログ保存
global.logError = function (error, data, callback, mode) {
  if ('string' != typeof mode) {
    mode = 'critical';
  }
  var date = new Date();
  if (undefined == data) {
    data = null;
  }
  var errorLog = {date: date, mode: mode, data: data, error: error.toString(), };
  console.error('error', errorLog);
  firestore.collection('errorLog').doc(date.toFormat('YYYY-MM-DD HH24:MI:SS') + '-' + mode).set(errorLog)
  .then(function(doc){
    if (callback) {
      callback(errorLog);
    }
    return;
  })
  .catch(function(err){
    console.error('illigal!', err);
  });
};

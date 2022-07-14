
// 環境変数をGlobalにしまう
global.genv = JSON.parse(process.env.FIREBASE_CONFIG);

global.production = true;

global.funcs = {
  generateAESKey: './endpoints/operations/generateAESKey',
  autobuy4amazon: './endpoints/crons/autobuy4amazon',
};

// operation/generateAESKeysを使って作成して下さい
global.aeskey = 'LPUMqrlslK/u/s5NEbJ0AQ==';
global.aesiv = 'YXV0b2J1eS0yMDIyMDcxMw==';

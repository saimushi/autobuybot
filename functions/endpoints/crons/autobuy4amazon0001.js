
require('../../libraries/notifyLine');

const puppeteer = require('puppeteer');

let browser = null;
let page = null;

// module.exports = functions.region('asia-northeast1').https.onRequest(async (request, response) => {
//   const body = await autobuyAmazon(10000);
//   if (null === body) {
//     return response.status(404).end('target not found');
//   }
//   return response.status(200).end(body);
// });

module.exports = functions.region('asia-northeast1').runWith({ timeoutSeconds: 539, memory: '512MB' }).pubsub.schedule('every 9 minutes').onRun(async (context) => {
  await autobuyAmazon(530000);
  return true;
});

let linetoken = null;

const autobuyAmazon = async function (argmaxtime) {
  let body = 'end';
  try {
    const asnap = await firestore.collection('amazon').doc(process.env.FUNCTION_TARGET.substr(-4)).get();
    if (!asnap.exists) {
      console.log('対象データが無いので即終了');
      return null;
    }
    const targetdata = asnap.data();
    if (targetdata.linetoken) {
      linetoken = decryptAESFromUTF8Base64(targetdata.linetoken);
    }
    const mail = decryptAESFromUTF8Base64(targetdata.identity);
    const pass = decryptAESFromUTF8Base64(targetdata.pass);
    const items = targetdata.items;

    // B07RRK3LGN V2AB

    //const asincode = 'B00SAYCXWG';// 「Amazonの他の出品者」(パターン1)のテスト用
    //const asincode = 'B07GW283KL';// 通常の購入テスト用
    //const asincode = 'B07GW283KL';// 「Amazonの他の出品者」(パターン2)の一覧上にAmazonのテスト用
    //const asincode = 'B00EPZYC0U';// すべての出品を見るテスト用

    const starttime = new Date().getTime();
    console.log('開始時間=', starttime);

    let targetidx = 0;
    while (argmaxtime > (new Date().getTime()) - starttime) {
      console.log('ループ開始', (targetidx+1));
      let res = null;
      let item = items[targetidx];
      if (item) {
        if (item.buycount < item.usecount) {
          console.log('購入が完了していないアイテムを検知 行番号' + (targetidx+1), item);
          res = await checkAmazon(mail, pass, item.id);
          console.log('res=', res);
          //if (true === res) {
          if (null === res) {// テスト用
            items.buycount = admin.firestore.FieldValue.increment(1);
            await asnap.ref.update({ items: items });
          }
        }
      }
      console.log('ループ終了', (targetidx+1));
      if (null === res) {
        // 次のアイテムのチェック
        targetidx++;
        if (2 < targetidx) {
          // アイテムは3つまでなので3つのチェックが終わったら30秒待って頭に戻る
          targetidx = 0;
          if (500000 > (new Date().getTime()) - starttime) {
            // 30秒後に再トライ
            console.log('30秒のインターバルを挟む 次の行番号', (targetidx+1));
            const timer = await new Promise(function (resolve) {
              setTimeout(function () {
                resolve(true);
              }, 30000);
            });
          }
        }
      }
      // XXX 購入の失敗はしつこく再処理するのでidxはインクリメントしない！
    }
    console.log('全処理終了');
  }
  catch (error) {
    body = error.toString();
  }
  if (browser) {
    await browser.close();
  }
  return body;
};

const checkAmazon = async function (argid, argpass, argitemid) {
  await initAmazon();
  await loginAmazon(argid, argpass);

  let targetURL = 'https://www.amazon.co.jp/dp/' + argitemid;
  await page.goto(targetURL);
  await page.waitForSelector('#nav-cart-count');

  console.log('販売元がAmazonかどうか');
  try {
    const seller = await page.evaluate(function(selector) {
      return document.querySelector(selector).textContent.trim();
    }, '#tabular_feature_div .tabular-buybox-text[tabular-attribute-name="販売元"] span');
    console.log('販売元=', seller);
    //if (-1 < seller.indexOf('鳶色')) {// XXX テスト購入用
    if (0 === seller.indexOf('Amazon')) {
      // const iselement = await page.evaluate(function(selector) {
      //   return true;
      // }, '#buy-now-button');
      // console.log('販売元がAmazonなのでそのままワンクリック購入を試みる');
      // if (iselement) {
      //   return await onebuyAmazon();
      // }
      // console.log('ワンクリック購入ボタンが無い');
      await notifyLine(linetoken, targetURL + '\nは購入出来る状態です。購入を試みます。');
      console.log('販売元がAmazonなのでそのまま購入を試みる');

      console.log('カートに追加');
      const iselement = await page.evaluate(function(selector) {
        return true;
      }, '#add-to-cart-button');
      if (iselement) {
        await page.evaluate(function(selector) {
          return document.querySelector(selector).click();
        }, '#add-to-cart-button');
        await page.waitForTimeout(1000);
        console.log('カートに追加 OK');
        return await buyAmazon(targetURL);
      }
    }
    console.log('販売元がAmazonじゃ無い');
  }
  catch (error) {
    console.log('販売元がそもそも無い');
  }

  console.log('販売元が無いので販売者一覧にAmazonが居ないかチェックする');
  await page.goto(targetURL + '?tag=isurut-22&linkCode=osi&th=1&psc=1&aod=1');
  await page.waitForSelector('#atc-toast-overlay');

  console.log('販売者一覧ヘッダーがAmazonかどうか');
  try {
    const seller = await page.evaluate(function(selector) {
      return document.querySelector(selector).textContent.trim();
    }, '#aod-pinned-offer #aod-offer-soldBy .a-fixed-left-grid-col.a-col-right a');
    console.log('販売者一覧ヘッダー販売元=', seller);
    if (0 === seller.indexOf('Amazon')) {
    //if (-1 < seller.indexOf('port town')) {// XXX テスト購入用
    //if (0 < seller.indexOf('Amazon')) {// XXX このブロック後をテストする時用
      await notifyLine(linetoken, targetURL + '\nは購入出来る状態です。購入を試みます。');
      console.log('販売者一覧ヘッダーの販売元がAmazonなので購入を試みる');

      console.log('販売者一覧ヘッダーからカートに追加');
      await page.evaluate(function(selector) {
        return document.querySelector(selector).click();
      }, '#aod-pinned-offer input[name="submit.addToCart"]');
      await page.waitForTimeout(1000);
      console.log('販売者一覧ヘッダーからカートに追加 OK');
      return await buyAmazon(targetURL);
    }
    console.log('販売者一覧ヘッダーがAmazonじゃ無い');
  }
  catch (error) {
    console.log('販売者一覧ヘッダーがそもそも無い');
  }

  console.log('販売者一覧にAmazonがあるかどうか');
  try {
    const sellers = await page.evaluate((selector) => {
       const list = Array.from(document.querySelectorAll(selector));
       return list.map(data => {
         return (-1 < data.textContent.trim().indexOf('Amazon')) ? 'Amazon' : data.textContent.trim();
       });
     }, '#aod-offer-list #aod-offer-soldBy .a-fixed-left-grid-col.a-col-right a');
    console.log('販売者一覧=', sellers);
    const sidx = sellers.indexOf('Amazon');
    if (-1 < sidx) {
      await notifyLine(linetoken, targetURL + '\nは購入出来る状態です。購入を試みます。');
      console.log('販売者一覧にAmazonがあるで購入を試みる 行番号=', (sidx+1));

      console.log('販売者一覧からカートに追加');
      await page.evaluate(function(selector) {
        return document.querySelector(selector).click();
      }, '#aod-offer-list #aod-offer-' + (sidx+1) + ' input[name="submit.addToCart"]');
      await page.waitForTimeout(1000);
      console.log('販売者一覧からカートに追加 OK');
      return await buyAmazon(targetURL);
    }
    console.log('販売者一覧にAmazonが無い');
  }
  catch (error) {
    console.log('販売者一覧がそもそも無い');
  }

  // 購入出来る状態では無かった
  //await notifyLine(linetoken, targetURL + '\nは購入出来る状態ではありませんでした。');

  return null;
};

const initAmazon = async function () {
  if (browser) {
    return;
  }
  browser = await puppeteer.launch({ headless: true, args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'], });
  //browser = await puppeteer.launch({ headless: true, });
  page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OSX) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53');
  await page.setViewport({ width: 480, height: 1920, });
  return;
};

let authorized = false;
const loginAmazon = async function (argid, argpassd) {
  if (authorized) {
    return;
  }
  console.log('ログイン id=', argid);
  await page.goto('https://www.amazon.co.jp/ap/signin?_encoding=UTF8&openid.assoc_handle=jpflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.co.jp%2F%3Fref_%3Dnav_signin');
  await page.waitForSelector('form[name="signIn"]');
  await page.evaluate(function(email, passwd) {
    document.querySelector('#ap_email').value = email;
    document.querySelector('#ap_password').value = passwd;
    document.querySelector('#signInSubmit').click();
  }, argid, argpassd);
  await page.waitForSelector('#nav-cart-count');
  authorized = true;
  console.log('ログイン OK');
  return;
};

// const onebuyAmazon = async function () {
//   try {
//     console.log('今すぐ購入をクリック');
//     await page.evaluate(function(selector) {
//       return document.querySelector(selector).click();
//     }, '#buy-now-button');
//     //await page.waitForTimeout(2000);
//     //await page.screenshot({ path: 'screenshot.png'});
//     //await page.waitForSelector('#turbo-checkout-panel-container');
//     const elementHandle = await page.waitForSelector('iframe#turbo-checkout-bottom-sheet-frame');
//     const frame = await elementHandle.contentFrame();
//     console.log('frame=', frame);
//     console.log('今すぐ購入をクリック OK');
//
//     console.log('注文の確定');
//     await frame.waitForSelector('#turbo-checkout-pyo-button');
//     await frame.evaluate(function(selector) {
//       return document.querySelector(selector).click();
//     }, '#turbo-checkout-pyo-button');
//     await page.waitForTimeout(40000);
//     await page.screenshot({ path: 'screenshot.png'});
//     console.log('注文完了');
//
//     console.log('注文が成功したかどうかをチェック');
//     const success = await page.evaluate(function(selector) {
//       return document.querySelector(selector).textContent;
//     }, '#widget-purchaseConfirmationStatus .a-alert-inline-success');
//     console.log('success=', success);
//     if (-1 < success.indexOf('注文が確定')) {
//       console.log('注文成功');
//       await page.screenshot({ path: 'screenshot.png'});
//       return true;
//     }
//     console.log('注文失敗');
//   }
//   catch (error) {
//     console.log('注文完了出来す', error);
//   }
//   return false;
// };

const buyAmazon = async function (argtargeturl) {
  console.log('カートを表示');
  await page.goto('https://www.amazon.co.jp/gp/aw/c?ref_=navm_hdr_cart');
  await page.waitForSelector('#nav-cart-count');
  //await page.screenshot({ path: 'screenshot.png'});
  console.log('カートを表示 OK');
  //return false;

  try {
    console.log('レジに進む');
    await page.evaluate(function(selector) {
      return document.querySelector(selector).click();
    }, 'input[name="proceedToRetailCheckout"]');
    await page.waitForSelector('#shipping-summary');
    console.log('レジに進む OK');

    console.log('注文の確定');
    await page.evaluate(function(selector) {
      return document.querySelector(selector).click();
    }, 'input[name="placeYourOrder1"]');
    await page.waitForSelector('#widget-purchaseConfirmationStatus');
    console.log('注文完了');
    await notifyLine(linetoken, argtargeturl + '\nは注文完了しました。\n成功したかどうか確認して下さい。\nhttps://www.amazon.co.jp/gp/css/order-history?ref_=nav_orders_first');

    console.log('注文が成功したかどうかをチェック');
    const success = await page.evaluate(function(selector) {
      return document.querySelector(selector).textContent;
    }, '#widget-purchaseConfirmationStatus');
    console.log('success=', success);
    if (-1 < success.indexOf('注文が確定')) {
      console.log('注文成功');
      //await page.screenshot({ path: 'screenshot.png'});
      return true;
    }
    console.log('注文失敗');
  }
  catch (error) {
    console.log('注文完了出来す', error);
  }
  await notifyLine(linetoken, argtargeturl + '\nは注文失敗しました。リトライします。\n実際に失敗したかどうか確認して下さい。\nhttps://www.amazon.co.jp/gp/css/order-history?ref_=nav_orders_first');
  return false;
};

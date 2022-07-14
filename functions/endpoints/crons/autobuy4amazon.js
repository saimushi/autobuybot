
const puppeteer = require('puppeteer');

let browser = null;
let page = null;

module.exports = functions.region('asia-northeast1').https.onRequest(async (request, response) => {
  const mail = 'saimushi@gmail.com';
  const pass = 'saimushi1721';
  //const asincode = 'B00SAYCXWG';// 「Amazonの他の出品者」(パターン1)のテスト用
  //const asincode = 'B07GW283KL';// 「Amazonの他の出品者」(パターン2)の一覧上にAmazonのテスト用
  //const asincode = 'B07GW283KL';// 「Amazonの他の出品者」(パターン2)の一覧上にAmazonのテスト用
  //const asincode = 'B00EPZYC0U';// すべての出品を見るテスト用
  const asincode = 'B09QSHY3MW';// テスト購入用

  let body = 'end';
  try {
    const res = await checkAmazon(mail, pass, asincode);
    if (res) {
      // XXX
    }
  }
  catch (error) {
    body = error.toString();
  }
  if (browser) {
    await browser.close();
  }
  return response.status(200).end(body);
});

// module.exports = functions.region('asia-northeast1').runWith({ timeoutSeconds: 539 }).pubsub.schedule('every 9 minutes').onRun(async (context) => {
//   try {
//     await checkAmazon(mail, pass, asincode);
//   }
//   catch (error) {
//     console.error('error=', error);
//     return false;
//   }
// if (browser) {
//   await browser.close();
// }
//   return false;
// });

const checkAmazon = async function (argid, argpass, argitemid) {
  await initAmazon();
  await loginAmazon(argid, argpass);

  await page.goto('https://www.amazon.co.jp/dp/' + argitemid);
  await page.waitForSelector('#nav-cart-count');

  console.log('販売元がAmazonかどうか');
  try {
    const seller = await page.evaluate(function(selector) {
      return document.querySelector(selector).textContent.trim();
    }, '#tabular_feature_div .tabular-buybox-text[tabular-attribute-name="販売元"] span');
    console.log('販売元=', seller);
    if (0 === seller.indexOf('Amazon')) {
      console.log('販売元がAmazonなのでそのままワンクリック購入を試みる');
      //return await onebuyAmazon();
    }
    console.log('販売元がAmazonじゃ無い');
  }
  catch (error) {
    console.log('販売元がそもそも無い');
  }

  console.log('販売元が無いので販売者一覧にAmazonが居ないかチェックする');
  await page.goto('https://www.amazon.co.jp/dp/' + argitemid + '?tag=isurut-22&linkCode=osi&th=1&psc=1&aod=1');
  await page.waitForSelector('#atc-toast-overlay');

  console.log('販売者一覧ヘッダーがAmazonかどうか');
  try {
    const seller = await page.evaluate(function(selector) {
      return document.querySelector(selector).textContent.trim();
    }, '#aod-pinned-offer #aod-offer-soldBy .a-fixed-left-grid-col.a-col-right a');
    console.log('販売者一覧ヘッダー販売元=', seller);
    if (0 < seller.indexOf('port town')) {// XXX テスト購入用
    //if (0 === seller.indexOf('Amazon')) {
    // if (0 < seller.indexOf('Amazon')) {// XXX このブロック後をテストする時用
      console.log('販売者一覧ヘッダーの販売元がAmazonなので購入を試みる');

      console.log('販売者一覧ヘッダーからカートに追加');
      await page.evaluate(function(selector) {
        return document.querySelector(selector).click();
      }, '#aod-pinned-offer input[name="submit.addToCart"]');
      await page.waitForTimeout(1000);
      console.log('販売者一覧ヘッダーからカートに追加 OK');
      return await buyAmazon();
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
      console.log('販売者一覧にAmazonがあるで購入を試みる 行番号=', (sidx+1));

      console.log('販売者一覧からカートに追加');
      await page.evaluate(function(selector) {
        return document.querySelector(selector).click();
      }, '#aod-offer-list #aod-offer-' + (sidx+1) + ' input[name="submit.addToCart"]');
      await page.waitForTimeout(1000);
      console.log('販売者一覧からカートに追加 OK');
      return await buyAmazon();
    }
    console.log('販売者一覧にAmazonが無い');
  }
  catch (error) {
    console.log('販売者一覧がそもそも無い');
  }

  // 購入出来る状態では無かった
  return null;
};

const initAmazon = async function () {
  if (browser) {
    return;
  }
  browser = await puppeteer.launch({ headless: true });
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
  await page.screenshot({ path: 'screenshot.png'});
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

const onebuyAmazon = async function () {
  return false;
};

const buyAmazon = async function () {
  console.log('カートを表示');
  await page.goto('https://www.amazon.co.jp/gp/aw/c?ref_=navm_hdr_cart');
  await page.waitForSelector('#nav-cart-count');
  console.log('カートを表示 OK');

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
    console.log('注文完了');
    await page.waitForSelector('#nav-cart-count');

    console.log('注文が成功したかどうかをチェック');
    const success = await page.evaluate(function(selector) {
      return document.querySelector(selector).textContent;
    }, '#widget-purchaseConfirmationStatus .a-alert-inline-success');
    if (-1 < success.indexOf('注文が確定')) {
      console.log('注文成功');
      await page.screenshot({ path: 'screenshot.png'});
      return true;
    }
    console.log('注文失敗');
  }
  catch (error) {
    console.log('注文完了出来す', error);
  }
  return false;
};

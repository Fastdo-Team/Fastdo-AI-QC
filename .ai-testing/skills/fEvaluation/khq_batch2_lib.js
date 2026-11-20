const puppeteer = require('puppeteer-core');
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

const CDP_URL = 'http://127.0.0.1:9224';
const TARGET_URL = 'https://60rr1632-3000.asse.devtunnels.ms/';
const ORG_NAME = 'DEMO FASTDO';
const EMAIL1 = 'tester01.fastdo@gmail.com';
const PASS1 = '<MAT_KHAU_TEST — điền trong .env>';
const EMAIL2 = '<EMAIL_TEST_2>';
const PASS2 = '<MAT_KHAU_TEST — điền trong .env>';

async function getBrowser() {
  return puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null, protocolTimeout: 90000 });
}

async function dismissDevtunnel(page) {
  try {
    const btn = await page.waitForSelector('#continue', { timeout: 3000 });
    if (btn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(()=>{}),
        btn.click(),
      ]);
      await sleep(1500);
    }
  } catch (e) {}
}

async function waitAppReady(page) {
  try {
    await page.waitForFunction(() => !document.body.innerText.includes('Loading data'), { timeout: 20000 });
  } catch (e) {}
  await sleep(1000);
}

async function login(page, email, password, orgName) {
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissDevtunnel(page);
  await waitAppReady(page);

  const orgXPath = `.//a[contains(., "${orgName}")]`;
  const loginLinkXPath = './/*[self::a or self::button][normalize-space(.)="Đăng nhập" or normalize-space(.)="Log in" or contains(., "Đăng nhập") or contains(., "Log in")]';

  let state = null;
  for (let i = 0; i < 30 && !state; i++) {
    try {
      if (await page.$('xpath/' + orgXPath)) state = 'org-selection';
      else if (await page.$('input[type="email"], input[placeholder*="email" i]')) state = 'login-form';
      else if (await page.$('xpath/' + loginLinkXPath)) state = 'landing';
    } catch (e) {}
    if (!state) await sleep(700);
  }
  console.log('[AUTH] state=', state);

  if (state === 'landing') {
    const el = await page.waitForSelector('xpath/' + loginLinkXPath, { timeout: 8000 }).catch(()=>null);
    if (el) { await el.click(); await sleep(1500); state = 'login-form'; }
  }

  if (state === 'login-form') {
    const emailSel = 'input[type="email"], input[placeholder*="email" i], input[placeholder*="số điện thoại" i]';
    const passSel = 'input[type="password"], input[placeholder*="mật khẩu" i], input[placeholder*="password" i]';
    await page.waitForSelector(emailSel, { timeout: 15000 });
    const curEmail = await page.$eval(emailSel, el => el.value).catch(()=> '');
    if (curEmail !== email) {
      await page.click(emailSel, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(emailSel, email, { delay: 20 });
      await page.click(passSel, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(passSel, password, { delay: 20 });
    }
    let submitBtn = null;
    for (let i = 0; i < 10 && !submitBtn; i++) {
      submitBtn = await page.$('button[type="submit"]');
      if (!submitBtn) submitBtn = await page.$('xpath/.//button[contains(., "Đăng nhập") or contains(., "Log in")]');
      if (!submitBtn) await sleep(500);
    }
    if (!submitBtn) throw new Error('submit button not found on login form');
    await submitBtn.click();
    await page.waitForSelector('xpath/' + orgXPath, { timeout: 25000 });
    state = 'org-selection';
  }

  if (state === 'org-selection') {
    let el = null;
    for (let i = 0; i < 10 && !el; i++) {
      el = await page.$('xpath/' + orgXPath);
      if (!el) await sleep(500);
    }
    if (el) { await el.click(); await sleep(3000); }
  }
  await waitAppReady(page);
}

async function navTo(sheetPage, ref) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sheetPage.focus('#t-name-box');
    await sleep(200);
    await sheetPage.keyboard.down('Control'); await sheetPage.keyboard.press('KeyA'); await sheetPage.keyboard.up('Control');
    await sleep(200);
    await sheetPage.keyboard.type(ref, { delay: 25 });
    await sleep(250);
    const typed = await sheetPage.evaluate(() => document.querySelector('#t-name-box').value);
    if (typed === ref) { await sheetPage.keyboard.press('Enter'); await sleep(600); return; }
    await sleep(300);
  }
  throw new Error('nav failed for ' + ref);
}
async function setCellDirect(sheetPage, ref, value) {
  await navTo(sheetPage, ref);
  await sheetPage.keyboard.press('Delete');
  await sleep(300);
  if (value) await sheetPage.keyboard.type(value, { delay: 6 });
  await sleep(500);
  await sheetPage.keyboard.press('Enter');
  await sleep(500);
}
async function readCell(sheetPage, ref) {
  await navTo(sheetPage, ref);
  return sheetPage.evaluate(() => {
    const el = document.querySelector('.cell-input');
    return el ? el.innerText : null;
  });
}

async function getSheetPage(browser) {
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('docs.google.com/spreadsheets') && p.url().includes('gid=1953309174'));
  if (!page) throw new Error('Sheet tab not found - open it manually in the 9224 Chrome window');
  return page;
}

async function writeResult(browser, row, { status, note, date }) {
  const sheetPage = await getSheetPage(browser);
  await sheetPage.bringToFront();
  await sleep(300);
  if (status) { await setCellDirect(sheetPage, 'H' + row, status); console.log('wrote H' + row); }
  if (note) { await setCellDirect(sheetPage, 'I' + row, note); console.log('wrote I' + row); }
  if (date) { await setCellDirect(sheetPage, 'K' + row, date); console.log('wrote K' + row); }
}

module.exports = { getBrowser, login, sleep, dismissDevtunnel, waitAppReady, getSheetPage, writeResult, setCellDirect, readCell, navTo,
  TARGET_URL, ORG_NAME, EMAIL1, PASS1, EMAIL2, PASS2 };

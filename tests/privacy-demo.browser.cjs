// Run with Playwright installed. Optional CHROMIUM_PATH and CHART_JS_PATH support offline QA.
const {chromium} = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
    const root = path.resolve(__dirname, '..');
    const server = http.createServer((req,res) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
        if (!file.startsWith(root + '/') || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
        const types = {'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.ico':'image/x-icon'};
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.end(fs.readFileSync(file));
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}), args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const errors=[];
    try {
        for (const width of [1440, 1024, 390, 360]) {
            const context=await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Tokyo'});
            const page=await context.newPage();
            page.on('pageerror', error=>errors.push(error.message));
            if (process.env.CHART_JS_PATH) await page.route('**/chart.umd.min.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(process.env.CHART_JS_PATH)}));
            if (process.env.QA_FONT_PATH) {
                await page.route('https://fonts.googleapis.com/**', route=>route.fulfill({contentType:'text/css',body:'@font-face {font-family:"Noto Sans JP";font-style:normal;font-weight:100 900;src:url(https://fonts.gstatic.com/qa-font.ttf)}'}));
                await page.route('https://fonts.gstatic.com/qa-font.ttf', route=>route.fulfill({contentType:'font/ttf',body:fs.readFileSync(process.env.QA_FONT_PATH)}));
            } else await page.route('https://fonts.googleapis.com/**', route=>route.abort());
            await page.goto(`http://127.0.0.1:${server.address().port}/`);
            await page.waitForSelector('html.privacy-ready');
            await page.evaluate(()=>document.fonts.ready);
            await page.evaluate(()=>{Chart.defaults.animation=false;refreshAllViews()});
            const card=await page.locator('.dashboard-assets').boundingBox();
            const eye=await page.locator('#toggle-amount-visibility').boundingBox();
            assert.ok(Math.abs((eye.y+eye.height/2)-(card.y+card.height/2))<2);
            assert.ok(eye.x>card.x+card.width/2);
            assert.ok(eye.width>=44 && eye.height>=44);
            const screenshotDir=process.env.SCREENSHOT_DIR;
            if (screenshotDir) { fs.mkdirSync(screenshotDir,{recursive:true}); await page.screenshot({path:`${screenshotDir}/demo-dashboard-${width}.png`,fullPage:true}); }
            await page.locator('#toggle-amount-visibility').click();
            assert.equal(await page.locator('#total-assets').innerText(),'••••');
            assert.equal(await page.evaluate(()=>Object.keys(Chart.instances).length),0);
            for(const tab of ['dashboard','annual-report','budget','transactions','add-transaction','settings']) {
                await page.evaluate(tab=>showMainTab(tab),tab);
                await page.evaluate(()=>document.getAnimations().forEach(animation=>{if(animation.effect.getTiming().iterations !== Infinity) animation.finish()}));
                const text=await page.locator(`#tab-${tab}`).innerText();
                assert.doesNotMatch(text,/[¥￥][\d,]+|\d+\.\d+%|[+−-]••••/);
                assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No horizontal overflow: ${width}/${tab}`);
                assert.equal(await page.locator('canvas:visible').count(),0);
                if (tab === 'settings') {
                    const toggle=await page.locator('#demo-mode-toggle').boundingBox();
                    assert.equal(toggle.width,48); assert.equal(toggle.height,28);
                }
                if(screenshotDir && ['dashboard','settings','annual-report'].includes(tab)) await page.screenshot({path:`${screenshotDir}/private-${tab}-${width}.png`,fullPage:true});
            }
            // Reload persists masking and never creates a chart with real values.
            await page.reload(); await page.waitForSelector('html.privacy-ready');
            assert.equal(await page.locator('#total-assets').innerText(),'••••');
            assert.equal(await page.evaluate(()=>Object.keys(Chart.instances).length),0);
            await page.locator('#toggle-amount-visibility').click();
            assert.ok(await page.evaluate(()=>Object.keys(Chart.instances).length)>0);
            // Controlled real source. No private API or spreadsheet is touched.
            await page.evaluate(()=>{
                window.__requests=[];
                window.fetch=async(url,options)=>{
                    window.__requests.push({url,method:options.method});
                    return {ok:true,json:async()=>({status:'success',...createDemoData(initialMonth.getFullYear())})};
                };
                state.gasUrl='https://example.org/test-api';
                localStorage.setItem('kakeibo_gas_url',state.gasUrl);
                showMainTab('settings');
            });
            await page.locator('#demo-mode-toggle').uncheck();
            await page.waitForFunction(()=>!state.isDemoMode && state.syncState==='synced');
            assert.equal(await page.locator('#gas-url').inputValue(),'');
            assert.equal(await page.locator('.demo-record-actions').count(),0);
            await page.locator('#demo-mode-toggle').check();
            const requestCount=await page.evaluate(()=>window.__requests.length);
            await page.evaluate(()=>showMainTab('add-transaction'));
            await page.locator('#exp-amount').fill('1000');
            await page.locator('#exp-category').selectOption('個人_食費');
            await page.locator('#expense-form [type=submit]').click();
            assert.equal(await page.evaluate(()=>window.__requests.length),requestCount);
            assert.ok(await page.evaluate(()=>state.expenses.some(e=>e.amount===1000)));
            await context.close();
        }
        assert.deepEqual(errors,[]);
        console.log('PASS: Chromium 1440/1024/390/360px, icon placement, all-tab masking, no overflow, reload, real/demo switches and isolated form submission');
    } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});

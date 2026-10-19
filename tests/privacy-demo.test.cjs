const assert = require('node:assert/strict');
const fs = require('node:fs');
const {runInContext} = require('node:vm');
const {JSDOM, VirtualConsole} = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function setup({storage = {}, fetch} = {}) {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error.message));
    const dom = new JSDOM(html, {url: 'https://money.example', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole});
    const w = dom.window;
    Object.entries(storage).forEach(([key,value]) => w.localStorage.setItem(key, value));
    w.Chart = class {
        static defaults = {font: {}, plugins: {tooltip: {}}};
        static live = new Set();
        constructor(ctx, config) { this.data=config.data; this.options=config.options; w.Chart.live.add(this); }
        destroy() { w.Chart.live.delete(this); }
        update() {}
    };
    w.HTMLCanvasElement.prototype.getContext = () => ({createLinearGradient: () => ({addColorStop(){}})});
    w.matchMedia = () => ({matches: false, addEventListener(){}});
    w.scrollTo = () => {};
    w.fetch = fetch || (() => { throw new Error('Unexpected API call'); });
    const run = code => runInContext(code, dom.getInternalVMContext());
    run(fs.readFileSync('demo-data.js', 'utf8'));
    run(fs.readFileSync('app.js', 'utf8'));
    await tick();
    assert.deepEqual(errors, []);
    return {w, d:w.document, run, errors, close:()=>w.close()};
}
(async () => {
    const a = await setup(); const {w,d,run} = a;
    assert.equal(run('state.isDemoMode'), true);
    assert.equal(run('state.incomes.length'), 12);
    assert.ok(run('state.assets.length') >= 52);
    assert.equal(run('new Set(state.expenses.map(e => parseYearMonth(e.yearMonth).month)).size'), 12);
    assert.ok(run('getAnnualReportData(initialMonth.getFullYear()).months.some(m => m.balance < 0)'));
    assert.ok(run('getAnnualReportData(initialMonth.getFullYear()).months.some(m => m.balance > 0)'));
    assert.ok(run('state.assets.every(a => a.total === a.cash + a.stocks + a.trusts + a.points + a.zaikei + a.employeeStock)'));
    const originalExpenses = run('state.expenses.length');
    run("showMainTab('add-transaction')");
    d.getElementById('exp-amount').value = '12345';
    d.getElementById('expense-form').dispatchEvent(new w.Event('submit', {cancelable:true}));
    await tick(); assert.equal(run('state.expenses.length'), originalExpenses + 1);
    assert.equal(w.localStorage.getItem('kakeibo_demo_expenses_v2'), null);
    run("showMainTab('dashboard')");
    d.getElementById('toggle-amount-visibility').click();
    assert.equal(d.getElementById('total-assets').textContent, '••••');
    assert.equal(w.Chart.live.size, 0, 'All existing charts destroyed');
    assert.equal(d.querySelectorAll('canvas:not([hidden])').length, 0);
    assert.equal(d.getElementById('exp-amount').hidden, false);
    assert.equal(d.getElementById('asset-shares').hidden, false);
    assert.equal(d.getElementById('toggle-amount-visibility').getAttribute('aria-label'), '金額を表示する');
    for (const tab of ['dashboard', 'annual-report', 'budget', 'transactions', 'add-transaction', 'settings']) {
        run(`showMainTab('${tab}')`);
        assert.equal(w.Chart.live.size, 0);
        if (tab !== 'add-transaction') assert.doesNotMatch(d.querySelector(`#tab-${tab}`).textContent, /[¥￥][\d,]+|[+−-]••••|\d+\.\d+%/);
    }
    for (const view of ['monthly', 'special']) run(`state.budgetView='${view}';renderBudgetView()`);
    assert.doesNotMatch(d.getElementById('tab-budget').textContent, /[¥￥][\d,]+|予算超過|目標超過/);
    assert.equal(d.querySelectorAll('[role="progressbar"][aria-valuenow]:not([hidden])').length, 0);
    run('loadDemoMode()'); assert.equal(run('state.expenses.length'), originalExpenses);
    assert.equal(run('state.hideAmounts'), true);
    d.getElementById('toggle-amount-visibility').click();
    assert.ok(w.Chart.live.size > 0);
    assert.equal(d.getElementById('exp-amount').disabled, false);
    // Editing and deletion affect demo only, and disappear on restart.
    run("state.currentMonth=new Date(initialMonth.getFullYear(),0,1);renderExpensesList()");
    const ledger = d.getElementById('expense-ledger') || d.querySelector('#expense-list .expense-entry')?.parentElement;
    const edit = d.querySelector('#expense-list .demo-record-actions button');
    assert.ok(edit); edit.click();
    const countBefore = run('state.expenses.length');
    d.getElementById('exp-amount').value = '54321';
    d.getElementById('expense-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
    await tick(); assert.equal(run('state.expenses.length'),countBefore);
    assert.ok(run('state.expenses.some(e=>e.amount===54321)'));
    run('renderExpensesList()');
    d.querySelector('#expense-list .demo-record-actions button:last-child').click();
    assert.equal(run('state.expenses.length'),countBefore-1);
    d.querySelector('.demo-undo').click(); assert.equal(run('state.expenses.length'),countBefore);
    run('loadDemoMode()'); assert.equal(run('state.expenses.some(e=>e.amount===54321)'),false);
    assert.deepEqual(a.errors, []); a.close();

    // Connected startup: a pending real response must not leave demo after switching.
    let complete; let calls = 0;
    const b = await setup({storage: {kakeibo_gas_url:'https://example.org/api'}, fetch:()=>{calls++;return new Promise(resolve=>{complete=resolve;});}});
    assert.equal(calls,1);
    await b.run('setDemoMode(true)');
    const demoTotal = b.run('state.assets[0].total');
    complete({ok:true,json:async()=>({status:'success',assets:[{date:'2026/01/01',total:987654321}],incomes:[],expenses:[]})});
    await tick(); await tick();
    assert.equal(b.run('state.isDemoMode'),true);
    assert.equal(b.run('state.assets[0].total'),demoTotal);
    assert.equal(b.w.localStorage.getItem('kakeibo_gas_url'),'https://example.org/api');
    assert.equal(b.w.localStorage.getItem('moneymanager_api_cache_v1'),null);
    b.run('syncWithGas()'); assert.equal(calls,1);
    assert.equal(b.d.getElementById('gas-url').value,'');
    b.close();
    // Persisted demo and privacy must skip the real cache and all network reads.
    const c = await setup({storage:{kakeibo_gas_url:'https://example.org/api',moneymanager_demo_mode:'true',moneymanager_hide_amounts:'true'}});
    assert.equal(c.run('state.isDemoMode'),true);
    assert.equal(c.w.Chart.live.size,0);
    assert.equal(c.d.getElementById('total-assets').textContent,'••••');
    c.close();
    // Leaving demo restores the original cache and connection, without a POST.
    const live = {assets:[{date:'2026/09/30',total:777000,cash:777000}],incomes:[],expenses:[],subscriptions:[],budgetPlans:[],specialBudgets:[],annualBudgets:[],itemBudgets:[],assetTargets:[]};
    const cache = JSON.stringify({version:3,sourceUrl:'https://example.org/api',savedAt:Date.now(),data:live});
    let reads=0;
    const e = await setup({storage:{kakeibo_gas_url:'https://example.org/api',moneymanager_demo_mode:'true',moneymanager_hide_amounts:'true',moneymanager_api_cache_v1:cache},fetch:async(url,options)=>{
        assert.equal(options.method,'GET'); reads++; return {ok:true,json:async()=>({status:'success',...live})};
    }});
    e.run("state.expenses[0].amount=111;expenseFilterState={search:'private search',category:'private category',scope:'recurring'}");
    await e.run('setDemoMode(false)');
    assert.equal(reads,1);
    assert.equal(e.run('state.assets[0].total'),777000);
    assert.equal(e.run('state.expenses.length'),0);
    assert.equal(e.run('state.isDemoMode'),false);
    assert.equal(e.run('state.hideAmounts'),true);
    assert.equal(e.run('expenseFilterState.search'),'');
    assert.equal(e.d.getElementById('total-assets').textContent,'••••');
    assert.equal(e.d.querySelectorAll('.demo-record-actions').length,0);
    e.run('setDemoMode(true)');
    assert.equal(e.run('state.expenses.some(row=>row.amount===111)'),false);
    e.close();
    // Demo asset entry applies only at/after the entry date, using the demo stock price.
    const f = await setup();
    const year=f.run('initialMonth.getFullYear()');
    f.d.getElementById('asset-date').value=`${year}-03-15`;
    f.d.getElementById('asset-zaikei').value='123000';
    f.d.getElementById('asset-shares').value='12.5';
    f.d.getElementById('asset-form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));
    await tick();
    assert.equal(f.run(`state.assets.find(a=>safeParseDate(a.date)>=new Date(${year},2,15)).zaikei`),123000);
    assert.equal(f.run(`state.assets.find(a=>safeParseDate(a.date)>=new Date(${year},2,15)).shares`),12.5);
    assert.equal(f.run(`state.assets.find(a=>safeParseDate(a.date)>=new Date(${year},3,15)).zaikei`),220000);
    f.run('state.currentMonth=new Date(initialMonth.getFullYear(), initialMonth.getMonth()+1, 1);renderDashboard()');
    assert.equal(f.d.getElementById('total-assets').textContent,'-');
    assert.deepEqual(f.errors, []);f.close();
    console.log('PASS: annual fixtures, privacy across tabs, chart destruction, input masks, demo CRUD/reset, saved settings, network race and cache isolation');
})().catch(error=>{console.error(error);process.exitCode=1;});

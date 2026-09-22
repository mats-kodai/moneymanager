const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('gas_api.js', 'utf8'), context);
const calc = context.supplementalForDate;
const records = [{date:'2026-10-15',zaikei:90000,shares:2,index:0}, {date:'2026-09-15',zaikei:45000,shares:1.575,index:1}];
const prices = [{date:'2026-09-14',close:4000}, {date:'2026-10-14',close:5000}, {date:'2026-10-15',close:5100}];
assert.equal(calc('2026-09-14',records,prices).zaikei,0);
assert.equal(calc('2026-09-15',records,prices).zaikei,45000);
assert.equal(calc('2026-09-15',records,prices).employeeStock,6300);
assert.equal(calc('2026-10-14',records,prices).zaikei,45000);
assert.equal(calc('2026-10-15',records,prices).zaikei,90000);
assert.equal(calc('2026-10-15',records,prices).employeeStock,10200);
assert.equal(calc('2026-10-17',records,prices).priceDate,'2026-10-15');
assert.equal(calc('2026-10-24',records,prices).employeeStock,null);
assert.equal(calc('2026-09-15',records,[]).employeeStockMissing,true);
assert.equal(calc('2026-09-15',[...records,{date:'2026-09-15',zaikei:0,shares:0,index:2}],[]).employeeStock,0);
assert.equal(context.normalizeAssetDate('2026/9/15'),'2026-09-15');
assert.equal(context.normalizeAssetDate('2026-02-30'),'');
for (const value of ['',null,-1,'abc',Infinity]) assert.throws(()=>context.strictAssetNumber(value));
assert.equal(context.strictAssetNumber('1.575'),1.575);
// Sheet mock: preserve base columns and fourth column, append at last row.
class Sheet {
 constructor(rows){this.rows=rows;}
 getLastRow(){return this.rows.length;}
 getDataRange(){return {getValues:()=>this.rows.map(r=>[...r])};}
 appendRow(r){this.rows.push(r);}
 getRange(row,col,count=1,width=1){const sheet=this;return {setValue(v){return this.setValues([[v]]);},setValues(values){values.forEach((r,i)=>r.forEach((v,j)=>{sheet.rows[row-1+i] ||= [];sheet.rows[row-1+i][col-1+j]=v;}));}};}
}
const sheets={
 '週次資産記録':new Sheet([['日付','総資産','現金','株式','投信','ポイント'],['2026/09/15',100000,100000,0,0,0]]),
 'その他資産積立状況':new Sheet([['日付','一般財形残高','持株会株数','DC'],['2026-09-15',45000,1.575,10000]]),
 '株価履歴':new Sheet([['価格日','銘柄','終値','取得日時'],['2026-09-14','8316.T',4000,'']])
};
const ss={getSheetByName:n=>sheets[n],insertSheet:n=>(sheets[n]=new Sheet([]))};
context.refreshSupplementalAssets(ss);context.refreshSupplementalAssets(ss);
assert.equal(sheets['週次資産記録'].rows[1][1],100000);
assert.equal(sheets['週次資産記録'].rows[1][7],6300);
assert.equal(sheets['週次資産記録'].rows[0].length,11);
context.SpreadsheetApp={openById:()=>ss};context.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};
context.ContentService={MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})};
const res=context.doPost({postData:{contents:JSON.stringify({type:'asset',date:'2026-10-15',zaikei:90000,shares:2})}});
assert.equal(res.status,'success');assert.equal(sheets['その他資産積立状況'].rows.length,3);
assert.equal(sheets['その他資産積立状況'].rows[1][3],10000);
assert.deepEqual(sheets['その他資産積立状況'].rows[2],['2026-10-15',90000,2]);
const get=context.doGet({});assert.equal(get.status,'success');assert.equal(get.assets[0].total,151300);
console.log('Asset date boundaries, missing prices, zero/fractional values, append, double-count prevention: passed');

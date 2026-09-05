/**
 * Google Apps Script - MoneyManager 専用API (Webアプリ接続用)
 * 
 * 【重要】このスクリプトは、LINE BOTとは別に「新規作成した別のGASプロジェクト」に貼り付けてデプロイしてください。
 * LINE BOTのGASプロジェクトは元の状態に戻すことで、競合やバグを完全に回避できます。
 */

// スプレッドシートID
const SPREADSHEET_ID = '[任意で入力]'; 

// スプレッドシート名定義
const SHEET_ASSETS = "週次資産記録";
const SHEET_EXPENSES = "支出記録";
const SHEET_INCOMES = "収入記録";
const SHEET_SUBSCRIPTIONS = "サブスク管理";
const SHEET_ANNUAL_BUDGETS = "年度予算";
const SHEET_ITEM_BUDGETS = "費目別予算";
const SHEET_ASSET_TARGETS = "資産目標";

/**
 * GETリクエスト処理：家計4シートと計画3シートのデータをJSONで返します
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    initializeSheets(ss);

    // 1. 週次資産記録
    const assetSheet = ss.getSheetByName(SHEET_ASSETS);
    const assetRows = assetSheet ? assetSheet.getDataRange().getValues() : [];
    const assets = [];
    for (let i = 1; i < assetRows.length; i++) {
      const row = assetRows[i];
      if (!row[0]) continue;
      assets.push({
        date: formatDate(row[0]),
        total: Number(row[1] || 0),
        cash: Number(row[2] || 0),
        stocks: Number(row[3] || 0),
        trusts: Number(row[4] || 0),
        points: Number(row[5] || 0)
      });
    }

    // 2. 収入記録
    const incomeSheet = ss.getSheetByName(SHEET_INCOMES);
    const incomeRows = incomeSheet ? incomeSheet.getDataRange().getValues() : [];
    const incomes = [];
    for (let i = 1; i < incomeRows.length; i++) {
      const row = incomeRows[i];
      if (!row[0]) continue;
      incomes.push({
        id: i,
        yearMonth: String(row[0]),
        incomeType: String(row[1] || ""),
        grossPay: Number(row[2] || 0),
        incomeTax: Number(row[3] || 0),
        inhabitantTax: Number(row[4] || 0),
        socialInsurance: Number(row[5] || 0),
        otherDeductions: Number(row[6] || 0),
        deductionTotal: Number(row[7] || 0),
        transportation: Number(row[8] || 0),
        takeHomePay: Number(row[9] || 0)
      });
    }

    // 3. 支出記録
    const expenseSheet = ss.getSheetByName(SHEET_EXPENSES);
    const expenseRows = expenseSheet ? expenseSheet.getDataRange().getValues() : [];
    const expenses = [];
    for (let i = 1; i < expenseRows.length; i++) {
      const row = expenseRows[i];
      if (!row[1]) continue;
      expenses.push({
        id: i,
        yearMonth: String(row[0]),
        date: formatDate(row[1]),
        category: String(row[2] || ""),
        amount: Number(row[3] || 0),
        description: String(row[4] || "")
      });
    }

    // 4. サブスク管理
    const subSheet = ss.getSheetByName(SHEET_SUBSCRIPTIONS);
    const subRows = subSheet ? subSheet.getDataRange().getValues() : [];
    const subscriptions = [];
    for (let i = 1; i < subRows.length; i++) {
      const row = subRows[i];
      if (!row[1]) continue;
      subscriptions.push({
        year: Number(row[0] || 0),
        name: String(row[1] || ""),
        amount: Number(row[2] || 0),
        paymentCount: Number(row[3] || 0),
        annualAmount: Number(row[4] || 0),
        monthlyAmount: Number(row[5] || 0)
      });
    }

    // 5. 年度予算（1行＝1年度の機械可読な計画値）
    const annualBudgetSheet = ss.getSheetByName(SHEET_ANNUAL_BUDGETS);
    const annualBudgetRows = annualBudgetSheet ? annualBudgetSheet.getDataRange().getValues() : [];
    const annualBudgets = [];
    for (let i = 1; i < annualBudgetRows.length; i++) {
      const row = annualBudgetRows[i];
      if (!row[0]) continue;
      annualBudgets.push({
        fiscalYear: String(row[0]),
        takeHomePlan: Number(row[1] || 0),
        recurringMonthly: Number(row[2] || 0),
        recurringAnnual: Number(row[3] || 0),
        specialAnnual: Number(row[4] || 0),
        totalBudget: Number(row[5] || 0),
        assetIncreaseTarget: Number(row[6] || 0),
        yearEndPlan: Number(row[7] || 0),
        minimumAssetTarget: Number(row[8] || 0),
        buffer: Number(row[9] || 0)
      });
    }

    // 6. 費目別予算（経常・特別の分類ルールを含む）
    const itemBudgetSheet = ss.getSheetByName(SHEET_ITEM_BUDGETS);
    const itemBudgetRows = itemBudgetSheet ? itemBudgetSheet.getDataRange().getValues() : [];
    const itemBudgets = [];
    for (let i = 1; i < itemBudgetRows.length; i++) {
      const row = itemBudgetRows[i];
      if (!row[0] || !row[2]) continue;
      itemBudgets.push({
        fiscalYear: String(row[0]),
        budgetType: String(row[1] || ""),
        item: String(row[2] || ""),
        unit: String(row[3] || ""),
        budgetAmount: Number(row[4] || 0),
        expenseCategory: String(row[5] || ""),
        minimumAmount: Number(row[6] || 0),
        note: String(row[7] || "")
      });
    }

    // 7. 資産目標（暦年末の金融資産目標）
    const assetTargetSheet = ss.getSheetByName(SHEET_ASSET_TARGETS);
    const assetTargetRows = assetTargetSheet ? assetTargetSheet.getDataRange().getValues() : [];
    const assetTargets = [];
    for (let i = 1; i < assetTargetRows.length; i++) {
      const row = assetTargetRows[i];
      if (!row[0]) continue;
      assetTargets.push({
        calendarYear: Number(row[0]),
        targetAmount: Number(row[1] || 0),
        targetType: String(row[2] || ""),
        note: String(row[3] || "")
      });
    }

    return createJsonResponse({
      status: "success",
      assets: assets,
      incomes: incomes.reverse(),
      expenses: expenses.reverse(),
      subscriptions: subscriptions,
      annualBudgets: annualBudgets,
      itemBudgets: itemBudgets,
      assetTargets: assetTargets
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * POSTリクエスト処理：Webアプリからの支出または収入の追記を行います
 */
function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    initializeSheets(ss);

    let postData;
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else {
      postData = e.parameter;
    }

    const type = postData.type || "expense"; // "expense" または "income"

    if (type === "expense") {
      const expenseSheet = ss.getSheetByName(SHEET_EXPENSES);
      if (!expenseSheet) throw new Error("シート「支出記録」が見つかりません");
      
      const dateStr = postData.date || formatDate(new Date());
      const yearMonth = ""; // スプレッドシート側で自動入力されるため空欄で送信
      
      const category = postData.category || "その他";
      const amount = Number(postData.amount || 0);
      const description = postData.description || "";

      const nextRow = getLastRowForColumn(expenseSheet, 1) + 1;
      expenseSheet.getRange(nextRow, 1, 1, 5).setValues([[yearMonth, dateStr, category, amount, description]]);

    } else if (type === "income") {
      const incomeSheet = ss.getSheetByName(SHEET_INCOMES);
      if (!incomeSheet) throw new Error("シート「収入記録」が見つかりません");
      
      const yearMonth = postData.yearMonth || ""; 
      const incomeType = postData.incomeType || "給与所得";
      const grossPay = Number(postData.grossPay || 0);
      const incomeTax = Number(postData.incomeTax || 0);
      const inhabitantTax = Number(postData.inhabitantTax || 0);
      const socialInsurance = Number(postData.socialInsurance || 0);
      const otherDeductions = Number(postData.otherDeductions || 0);
      const deductionTotal = Number(postData.deductionTotal || 0);
      const transportation = Number(postData.transportation || 0);
      const takeHomePay = Number(postData.takeHomePay || 0);

      const nextRow = getLastRowForColumn(incomeSheet, 1) + 1;
      incomeSheet.getRange(nextRow, 1, 1, 10).setValues([[
        yearMonth, 
        incomeType, 
        grossPay, 
        incomeTax, 
        inhabitantTax, 
        socialInsurance, 
        otherDeductions, 
        deductionTotal, 
        transportation, 
        takeHomePay
      ]]);
    } else {
      throw new Error("無効なtypeパラメータです。");
    }

    return createJsonResponse({
      status: "success",
      message: `${type === "expense" ? "支出" : "収入"}を記録しました。`
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

function createJsonResponse(data) {
  const jsonString = JSON.stringify(data);
  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(dateVal) {
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
  return String(dateVal || "");
}

function initializeSheets(ss) {
  let assetSheet = ss.getSheetByName(SHEET_ASSETS);
  if (!assetSheet) {
    assetSheet = ss.insertSheet(SHEET_ASSETS);
    assetSheet.appendRow(["日付", "総資産", "預金・現金・暗号資産", "株式(現物)", "投資信託", "ポイント"]);
  }

  let incomeSheet = ss.getSheetByName(SHEET_INCOMES);
  if (!incomeSheet) {
    incomeSheet = ss.insertSheet(SHEET_INCOMES);
    incomeSheet.appendRow(["年月", "収入区分", "総支給額", "所得税", "住民税", "社会保険料", "その他控除", "控除合計", "交通費", "手取り"]);
  }

  let expenseSheet = ss.getSheetByName(SHEET_EXPENSES);
  if (!expenseSheet) {
    expenseSheet = ss.insertSheet(SHEET_EXPENSES);
    expenseSheet.appendRow(["年月", "日付", "項目", "金額", "備考"]);
  }

  let subSheet = ss.getSheetByName(SHEET_SUBSCRIPTIONS);
  if (!subSheet) {
    subSheet = ss.insertSheet(SHEET_SUBSCRIPTIONS);
    subSheet.appendRow(["年", "媒体名", "支出金額", "支払回数 / 年", "年間支払額", "月当たり支払額"]);
  }
}

/**
 * 特定の列（A列など）を基準に、実際に値が入力されている最終行番号を返します。
 * (シート全体のgetLastRowが書式のみの空行を返す問題への対策)
 */
function getLastRowForColumn(sheet, columnNumber) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return 0;
  const values = sheet.getRange(1, columnNumber, lastRow, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    const val = values[i][0];
    if (val !== "" && val !== null && val !== undefined) {
      return i + 1;
    }
  }
  return 0;
}

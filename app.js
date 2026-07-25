/* ==========================================================================
   MoneyManager - Frontend Logic (Light Mode & 4 Sheets Edition)
   ========================================================================== */

// --- App State ---
const state = {
    gasUrl: localStorage.getItem('kakeibo_gas_url') || '',
    assets: [],        // 週次資産記録
    incomes: [],       // 収入記録
    expenses: [],      // 支出記録
    subscriptions: [],  // サブスク管理
    expenseCategories: ["個人_食費", "交友_食費", "交通費", "家賃", "日用品・被服費", "医療費", "娯楽費", "教育費・研鑽費", "交際費", "旅費", "通信費", "雑費", "サブスク"],
    incomeTypes: ["給与所得", "配当所得", "譲渡所得", "その他"],
    currentMonth: new Date(2026, 6, 1), // デフォルト表示をデータが豊富な 2026年7月 に設定
    showAssetsBreakdown: false, // 資産の内訳表示フラグ
    isDemoMode: true
};

// --- Mock Data (Based on User's Spreadsheet Images) ---
const MOCK_ASSETS = [
    { date: "2026/04/25", total: 1690908, cash: 692152, stocks: 248840, trusts: 733501, points: 16415 },
    { date: "2026/05/02", total: 1469479, cash: 473792, stocks: 237200, trusts: 741982, points: 16505 },
    { date: "2026/05/09", total: 1479421, cash: 473624, stocks: 257600, trusts: 731692, points: 16505 },
    { date: "2026/05/16", total: 1851930, cash: 810037, stocks: 243120, trusts: 780841, points: 17932 },
    { date: "2026/05/23", total: 1817687, cash: 754057, stocks: 258720, trusts: 786975, points: 17935 },
    { date: "2026/05/30", total: 1611530, cash: 536293, stocks: 258720, trusts: 786975, points: 29542 },
    { date: "2026/06/06", total: 1610037, cash: 531007, stocks: 243200, trusts: 811129, points: 24701 },
    { date: "2026/06/13 8:35", total: 1584246, cash: 535039, stocks: 207920, trusts: 814861, points: 26426 },
    { date: "2026/06/20 8:43", total: 2001568, cash: 892352, stocks: 236520, trusts: 846269, points: 26427 },
    { date: "2026/06/27 8:52", total: 1914537, cash: 833201, stocks: 220520, trusts: 836333, points: 24483 },
    { date: "2026/07/04 8:44", total: 1885557, cash: 808705, stocks: 200440, trusts: 851638, points: 24774 },
    { date: "2026/07/11 8:37", total: 1903480, cash: 802551, stocks: 198600, trusts: 876846, points: 25483 },
    { date: "2026/07/18 8:28", total: 1613562, cash: 0, stocks: 199840, trusts: 879648, points: 26328 }
];

const MOCK_INCOMES = [
    { yearMonth: "2026年01月", incomeType: "給与所得", grossPay: 134554, incomeTax: 0, inhabitantTax: 0, socialInsurance: 0, otherDeductions: 0, deductionTotal: 0, transportation: 2804, takeHomePay: 131750 },
    { yearMonth: "2026-02", incomeType: "給与所得", grossPay: 125364, incomeTax: 0, inhabitantTax: 0, socialInsurance: 0, otherDeductions: 0, deductionTotal: 0, transportation: 4614, takeHomePay: 120750 },
    { yearMonth: "2026-03", incomeType: "給与所得", grossPay: 139435, incomeTax: 0, inhabitantTax: 0, socialInsurance: 0, otherDeductions: 0, deductionTotal: 0, transportation: 1810, takeHomePay: 137625 },
    { yearMonth: "2026年03月", incomeType: "譲渡所得", grossPay: 15600, incomeTax: 0, inhabitantTax: 0, socialInsurance: 0, otherDeductions: 0, deductionTotal: 0, transportation: 0, takeHomePay: 15600 },
    { yearMonth: "2026年04月", incomeType: "給与所得", grossPay: 103245, incomeTax: 0, inhabitantTax: 0, socialInsurance: 0, otherDeductions: 0, deductionTotal: 0, transportation: 3620, takeHomePay: 99625 },
    { yearMonth: "2026年04月", incomeType: "給与所得", grossPay: 300000, incomeTax: 7820, inhabitantTax: 0, socialInsurance: 1500, otherDeductions: 2260, deductionTotal: 11580, transportation: 0, takeHomePay: 288420 },
    { yearMonth: "2026年05月", incomeType: "給与所得", grossPay: 303690, incomeTax: 6640, inhabitantTax: 0, socialInsurance: 38463, otherDeductions: 2260, deductionTotal: 47363, transportation: 0, takeHomePay: 256327 },
    { yearMonth: "2026年06月", incomeType: "給与所得", grossPay: 325036, incomeTax: 7390, inhabitantTax: 0, socialInsurance: 38786, otherDeductions: 2260, deductionTotal: 48436, transportation: 0, takeHomePay: 276600 },
    { yearMonth: "2026年06月", incomeType: "給与所得", grossPay: 315000, incomeTax: 16824, inhabitantTax: 0, socialInsurance: 40366, otherDeductions: 0, deductionTotal: 57190, transportation: 0, takeHomePay: 257810 },
    { yearMonth: "2026年07月", incomeType: "給与所得", grossPay: 360023, incomeTax: 9290, inhabitantTax: 0, socialInsurance: 38779, otherDeductions: 2250, deductionTotal: 50319, transportation: 0, takeHomePay: 309704 }
];

const MOCK_EXPENSES = [
    { yearMonth: "2026/1", date: "2026/01/30", category: "旅費", amount: 13750, description: "旅行交通費" },
    { yearMonth: "2026/1", date: "2026/01/02", category: "娯楽費", amount: 100, description: "ゲームアプリ" },
    { yearMonth: "2026/1", date: "2026/01/02", category: "雑費", amount: 230, description: "コピー代" },
    { yearMonth: "2026/1", date: "2026/01/27", category: "旅費", amount: 8850, description: "新幹線予約" },
    { yearMonth: "2026/1", date: "2026/01/03", category: "娯楽費", amount: 440, description: "映画レンタル" },
    { yearMonth: "2026/1", date: "2026/01/05", category: "個人_食費", amount: 100, description: "自動販売機飲料" },
    { yearMonth: "2026/1", date: "2026/01/09", category: "交友_食費", amount: 4000, description: "居酒屋割り勘" },
    { yearMonth: "2026/1", date: "2026/01/08", category: "娯楽費", amount: 1500, description: "カラオケ" },
    { yearMonth: "2026/1", date: "2026/01/08", category: "交友_食費", amount: 2400, description: "カフェ代" },
    { yearMonth: "2026/1", date: "2026/01/09", category: "交通費", amount: 1598, description: "電車移動" },
    { yearMonth: "2026/1", date: "2026/01/08", category: "交通費", amount: 1190, description: "バス・電車" },
    { yearMonth: "2026/10", date: "2026/10/28", category: "娯楽費", amount: 17710, description: "遊園地チケット" },
    { yearMonth: "2026/12", date: "2026/12/17", category: "娯楽費", amount: 10890, description: "忘年会ゲーム" },
    { yearMonth: "2026/2", date: "2026/02/25", category: "旅費", amount: 32397, description: "ホテル宿泊" },
    { yearMonth: "2026/1", date: "2026/01/07", category: "交通費", amount: 406, description: "地下鉄" },
    { yearMonth: "2026/1", date: "2026/01/06", category: "交通費", amount: 406, description: "地下鉄" },
    { yearMonth: "2026/1", date: "2026/01/24", category: "日用品・被服費", amount: 2175, description: "ドラッグストア" },
    { yearMonth: "2026/1", date: "2026/01/24", category: "日用品・被服費", amount: 1400, description: "冬物インナー" },
    { yearMonth: "2026/1", date: "2026/01/25", category: "個人_食費", amount: 1615, description: "自炊食材" },
    // 2026年7月のデモデータ（現実に即したもの）
    { yearMonth: "2026/7", date: "2026/07/02", category: "個人_食費", amount: 890, description: "ランチ" },
    { yearMonth: "2026/7", date: "2026/07/05", category: "日用品・被服費", amount: 3200, description: "日用消耗品" },
    { yearMonth: "2026/7", date: "2026/07/10", category: "娯楽費", amount: 12000, description: "ライブチケット" },
    { yearMonth: "2026/7", date: "2026/07/12", category: "交友_食費", amount: 5500, description: "友人とのディナー" },
    { yearMonth: "2026/7", date: "2026/07/15", category: "交通費", amount: 2400, description: "Suicaチャージ" },
    { yearMonth: "2026/7", date: "2026/07/19", category: "個人_食費", amount: 4120, description: "週末買い出し" }
];

const MOCK_SUBSCRIPTIONS = [
    { year: 2026, name: "Google One", amount: 4400, paymentCount: 1, annualAmount: 4400, monthlyAmount: 367 },
    { year: 2026, name: "Netflix", amount: 700, paymentCount: 12, annualAmount: 8400, monthlyAmount: 700 },
    { year: 2026, name: "AmazonPrime", amount: 2950, paymentCount: 1, annualAmount: 2950, monthlyAmount: 246 },
    { year: 2026, name: "Spotify", amount: 590, paymentCount: 12, annualAmount: 7080, monthlyAmount: 590 }
];

// --- Chart Instances ---
let assetTrendChart = null;
let monthlyTrendChart = null;
let categoryDistributionChart = null;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    initCategories();
    initNavigation();
    initMonthSelector();
    initFormLogic();
    initCalculatorModal();
    initSettings();

    // GAS URLがある場合は自動ロードを試みる、なければデモモードで起動
    if (state.gasUrl) {
        syncWithGas();
    } else {
        loadDemoMode();
    }
});

// --- Category Init ---
function initCategories() {
    state.expenseCategories = ["個人_食費", "交友_食費", "交通費", "家賃", "日用品・被服費", "医療費", "娯楽費", "教育費・研鑽費", "交際費", "旅費", "通信費", "雑費", "サブスク"];
    localStorage.setItem('kakeibo_expense_categories', JSON.stringify(state.expenseCategories));
}

// --- Navigation ---
function initNavigation() {
    // メインタブ切り替え (サイドバーメニューおよびボトムナビゲーション)
    const navLinks = document.querySelectorAll('.sidebar-menu .menu-item, .bottom-nav .bottom-nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navLinks.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');

            // サイドバーとボトムナビ両方のアクティブ状態を同期
            navLinks.forEach(link => {
                if (link.getAttribute('data-tab') === tabId) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });

            // タブペインの表示切り替え
            tabPanes.forEach(pane => pane.classList.remove('active'));
            const targetPane = document.getElementById(`tab-${tabId}`);
            if (targetPane) targetPane.classList.add('active');

            updateHeaderInfo(tabId);
            
            if (tabId === 'dashboard') {
                renderDashboard();
            } else if (tabId === 'transactions') {
                // デフォルトで「支出明細」サブタブを表示
                document.querySelector('.sub-tab-btn[data-subtab="expense-list"]').click();
            } else if (tabId === 'add-transaction') {
                resetForms();
            } else if (tabId === 'settings') {
                renderSettings();
            }
        });
    });

    // サブタブ切り替え (取引明細画面)
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const subTabPanes = document.querySelectorAll('.sub-tab-pane');

    subTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const subtabId = btn.getAttribute('data-subtab');
            
            subTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            subTabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(`subtab-${subtabId}`).classList.add('active');

            if (subtabId === 'expense-list') {
                renderExpensesList();
            } else if (subtabId === 'income-list') {
                renderIncomesList();
            } else if (subtabId === 'sub-list') {
                renderSubscriptionsList();
            }
        });
    });

    // リンク遷移
    document.getElementById('view-all-expenses').addEventListener('click', (e) => {
        e.preventDefault();
        const txMenuItem = document.querySelector('.sidebar-menu [data-tab="transactions"]');
        if (txMenuItem) {
            txMenuItem.click();
            setTimeout(() => {
                document.querySelector('.sub-tab-btn[data-subtab="expense-list"]').click();
            }, 50);
        }
    });
}

function updateHeaderInfo(tabId) {
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    const monthSelector = document.querySelector('.month-selector');
    
    // dashboardかtransactionsの場合のみ月選択を表示
    if (monthSelector) {
        if (tabId === 'dashboard' || tabId === 'transactions') {
            monthSelector.style.display = 'flex';
        } else {
            monthSelector.style.display = 'none';
        }
    }
    
    switch (tabId) {
        case 'dashboard':
            titleEl.textContent = 'ダッシュボード';
            subtitleEl.textContent = '家計と資産の状況をリアルタイムに把握します。';
            break;
        case 'transactions':
            titleEl.textContent = '明細・履歴';
            subtitleEl.textContent = 'スプレッドシートから読み込んだ全記録を一覧表示します。';
            break;
        case 'add-transaction':
            titleEl.textContent = '取引を追加';
            subtitleEl.textContent = 'スプレッドシートの「支出記録」または「収入記録」にデータを記録します。';
            break;
        case 'settings':
            titleEl.textContent = '設定';
            subtitleEl.textContent = 'スプレッドシート連携やカテゴリの設定を行います。';
            break;
    }
}

// --- Month Selector ---
function initMonthSelector() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const syncBtn = document.getElementById('sync-button');

    prevBtn.addEventListener('click', () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
        updateMonthDisplay();
        refreshActiveViews();
    });

    nextBtn.addEventListener('click', () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
        updateMonthDisplay();
        refreshActiveViews();
    });

    syncBtn.addEventListener('click', () => {
        if (state.gasUrl) {
            syncWithGas();
        } else {
            showToast('GAS URLが未設定です。「設定」タブから保存してください。', 'danger');
        }
    });

    updateMonthDisplay();
}

function updateMonthDisplay() {
    const displayEl = document.getElementById('current-month-display');
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth() + 1;
    displayEl.textContent = `${year}年${month}月`;
}

function refreshActiveViews() {
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
        renderDashboard();
    }
    if (document.getElementById('tab-transactions').classList.contains('active')) {
        const activeSubtab = document.querySelector('.sub-tab-btn.active').getAttribute('data-subtab');
        if (activeSubtab === 'expense-list') renderExpensesList();
        else if (activeSubtab === 'income-list') renderIncomesList();
    }
}

// --- Connection & Data Loading ---
function showLoading(show) {
    const loader = document.getElementById('loading-overlay');
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

function updateConnectionStatusUI() {
    const dot = document.querySelector('#connection-status .status-dot');
    const text = document.querySelector('#connection-status .status-text');
    const desc = document.getElementById('status-desc');
    const disconnectBtn = document.getElementById('disconnect-gas');

    if (state.isDemoMode) {
        dot.className = 'status-dot warning';
        text.textContent = 'デモモード動作中';
        desc.textContent = 'GASのURLを設定するとスプレッドシートと同期します。';
        disconnectBtn.classList.add('hidden');
    } else {
        dot.className = 'status-dot success';
        text.textContent = 'スプレッドシート同期中';
        desc.textContent = '4つのシートから正常に自動取得しています。';
        disconnectBtn.classList.remove('hidden');
    }
}

async function syncWithGas() {
    if (!state.gasUrl) return;
    showLoading(true);

    try {
        const apiUrl = state.gasUrl + (state.gasUrl.includes('?') ? '&' : '?') + 'api=1';
        const response = await fetch(apiUrl, { method: 'GET' });
        if (!response.ok) throw new Error('ネットワーク接続が失敗しました。');
        
        const data = await response.json();
        
        if (data.status === 'success') {
            state.assets = data.assets || [];
            state.incomes = data.incomes || [];
            state.expenses = data.expenses || [];
            state.subscriptions = data.subscriptions || [];

            state.isDemoMode = false;
            updateConnectionStatusUI();
            renderDashboard();
            showToast('スプレッドシートとデータを同期しました！', 'success');
        } else {
            throw new Error(data.message || 'データパースエラー');
        }
    } catch (error) {
        console.error('Sync Error:', error);
        showToast('同期に失敗しました。URLとシートの共有設定を確認してください。', 'danger');
        loadDemoMode();
    } finally {
        showLoading(false);
    }
}

function loadDemoMode() {
    state.isDemoMode = true;
    updateConnectionStatusUI();

    // デモデータの取得
    const localAssets = localStorage.getItem('kakeibo_demo_assets');
    const localIncomes = localStorage.getItem('kakeibo_demo_incomes');
    const localExpenses = localStorage.getItem('kakeibo_demo_expenses');
    const localSubs = localStorage.getItem('kakeibo_demo_subs');

    state.assets = localAssets ? JSON.parse(localAssets) : MOCK_ASSETS;
    state.incomes = localIncomes ? JSON.parse(localIncomes) : MOCK_INCOMES;
    state.expenses = localExpenses ? JSON.parse(localExpenses) : MOCK_EXPENSES;
    state.subscriptions = localSubs ? JSON.parse(localSubs) : MOCK_SUBSCRIPTIONS;

    // 初回保存
    if (!localAssets) {
        localStorage.setItem('kakeibo_demo_assets', JSON.stringify(state.assets));
        localStorage.setItem('kakeibo_demo_incomes', JSON.stringify(state.incomes));
        localStorage.setItem('kakeibo_demo_expenses', JSON.stringify(state.expenses));
        localStorage.setItem('kakeibo_demo_subs', JSON.stringify(state.subscriptions));
    }

    renderDashboard();
}

// --- Dashboard Render Logic ---
function renderDashboard() {
    // 1. 各集計値の計算
    // サブスク月額合計の計算
    let totalSubsMonthly = 0;
    state.subscriptions.forEach(sub => {
        totalSubsMonthly += sub.monthlyAmount || 0;
    });

    // 基準日（Day）の決定
    const today = new Date();
    let targetDay = 31; // デフォルトは末日（安全のため大きい数値）
    const isCurrentMonth = today.getFullYear() === state.currentMonth.getFullYear() && today.getMonth() === state.currentMonth.getMonth();

    if (isCurrentMonth) {
        targetDay = today.getDate();
    } else if (state.currentMonth > today) {
        targetDay = 1; // 未来の月の場合は1日
    } else {
        // 過去の月の場合は、その月の末日を取得
        targetDay = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 0).getDate();
    }

    // 前月の取得
    const prevMonthDate = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);

    // 今月の手取り収入の集計
    const currentIncomes = filterIncomesByMonth(state.incomes, state.currentMonth);
    let totalIncome = 0;
    currentIncomes.forEach(inc => {
        totalIncome += inc.takeHomePay || 0;
    });

    // 前月の手取り収入の集計
    const prevIncomes = filterIncomesByMonth(state.incomes, prevMonthDate);
    let prevTotalIncome = 0;
    prevIncomes.forEach(inc => {
        prevTotalIncome += inc.takeHomePay || 0;
    });

    // 収入の前月比
    const incomeDiff = totalIncome - prevTotalIncome;
    const incomeDiffSign = incomeDiff >= 0 ? "+" : "";
    const incomeTrendText = `前月比: ${incomeDiffSign}${formatCurrency(incomeDiff)}`;

    // 今月の支出の集計 (1日〜基準日までの変動費)
    const currentExpenses = filterExpensesByMonth(state.expenses, state.currentMonth);
    const currentExpensesToTargetDay = currentExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return !isNaN(expDate.getTime()) && expDate.getDate() <= targetDay;
    });
    let currentExpensesTotal = currentExpensesToTargetDay.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    
    // 今月の総支出（1日〜基準日までの変動費 + サブスク）
    const totalExpenses = currentExpensesTotal + totalSubsMonthly;

    // 前月の同日時点の支出集計
    const prevExpenses = filterExpensesByMonth(state.expenses, prevMonthDate);
    const prevExpensesToTargetDay = prevExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return !isNaN(expDate.getTime()) && expDate.getDate() <= targetDay;
    });
    let prevExpensesTotal = prevExpensesToTargetDay.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const prevTotalExpenses = prevExpensesTotal + totalSubsMonthly;

    // 支出の前月同日比
    const expenseDiff = totalExpenses - prevTotalExpenses;
    const expenseDiffSign = expenseDiff >= 0 ? "+" : "";
    const expenseTrendText = isCurrentMonth 
        ? `前月同日比: ${expenseDiffSign}${formatCurrency(expenseDiff)}`
        : `前月比: ${expenseDiffSign}${formatCurrency(expenseDiff)}`;

    // 最新の総資産額の取得 (週次資産記録の最新行)
    let latestAssetVal = 0;
    let latestAssetDate = "週次データなし";
    let assetTrendText = "";

    if (state.assets.length > 0) {
        // 日付でソートした最新のものを取得
        const sortedAssets = [...state.assets].sort((a, b) => new Date(a.date.split(" ")[0]) - new Date(b.date.split(" ")[0]));
        const latest = sortedAssets[sortedAssets.length - 1];
        latestAssetVal = latest.total;
        latestAssetDate = `${latest.date.substring(5)} 更新`;

        // 前月の一番若い（最も古い日付の）レコードを探す
        const prevMonthYear = prevMonthDate.getFullYear();
        const prevMonthMonth = prevMonthDate.getMonth();
        const prevMonthAssets = sortedAssets.filter(a => {
            if (!a || !a.date) return false;
            const parts = String(a.date).split(" ");
            if (parts.length === 0) return false;
            const d = new Date(parts[0]);
            return !isNaN(d.getTime()) && d.getFullYear() === prevMonthYear && d.getMonth() === prevMonthMonth;
        });

        if (prevMonthAssets.length > 0) {
            const firstAssetOfPrevMonth = prevMonthAssets[0]; // ソート済みのため最初が一番古い
            const diff = latestAssetVal - firstAssetOfPrevMonth.total;
            const diffSign = diff >= 0 ? "+" : "";
            assetTrendText = ` (前月比: ${diffSign}${formatCurrency(diff)})`;
        }
    }

    // 2. カードの描画更新
    document.getElementById('total-assets').textContent = formatCurrency(latestAssetVal);
    document.getElementById('assets-update-date').innerHTML = `<i class="fa-solid fa-clock"></i> <span>${latestAssetDate}${assetTrendText}</span>`;
    
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('income-desc').innerHTML = `<span>${incomeTrendText}</span>`;
    
    // 表示上は今月全体の総支出を表示しつつ、トレンドに前月同日比を表示する
    const allExpensesTotal = currentExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) + totalSubsMonthly;
    document.getElementById('total-expenses').textContent = formatCurrency(allExpensesTotal);
    document.getElementById('expense-desc-card').innerHTML = `<span>変動費: ${formatCurrency(allExpensesTotal - totalSubsMonthly)} ＋ サブスク (${expenseTrendText})</span>`;
    
    document.getElementById('total-subs-monthly').textContent = formatCurrency(totalSubsMonthly);
    document.getElementById('total-subs-count').innerHTML = `<span>契約数: ${state.subscriptions.length} 件</span>`;

    // 3. グラフの描画
    renderAssetChart();
    renderCashflowChart();
    renderCategoryDoughnut(currentExpenses);

    // 4. 最近の支出一覧（最大5件）
    renderRecentExpenses(currentExpenses);

    // 5. サブスク一覧
    renderActiveSubsTable();
}

function renderRecentExpenses(currentMonthExpenses) {
    const tbody = document.getElementById('recent-expenses-tbody');
    tbody.innerHTML = '';

    const recent = currentMonthExpenses.slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">今月の支出データはありません。</td></tr>';
        return;
    }

    recent.forEach(exp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDayAndWeek(exp.date)}</td>
            <td><span class="badge">${exp.category}</span></td>
            <td>${exp.description || '---'}</td>
            <td class="text-right text-danger">-${formatCurrency(exp.amount)}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderActiveSubsTable() {
    const tbody = document.getElementById('active-subs-tbody');
    tbody.innerHTML = '';

    if (state.subscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">契約中のサブスクはありません。</td></tr>';
        return;
    }

    state.subscriptions.forEach(sub => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${sub.name}</strong></td>
            <td>年 ${sub.paymentCount} 回</td>
            <td>${formatCurrency(sub.amount)}</td>
            <td class="text-right font-bold text-primary">${formatCurrency(sub.monthlyAmount)} /月</td>
        `;
        tbody.appendChild(row);
    });
}

// --- Chart.js Draw Functions (Light Mode Custom Styling) ---

// 週次資産推移チャート
function renderAssetChart() {
    const ctx = document.getElementById('asset-trend-chart').getContext('2d');
    
    // 日付昇順でソート
    const sortedAssets = [...state.assets].sort((a, b) => new Date(a.date.split(" ")[0]) - new Date(b.date.split(" ")[0]));
    const labels = sortedAssets.map(a => a.date.split(" ")[0].substring(5)); // 月/日のみ

    if (assetTrendChart) {
        assetTrendChart.destroy();
    }

    // テーマカラーとフォント
    const fontConfig = { family: 'Plus Jakarta Sans', size: 11, color: '#475569' };

    if (!state.showAssetsBreakdown) {
        // 総資産のみの一本のライン
        const totals = sortedAssets.map(a => a.total);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

        assetTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '総資産額',
                    data: totals,
                    borderColor: '#4f46e5',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.25,
                    pointBackgroundColor: '#4f46e5',
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` 総資産: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#e2e8f0' }, ticks: { font: fontConfig, color: '#475569' } },
                    y: {
                        grid: { color: '#e2e8f0' },
                        ticks: {
                            font: fontConfig,
                            color: '#475569',
                            callback: (val) => val >= 10000 ? (val / 10000) + '万円' : val + '円'
                        }
                    }
                }
            }
        });
    } else {
        // 内訳表示 (積み上げ面グラフ)
        const cash = sortedAssets.map(a => a.cash);
        const stocks = sortedAssets.map(a => a.stocks);
        const trusts = sortedAssets.map(a => a.trusts);
        const points = sortedAssets.map(a => a.points);

        assetTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '預金・現金・暗号資産',
                        data: cash,
                        borderColor: '#3b82f6', // 青
                        backgroundColor: 'rgba(59, 130, 246, 0.35)',
                        fill: true,
                        tension: 0.25,
                        pointBackgroundColor: '#3b82f6'
                    },
                    {
                        label: '投資信託',
                        data: trusts,
                        borderColor: '#10b981', // 緑
                        backgroundColor: 'rgba(16, 185, 129, 0.35)',
                        fill: true,
                        tension: 0.25,
                        pointBackgroundColor: '#10b981'
                    },
                    {
                        label: '株式(現物)',
                        data: stocks,
                        borderColor: '#a855f7', // 紫
                        backgroundColor: 'rgba(168, 85, 247, 0.35)',
                        fill: true,
                        tension: 0.25,
                        pointBackgroundColor: '#a855f7'
                    },
                    {
                        label: 'ポイント',
                        data: points,
                        borderColor: '#f59e0b', // 黄色
                        backgroundColor: 'rgba(245, 158, 11, 0.35)',
                        fill: true,
                        tension: 0.25,
                        pointBackgroundColor: '#f59e0b'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#475569' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { color: '#e2e8f0' }, ticks: { font: fontConfig, color: '#475569' } },
                    y: {
                        stacked: true,
                        grid: { color: '#e2e8f0' },
                        ticks: {
                            font: fontConfig,
                            color: '#475569',
                            callback: (val) => val >= 10000 ? (val / 10000) + '万円' : val + '円'
                        }
                    }
                }
            }
        });
    }
}

// 資産グラフ切替ボタンのバインド
document.getElementById('btn-toggle-total').addEventListener('click', () => {
    document.getElementById('btn-toggle-total').classList.add('active');
    document.getElementById('btn-toggle-breakdown').classList.remove('active');
    state.showAssetsBreakdown = false;
    renderAssetChart();
});
document.getElementById('btn-toggle-breakdown').addEventListener('click', () => {
    document.getElementById('btn-toggle-breakdown').classList.add('active');
    document.getElementById('btn-toggle-total').classList.remove('active');
    state.showAssetsBreakdown = true;
    renderAssetChart();
});

// 月次収支推移 (過去6ヶ月)
function renderCashflowChart() {
    const ctx = document.getElementById('monthly-trend-chart').getContext('2d');
    
    // サブスク月額合計の取得
    let totalSubsMonthly = 0;
    state.subscriptions.forEach(sub => {
        totalSubsMonthly += sub.monthlyAmount || 0;
    });

    // 過去6ヶ月
    const months = [];
    const now = new Date(state.currentMonth);
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            label: `${d.getFullYear()}/${d.getMonth() + 1}`,
            year: d.getFullYear(),
            month: d.getMonth()
        });
    }

    const incomesData = Array(6).fill(0);
    const expensesData = Array(6).fill(0);

    // 収入集計 (手取り)
    state.incomes.forEach(inc => {
        const parsed = parseYearMonth(inc.yearMonth);
        if (parsed) {
            months.forEach((m, idx) => {
                if (parsed.year === m.year && parsed.month === m.month) {
                    incomesData[idx] += inc.takeHomePay || 0;
                }
            });
        }
    });

    // 支出集計 (支出額 + サブスク月割)
    state.expenses.forEach(exp => {
        const parsed = parseYearMonth(exp.yearMonth);
        if (parsed) {
            months.forEach((m, idx) => {
                if (parsed.year === m.year && parsed.month === m.month) {
                    expensesData[idx] += exp.amount || 0;
                }
            });
        }
    });

    // すべての月にサブスク月額を上乗せ (その月にデータがある場合のみ、または全月一律)
    months.forEach((m, idx) => {
        expensesData[idx] += totalSubsMonthly;
    });

    if (monthlyTrendChart) {
        monthlyTrendChart.destroy();
    }

    monthlyTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(m => m.label),
            datasets: [
                {
                    label: '手取り収入',
                    data: incomesData,
                    backgroundColor: '#10b981', // 緑
                    borderRadius: 4
                },
                {
                    label: '総支出 (サブスク含)',
                    data: expensesData,
                    backgroundColor: '#f43f5e', // 赤
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#475569' }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans' }, color: '#475569' } },
                y: {
                    grid: { color: '#e2e8f0' },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 10 },
                        color: '#475569',
                        callback: (val) => val >= 10000 ? (val / 10000) + '万円' : val + '円'
                    }
                }
            }
        }
    });
}

// カテゴリ別支出割合 (ドーナツ)
function renderCategoryDoughnut(currentMonthExpenses) {
    const ctx = document.getElementById('category-distribution-chart').getContext('2d');

    const expenseByCat = {};
    currentMonthExpenses.forEach(exp => {
        expenseByCat[exp.category] = (expenseByCat[exp.category] || 0) + exp.amount;
    });

    const labels = Object.keys(expenseByCat);
    const dataVals = Object.values(expenseByCat);

    if (categoryDistributionChart) {
        categoryDistributionChart.destroy();
    }

    if (dataVals.length === 0) {
        categoryDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['データなし'],
                datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], borderWidth: 0 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    } else {
        const colors = ['#4f46e5', '#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#64748b'];

        categoryDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: { family: 'Plus Jakarta Sans', size: 11 },
                            color: '#475569',
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
}

// --- Transactions List Tables Rendering ---

// 支出明細の描画
let expenseFilterState = { search: '', category: 'all' };

function renderExpensesList() {
    const currentMonthExpenses = filterExpensesByMonth(state.expenses, state.currentMonth);
    
    // カテゴリフィルターリストの更新
    const catSelect = document.getElementById('filter-expense-cat');
    const prevVal = catSelect.value;
    const cats = new Set();
    currentMonthExpenses.forEach(e => cats.add(e.category));
    
    catSelect.innerHTML = '<option value="all">すべて</option>';
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catSelect.appendChild(opt);
    });

    if (cats.has(prevVal)) {
        catSelect.value = prevVal;
        expenseFilterState.category = prevVal;
    } else {
        expenseFilterState.category = 'all';
    }

    // フィルタの適用
    const displayList = currentMonthExpenses.filter(exp => {
        const matchSearch = expenseFilterState.search === '' || 
            (exp.description && exp.description.toLowerCase().includes(expenseFilterState.search.toLowerCase())) ||
            (exp.category && exp.category.toLowerCase().includes(expenseFilterState.search.toLowerCase()));
        
        const matchCat = expenseFilterState.category === 'all' || exp.category === expenseFilterState.category;

        return matchSearch && matchCat;
    });

    const tbody = document.getElementById('expense-table-tbody');
    tbody.innerHTML = '';
    document.getElementById('expense-count').textContent = `今月の支出明細: 全 ${displayList.length} 件`;

    if (displayList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">条件に該当する支出明細はありません。</td></tr>';
        return;
    }

    displayList.forEach(exp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDayAndWeek(exp.date)}</td>
            <td><span class="badge">${exp.category}</span></td>
            <td>${exp.description || '---'}</td>
            <td class="text-right text-danger font-bold">-${formatCurrency(exp.amount)}</td>
        `;
        tbody.appendChild(row);
    });
}

// 支出フィルターのイベント
document.getElementById('expense-search').addEventListener('input', (e) => {
    expenseFilterState.search = e.target.value;
    renderExpensesList();
});

document.getElementById('filter-expense-cat').addEventListener('change', (e) => {
    expenseFilterState.category = e.target.value;
    renderExpensesList();
});

document.getElementById('reset-expense-filters').addEventListener('click', () => {
    document.getElementById('expense-search').value = '';
    document.getElementById('filter-expense-cat').value = 'all';
    expenseFilterState = { search: '', category: 'all' };
    renderExpensesList();
});

// 収入明細の描画
function renderIncomesList() {
    const tbody = document.getElementById('income-table-tbody');
    tbody.innerHTML = '';
    
    // 現在選択されている月の収入をフィルタリング
    const currentMonthIncomes = filterIncomesByMonth(state.incomes, state.currentMonth);
    
    document.getElementById('income-count').textContent = `今月の収入明細: 全 ${currentMonthIncomes.length} 件`;

    if (currentMonthIncomes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">今月の収入明細はありません。</td></tr>';
        return;
    }

    currentMonthIncomes.forEach(inc => {
        // 表示用に月のみを抽出 (例: "2026年07月" -> "7月")
        const parsed = parseYearMonth(inc.yearMonth);
        const monthDisplay = parsed ? (parsed.month + 1) + '月' : inc.yearMonth;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${monthDisplay}</strong></td>
            <td><span class="badge-type income">${inc.incomeType}</span></td>
            <td>${formatCurrency(inc.grossPay)}</td>
            <td class="text-muted">${formatCurrency(inc.incomeTax)}</td>
            <td class="text-muted">${formatCurrency(inc.inhabitantTax)}</td>
            <td class="text-muted">${formatCurrency(inc.socialInsurance)}</td>
            <td class="text-muted">${formatCurrency(inc.otherDeductions)}</td>
            <td class="text-danger">${formatCurrency(inc.deductionTotal)}</td>
            <td>${formatCurrency(inc.transportation)}</td>
            <td class="text-right text-success font-bold">${formatCurrency(inc.takeHomePay)}</td>
        `;
        tbody.appendChild(row);
    });
}

// サブスク一覧明細の描画
function renderSubscriptionsList() {
    const tbody = document.getElementById('sub-table-tbody');
    tbody.innerHTML = '';

    if (state.subscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">サブスクデータが登録されていません。</td></tr>';
        return;
    }

    state.subscriptions.forEach(sub => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sub.year}年</td>
            <td><strong>${sub.name}</strong></td>
            <td>${formatCurrency(sub.amount)}</td>
            <td>年 ${sub.paymentCount} 回</td>
            <td>${formatCurrency(sub.annualAmount)}</td>
            <td class="text-right font-bold text-primary">${formatCurrency(sub.monthlyAmount)} /月</td>
        `;
        tbody.appendChild(row);
    });
}

// --- Add Transaction Form Handlers ---
function initFormLogic() {
    // 支出・収入フォーム切替トグル
    const btnExp = document.getElementById('form-select-expense');
    const btnInc = document.getElementById('form-select-income');
    const formExp = document.getElementById('expense-form');
    const formInc = document.getElementById('income-form');

    btnExp.addEventListener('click', () => {
        btnExp.classList.add('active');
        btnInc.classList.remove('active');
        formExp.classList.remove('hidden');
        formInc.classList.add('hidden');
    });

    btnInc.addEventListener('click', () => {
        btnInc.classList.add('active');
        btnExp.classList.remove('active');
        formInc.classList.remove('hidden');
        formExp.classList.add('hidden');
    });

    // 1. 支出フォーム初期日付
    const expDateInput = document.getElementById('exp-date');
    const today = new Date();
    expDateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 支出カテゴリの挿入
    updateExpenseCategoryDropdown();

    // 2. 収入フォームのリアルタイム計算処理
    const incGross = document.getElementById('inc-gross');
    const incTaxIncome = document.getElementById('inc-tax-income');
    const incTaxInhabitant = document.getElementById('inc-tax-inhabitant');
    const incSocial = document.getElementById('inc-social');
    const incOther = document.getElementById('inc-other-deduct');
    const incTransport = document.getElementById('inc-transport');

    // 本日の月をデフォルトセット
    const incYearMonthInput = document.getElementById('inc-yearmonth');
    incYearMonthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const calcFields = [incGross, incTaxIncome, incTaxInhabitant, incSocial, incOther, incTransport];
    calcFields.forEach(field => {
        field.addEventListener('input', calculateIncomeOutputs);
    });

    // 3. 支出フォームの送信
    formExp.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(formExp);
        const date = fd.get('date');
        const amount = Number(fd.get('amount'));
        const category = fd.get('category');
        const description = fd.get('description');

        const dateObj = new Date(date);
        const yearMonth = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}`;
        const newExpense = {
            type: 'expense',
            yearMonth,
            date: date.replace(/-/g, '/'),
            category,
            amount,
            description
        };

        showLoading(true);

        try {
            if (state.isDemoMode) {
                newExpense.id = 'demo-exp-' + Date.now();
                state.expenses.unshift(newExpense);
                localStorage.setItem('kakeibo_demo_expenses', JSON.stringify(state.expenses));
                showToast('【デモモード】ローカルに支出を一時保存しました。スプレッドシートには反映されません。', 'warning');
                onTransactionSaved();
            } else {
                console.log("Sending POST to GAS:", state.gasUrl, newExpense);
                const response = await fetch(state.gasUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    body: JSON.stringify(newExpense)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTPエラー! ステータス: ${response.status} (${response.statusText})`);
                }

                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error("GASからのレスポンスをJSONとして解析できませんでした。Webアプリの公開設定が「全員(Anyone)」になっているか確認してください。");
                }

                console.log("GAS Response Received:", data);

                if (data.status === 'success') {
                    showToast('スプレッドシートに支出を追記しました！', 'success');
                    await syncWithGas();
                    onTransactionSaved();
                } else {
                    throw new Error(data.message || "スプレッドシートへの保存に失敗しました。");
                }
            }
        } catch (err) {
            console.error("Save Transaction Error:", err);
            showToast('保存に失敗しました: ' + err.message, 'danger');
        } finally {
            showLoading(false);
        }
    });

    // 4. 収入フォームの送信
    formInc.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(formInc);
        
        // 年月のフォーマット変更 (2026-07 -> 2026年07月 にしてスプレッドシートの表記ゆれに合わせる)
        const ymVal = fd.get('yearMonth'); // YYYY-MM
        const parts = ymVal.split('-');
        const yearMonthFormatted = `${parts[0]}年${parts[1]}月`;

        const grossPay = Number(fd.get('grossPay'));
        const incomeTax = Number(fd.get('incomeTax') || 0);
        const inhabitantTax = Number(fd.get('inhabitantTax') || 0);
        const socialInsurance = Number(fd.get('socialInsurance') || 0);
        const otherDeductions = Number(fd.get('otherDeductions') || 0);
        const transportation = Number(fd.get('transportation') || 0);
        
        // 計算
        const deductionTotal = incomeTax + inhabitantTax + socialInsurance + otherDeductions;
        const takeHomePay = grossPay - deductionTotal - transportation;

        const newIncome = {
            type: 'income',
            yearMonth: yearMonthFormatted,
            incomeType: fd.get('incomeType'),
            grossPay,
            incomeTax,
            inhabitantTax,
            socialInsurance,
            otherDeductions,
            deductionTotal,
            transportation,
            takeHomePay
        };

        showLoading(true);

        try {
            if (state.isDemoMode) {
                newIncome.id = 'demo-inc-' + Date.now();
                state.incomes.unshift(newIncome);
                localStorage.setItem('kakeibo_demo_incomes', JSON.stringify(state.incomes));
                showToast('【デモモード】ローカルに収入を一時保存しました。スプレッドシートには反映されません。', 'warning');
                onTransactionSaved();
            } else {
                console.log("Sending POST to GAS:", state.gasUrl, newIncome);
                const response = await fetch(state.gasUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    body: JSON.stringify(newIncome)
                });

                if (!response.ok) {
                    throw new Error(`HTTPエラー! ステータス: ${response.status} (${response.statusText})`);
                }

                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error("GASからのレスポンスをJSONとして解析できませんでした。Webアプリの公開設定が「全員(Anyone)」になっているか確認してください。");
                }

                console.log("GAS Response Received:", data);

                if (data.status === 'success') {
                    showToast('スプレッドシートに収入を追記しました！', 'success');
                    await syncWithGas();
                    onTransactionSaved();
                } else {
                    throw new Error(data.message || "スプレッドシートへの保存に失敗しました。");
                }
            }
        } catch (err) {
            console.error("Save Transaction Error:", err);
            showToast('保存に失敗しました: ' + err.message, 'danger');
        } finally {
            showLoading(false);
        }
    });
}

// 支出項目カテゴリのプルダウン更新
function updateExpenseCategoryDropdown() {
    const select = document.getElementById('exp-category');
    select.innerHTML = '<option value="" disabled selected>選択してください</option>';
    
    state.expenseCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

// 手取りと控除のリアルタイム算出
function calculateIncomeOutputs() {
    const gross = Number(document.getElementById('inc-gross').value) || 0;
    const incTax = Number(document.getElementById('inc-tax-income').value) || 0;
    const inhabTax = Number(document.getElementById('inc-tax-inhabitant').value) || 0;
    const social = Number(document.getElementById('inc-social').value) || 0;
    const other = Number(document.getElementById('inc-other-deduct').value) || 0;
    const transport = Number(document.getElementById('inc-transport').value) || 0;

    const deductionTotal = incTax + inhabTax + social + other;
    const takeHome = gross - deductionTotal - transport;

    document.getElementById('preview-deduction-total').textContent = formatCurrency(deductionTotal);
    document.getElementById('preview-takehome-pay').textContent = formatCurrency(takeHome);
}

function resetForms() {
    const expForm = document.getElementById('expense-form');
    const incForm = document.getElementById('income-form');
    
    expForm.reset();
    incForm.reset();

    const today = new Date();
    document.getElementById('exp-date').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    document.getElementById('inc-yearmonth').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    // デフォルト値
    document.getElementById('inc-other-deduct').value = 2260;
    
    calculateIncomeOutputs();
    document.getElementById('form-select-expense').click();
}

function onTransactionSaved() {
    resetForms();
    // ダッシュボードに移動
    const dbMenuItem = document.querySelector('.sidebar-menu [data-tab="dashboard"]');
    if (dbMenuItem) dbMenuItem.click();
}

// --- Social Insurance Calculator Modal ---
function initCalculatorModal() {
    const modal = document.getElementById('calc-modal');
    const openBtn = document.getElementById('btn-open-calc');
    const closeBtn = document.getElementById('btn-close-calc');
    const cancelBtn = document.getElementById('btn-cancel-calc');
    const applyBtn = document.getElementById('btn-apply-calc');

    const health = document.getElementById('calc-health');
    const pension = document.getElementById('calc-pension');
    const employ = document.getElementById('calc-employment');
    const care = document.getElementById('calc-care');
    const sumTotalEl = document.getElementById('calc-sum-total');

    function calculateModalSum() {
        const sum = (Number(health.value) || 0) +
                    (Number(pension.value) || 0) +
                    (Number(employ.value) || 0) +
                    (Number(care.value) || 0);
        sumTotalEl.textContent = formatCurrency(sum);
        return sum;
    }

    [health, pension, employ, care].forEach(input => {
        input.addEventListener('input', calculateModalSum);
    });

    openBtn.addEventListener('click', () => {
        // 初期リセット
        health.value = '';
        pension.value = '';
        employ.value = '';
        care.value = '';
        sumTotalEl.textContent = '¥0';
        
        modal.classList.remove('hidden');
    });

    function closeModal() {
        modal.classList.add('hidden');
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    applyBtn.addEventListener('click', () => {
        const sum = calculateModalSum();
        const socialInput = document.getElementById('inc-social');
        socialInput.value = sum;
        
        // リアルタイム変更をメインフォームへ通知
        calculateIncomeOutputs();
        
        closeModal();
        showToast('社会保険料を計算結果に更新しました。', 'success');
    });
}

// --- Settings Section Logic ---
function initSettings() {
    document.getElementById('save-gas-url').addEventListener('click', async () => {
        const url = document.getElementById('gas-url').value.trim();
        if (!url) {
            showToast('有効なURLを入力してください。', 'danger');
            return;
        }

        showLoading(true);

        try {
            console.log("Testing GAS URL connection:", url);
            const apiUrl = url + (url.includes('?') ? '&' : '?') + 'api=1';
            const response = await fetch(apiUrl, { method: 'GET' });
            
            if (!response.ok) {
                throw new Error(`HTTPエラー! ステータス: ${response.status} (${response.statusText})`);
            }

            let data;
            try {
                data = await response.json();
            } catch (jsonErr) {
                throw new Error("GASからのレスポンスをJSONとして解析できませんでした。Webアプリの公開設定が「全員(Anyone)」になっているか確認してください。");
            }

            console.log("GAS Connection Test Response:", data);

            if (data.status === 'success') {
                state.gasUrl = url;
                localStorage.setItem('kakeibo_gas_url', url);
                state.isDemoMode = false;
                
                state.assets = data.assets || [];
                state.incomes = data.incomes || [];
                state.expenses = data.expenses || [];
                state.subscriptions = data.subscriptions || [];

                updateConnectionStatusUI();
                renderDashboard();
                showToast('スプレッドシート連携に成功しました！', 'success');
            } else {
                throw new Error(data.message || 'データ構造が正常ではありません。');
            }
        } catch (err) {
            console.error("Connection Test Error:", err);
            showToast('接続に失敗しました: ' + err.message, 'danger');
        } finally {
            showLoading(false);
        }
    });

    document.getElementById('disconnect-gas').addEventListener('click', () => {
        if (confirm('スプレッドシート連携を解除し、デモモードに戻しますか？')) {
            state.gasUrl = '';
            localStorage.removeItem('kakeibo_gas_url');
            loadDemoMode();
            document.getElementById('gas-url').value = '';
            showToast('連携を解除しました。', 'success');
        }
    });

    document.getElementById('save-categories').addEventListener('click', () => {
        const input = document.getElementById('settings-expense-categories').value;
        state.expenseCategories = input.split(',').map(s => s.trim()).filter(Boolean);
        localStorage.setItem('kakeibo_expense_categories', JSON.stringify(state.expenseCategories));

        updateExpenseCategoryDropdown();
        renderSettings();
        showToast('カテゴリ設定を保存しました。', 'success');
    });
}

function renderSettings() {
    document.getElementById('gas-url').value = state.gasUrl;
    document.getElementById('settings-expense-categories').value = state.expenseCategories.join(', ');
}

// --- Helper Functions ---

// 金額フォーマット (¥1,234)
function formatCurrency(amount) {
    return '¥' + Math.round(amount).toLocaleString('ja-JP');
}

// スプレッドシート内の年月表現のゆれを解決してパース
function parseYearMonth(str) {
    if (!str) return null;
    str = String(str).trim();
    
    // "2026年01月" パターン
    let m = str.match(/^(\d{4})年(\d{1,2})月$/);
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) - 1 };
    
    // "2026-02" パターン
    m = str.match(/^(\d{4})-(\d{1,2})$/);
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) - 1 };
    
    // "2026/1" パターン
    m = str.match(/^(\d{4})\/(\d{1,2})$/);
    if (m) return { year: parseInt(m[1]), month: parseInt(m[2]) - 1 };
    
    // 標準的な日付解析
    let d = new Date(str);
    if (!isNaN(d.getTime())) {
        return { year: d.getFullYear(), month: d.getMonth() };
    }
    return null;
}

// 支出データを月でフィルタリング
function filterExpensesByMonth(expenses, targetDate) {
    if (!Array.isArray(expenses)) return [];
    if (!targetDate || !(targetDate instanceof Date)) return [];
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    return expenses.filter(exp => {
        if (!exp) return false;
        const parsed = parseYearMonth(exp.yearMonth);
        return parsed && parsed.year === targetYear && parsed.month === targetMonth;
    });
}

// 収入データを月でフィルタリング
function filterIncomesByMonth(incomes, targetDate) {
    if (!Array.isArray(incomes)) return [];
    if (!targetDate || !(targetDate instanceof Date)) return [];
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    return incomes.filter(inc => {
        if (!inc) return false;
        const parsed = parseYearMonth(inc.yearMonth);
        return parsed && parsed.year === targetYear && parsed.month === targetMonth;
    });
}

// トースト表示
let toastTimer = null;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');

    if (toastTimer) clearTimeout(toastTimer);

    toastMsg.textContent = message;
    toast.className = `toast ${type}`;

    if (type === 'success') {
        toastIcon.className = 'fa-solid fa-circle-check toast-icon';
    } else if (type === 'danger') {
        toastIcon.className = 'fa-solid fa-circle-xmark toast-icon';
    } else {
        toastIcon.className = 'fa-solid fa-circle-info toast-icon';
    }

    toast.classList.remove('hidden');

    toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// 日付を「日 (曜日)」に変換 (例: "2026/07/02" -> "02日 (木)")
function formatDayAndWeek(dateStr) {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
    return `${day}日 (${dayOfWeek})`;
}

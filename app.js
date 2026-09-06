/* ==========================================================================
   MoneyManager - Frontend Logic (Budget Dashboard Edition)
   ========================================================================== */

const initialMonth = new Date();
initialMonth.setDate(1);
initialMonth.setHours(0, 0, 0, 0);

const DATA_CACHE_KEY = 'moneymanager_api_cache_v1';
const DATA_CACHE_VERSION = 2;
const DATA_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const API_DATA_FIELDS = ['assets', 'incomes', 'expenses', 'subscriptions', 'budgetPlans', 'specialBudgets', 'annualBudgets', 'itemBudgets', 'assetTargets'];

// --- App State ---
const state = {
    gasUrl: localStorage.getItem('kakeibo_gas_url') || '',
    assets: [],        // 週次資産記録
    incomes: [],       // 収入記録
    expenses: [],      // 支出記録
    subscriptions: [], // サブスク管理
    budgetPlans: [],   // 予算計画（月別）
    specialBudgets: [], // 予算計画_特別予算（年別）
    annualBudgets: [], // 年度予算
    itemBudgets: [],   // 費目別予算
    assetTargets: [],  // 暦年末資産目標
    expenseCategories: ["個人_食費", "交友_食費", "交通費", "家賃", "日用品・被服費", "医療費", "娯楽費", "教育費・研鑽費", "交際費", "旅費", "通信費", "雑費", "サブスク"],
    incomeTypes: ["給与所得", "配当所得", "譲渡所得", "その他"],
    currentMonth: initialMonth,
    annualReportYear: initialMonth.getFullYear(),
    budgetReportYear: initialMonth.getFullYear(),
    budgetMetric: 'expense',
    specialBudgetYear: initialMonth.getFullYear(),
    showAssetsBreakdown: false, // 資産の内訳表示フラグ
    assetRange: 'all',          // 資産グラフの表示期間 ('all', '1m', '3m', '6m', '1y')
    isDemoMode: true,
    syncState: 'idle',
    lastSyncedAt: null
};

// Material 3 roles are the single source of truth for canvas and DOM colors.
function getThemeRole(roleName) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(`--md-sys-color-${roleName}`)
        .trim();
}

function colorWithAlpha(hexColor, alpha) {
    const hex = hexColor.replace('#', '');
    const normalized = hex.length === 3
        ? hex.split('').map(character => character + character).join('')
        : hex;
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getChartTheme() {
    return {
        primary: getThemeRole('primary'),
        onPrimary: getThemeRole('on-primary'),
        primaryContainer: getThemeRole('primary-container'),
        onPrimaryContainer: getThemeRole('on-primary-container'),
        secondaryContainer: getThemeRole('secondary-container'),
        onSecondaryContainer: getThemeRole('on-secondary-container'),
        tertiaryContainer: getThemeRole('tertiary-container'),
        onTertiaryContainer: getThemeRole('on-tertiary-container'),
        surface: getThemeRole('surface'),
        surfaceContainerHigh: getThemeRole('surface-container-high'),
        surfaceContainerHighest: getThemeRole('surface-container-highest'),
        onSurface: getThemeRole('on-surface'),
        onSurfaceVariant: getThemeRole('on-surface-variant'),
        outline: getThemeRole('outline'),
        outlineVariant: getThemeRole('outline-variant'),
        inverseSurface: getThemeRole('inverse-surface'),
        inverseOnSurface: getThemeRole('inverse-on-surface'),
        inversePrimary: getThemeRole('inverse-primary'),
        error: getThemeRole('error')
    };
}

function initMaterialInteractions() {
    const rippleTargets = document.querySelectorAll('button, .bottom-nav-item, .link-more');
    rippleTargets.forEach(target => {
        target.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            const bounds = target.getBoundingClientRect();
            const size = Math.max(bounds.width, bounds.height) * 2;
            const ripple = document.createElement('span');
            ripple.className = 'm3-ripple';
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.left = `${event.clientX - bounds.left - size / 2}px`;
            ripple.style.top = `${event.clientY - bounds.top - size / 2}px`;
            target.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
        });
    });

    const theme = getChartTheme();
    Chart.defaults.color = theme.onSurfaceVariant;
    Chart.defaults.borderColor = theme.outlineVariant;
    Chart.defaults.font.family = 'Roboto, "Noto Sans JP", sans-serif';
    Chart.defaults.plugins.tooltip.backgroundColor = theme.inverseSurface;
    Chart.defaults.plugins.tooltip.titleColor = theme.inverseOnSurface;
    Chart.defaults.plugins.tooltip.bodyColor = theme.inverseOnSurface;
}

// --- Generic demo data (actual spreadsheet values are never bundled in GitHub) ---
const MOCK_ASSETS = [
    { date: "2026/06/27", total: 1210000, cash: 500000, stocks: 180000, trusts: 510000, points: 20000 },
    { date: "2026/07/25", total: 1280000, cash: 530000, stocks: 190000, trusts: 540000, points: 20000 },
    { date: "2026/08/08", total: 1310000, cash: 545000, stocks: 195000, trusts: 550000, points: 20000 },
    { date: "2026/08/22", total: 1350000, cash: 560000, stocks: 200000, trusts: 570000, points: 20000 }
];

const MOCK_INCOMES = [
    { yearMonth: "2026年06月", incomeType: "給与所得", grossPay: 300000, incomeTax: 7000, inhabitantTax: 0, socialInsurance: 40000, otherDeductions: 3000, deductionTotal: 50000, transportation: 0, takeHomePay: 250000 },
    { yearMonth: "2026年07月", incomeType: "給与所得", grossPay: 310000, incomeTax: 8000, inhabitantTax: 0, socialInsurance: 41000, otherDeductions: 3000, deductionTotal: 52000, transportation: 0, takeHomePay: 258000 },
    { yearMonth: "2026年08月", incomeType: "給与所得", grossPay: 310000, incomeTax: 8000, inhabitantTax: 0, socialInsurance: 41000, otherDeductions: 3000, deductionTotal: 52000, transportation: 0, takeHomePay: 258000 }
];

const MOCK_EXPENSES = [
    { yearMonth: "2026/7", date: "2026/07/08", category: "個人_食費", amount: 6800, description: "食材" },
    { yearMonth: "2026/7", date: "2026/07/18", category: "交友_食費", amount: 9000, description: "会食" },
    { yearMonth: "2026/7", date: "2026/07/25", category: "日用品・被服費", amount: 7200, description: "日用品" },
    { yearMonth: "2026/8", date: "2026/08/03", category: "家賃", amount: 14000, description: "住居費" },
    { yearMonth: "2026/8", date: "2026/08/06", category: "個人_食費", amount: 8200, description: "食材" },
    { yearMonth: "2026/8", date: "2026/08/09", category: "交通費", amount: 3600, description: "交通" },
    { yearMonth: "2026/8", date: "2026/08/14", category: "娯楽費", amount: 12000, description: "イベント" },
    { yearMonth: "2026/8", date: "2026/08/18", category: "交友_食費", amount: 7800, description: "会食" },
    { yearMonth: "2026/8", date: "2026/08/21", category: "日用品・被服費", amount: 4300, description: "日用品" },
    { yearMonth: "2026/8", date: "2026/08/24", category: "旅費", amount: 28000, description: "小旅行" },
    { yearMonth: "2026/9", date: "2026/09/12", category: "日用品・被服費", amount: 45000, description: "特別予算" }
];

const MOCK_SUBSCRIPTIONS = [
    { year: 2026, name: "クラウドストレージ", amount: 600, paymentCount: 12, annualAmount: 7200, monthlyAmount: 600 },
    { year: 2026, name: "動画配信", amount: 1000, paymentCount: 12, annualAmount: 12000, monthlyAmount: 1000 }
];

const MOCK_BUDGET_PLANS = Array.from({ length: 5 }, (_, yearOffset) => {
    const year = 2026 + yearOffset;
    const regularIncome = 320000 + yearOffset * 10000;
    const regularExpense = 180000 + yearOffset * 5000;
    return Array.from({ length: 12 }, (_, monthIndex) => {
        const isBonusMonth = monthIndex === 5 || monthIndex === 11;
        const grossIncomePlan = isBonusMonth ? regularIncome + 300000 : regularIncome;
        const takeHomePlan = Math.round(grossIncomePlan * 0.84);
        return {
            yearMonth: `${year}/${monthIndex + 1}`,
            grossIncomePlan,
            takeHomePlan,
            recurringExpensePlan: regularExpense,
            balancePlan: takeHomePlan - regularExpense
        };
    });
}).flat();

const MOCK_SPECIAL_BUDGETS = [
    { year: 2026, budgetAmount: 800000, spentAmount: 73000, remainingAmount: 727000 },
    { year: 2027, budgetAmount: 800000, spentAmount: 0, remainingAmount: 800000 },
    { year: 2028, budgetAmount: 900000, spentAmount: 0, remainingAmount: 900000 },
    { year: 2029, budgetAmount: 1000000, spentAmount: 0, remainingAmount: 1000000 },
    { year: 2030, budgetAmount: 1000000, spentAmount: 0, remainingAmount: 1000000 }
];

const MOCK_ANNUAL_BUDGETS = [
    { fiscalYear: "FY2027", takeHomePlan: 4900000, recurringMonthly: 175000, recurringAnnual: 2100000, specialAnnual: 800000, totalBudget: 2900000, assetIncreaseTarget: 2000000, yearEndPlan: 4395947, minimumAssetTarget: 4296960, buffer: 98987 },
    { fiscalYear: "FY2028", takeHomePlan: 5000000, recurringMonthly: 180000, recurringAnnual: 2160000, specialAnnual: 800000, totalBudget: 2960000, assetIncreaseTarget: 2040000, yearEndPlan: 6435947, minimumAssetTarget: 6197974, buffer: 237973 },
    { fiscalYear: "FY2029", takeHomePlan: 5100000, recurringMonthly: 185000, recurringAnnual: 2220000, specialAnnual: 800000, totalBudget: 3020000, assetIncreaseTarget: 2080000, yearEndPlan: 8515947, minimumAssetTarget: 8098987, buffer: 416960 },
    { fiscalYear: "FY2030", takeHomePlan: 5200000, recurringMonthly: 190000, recurringAnnual: 2280000, specialAnnual: 800000, totalBudget: 3080000, assetIncreaseTarget: 2120000, yearEndPlan: 10635947, minimumAssetTarget: 10000000, buffer: 635947 }
];

const MOCK_ITEM_BUDGETS = [
    { fiscalYear: "FY2027", budgetType: "特別", item: "旅行", unit: "年", budgetAmount: 500000, expenseCategory: "旅費", minimumAmount: 0 },
    { fiscalYear: "FY2027", budgetType: "特別", item: "大型購入・引越し", unit: "年", budgetAmount: 300000, expenseCategory: "*", minimumAmount: 100000 }
];

const MOCK_ASSET_TARGETS = [
    { calendarYear: 2026, targetAmount: 2395947, targetType: "基準目標", note: "試験運用" },
    { calendarYear: 2027, targetAmount: 4296960, targetType: "最低目標", note: "" },
    { calendarYear: 2028, targetAmount: 6197974, targetType: "最低目標", note: "" },
    { calendarYear: 2029, targetAmount: 8098987, targetType: "最低目標", note: "" },
    { calendarYear: 2030, targetAmount: 10000000, targetType: "最終目標", note: "" }
];

// --- Chart Instances ---
let assetTrendChart = null;
let monthlyTrendChart = null;
let categoryDistributionChart = null;
let annualCashflowChart = null;
let annualCategoryChart = null;
let budgetProgressChart = null;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    initMaterialInteractions();
    initCategories();
    initNavigation();
    initHeaderMenu();
    initMonthSelector();
    initAnnualReport();
    initBudgetReport();
    initFormLogic();
    initCalculatorModal();
    initSettings();

    // キャッシュがあれば即時表示し、最新データは常にバックグラウンドで取得する。
    if (state.gasUrl) {
        const restoredFromCache = loadApiDataCache();
        void syncWithGas({ background: restoredFromCache, silent: restoredFromCache });
    } else {
        loadDemoMode();
    }
});

// --- Category Init ---
function initCategories() {
    const savedCategories = localStorage.getItem('kakeibo_expense_categories');
    if (!savedCategories) return;
    try {
        const parsed = JSON.parse(savedCategories);
        if (Array.isArray(parsed) && parsed.length > 0) state.expenseCategories = parsed;
    } catch (_error) {
        localStorage.removeItem('kakeibo_expense_categories');
    }
}

// --- Navigation ---
const HEADER_MENU_MOBILE_QUERY = '(max-width: 920px)';

function showMainTab(tabId) {
    const primaryNavItems = document.querySelectorAll('.bottom-nav-item[data-tab]');
    const secondaryNavItems = document.querySelectorAll('.header-menu-item[data-tab]');
    const menuButton = document.getElementById('header-menu-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const targetPane = document.getElementById(`tab-${tabId}`);
    if (!targetPane) return;

    primaryNavItems.forEach(item => {
        const isActive = item.getAttribute('data-tab') === tabId;
        item.classList.toggle('active', isActive);
        if (isActive) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    });

    const isSecondaryTab = [...secondaryNavItems].some(item => item.getAttribute('data-tab') === tabId);
    menuButton.classList.toggle('active', isSecondaryTab);
    if (isSecondaryTab) menuButton.setAttribute('aria-current', 'page');
    else menuButton.removeAttribute('aria-current');

    secondaryNavItems.forEach(item => {
        const isActive = item.getAttribute('data-tab') === tabId;
        item.classList.toggle('active', isActive);
        if (isActive) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    });

    tabPanes.forEach(pane => pane.classList.remove('active'));
    targetPane.classList.add('active');
    updateHeaderInfo(tabId);
    closeHeaderMenu(false);

    if (tabId === 'dashboard') {
        renderDashboard();
    } else if (tabId === 'annual-report') {
        renderAnnualReport();
    } else if (tabId === 'budget') {
        renderBudgetView();
    } else if (tabId === 'transactions') {
        document.querySelector('.sub-tab-btn[data-subtab="expense-list"]').click();
    } else if (tabId === 'add-transaction') {
        resetForms();
    } else if (tabId === 'settings') {
        renderSettings();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initNavigation() {
    const destinations = document.querySelectorAll('.bottom-nav-item[data-tab], .header-menu-item[data-tab]');

    destinations.forEach(item => {
        if (item.classList.contains('active')) item.setAttribute('aria-current', 'page');
        item.addEventListener('click', (event) => {
            event.preventDefault();
            showMainTab(item.getAttribute('data-tab'));
        });
    });

    // サブタブ切り替え (取引明細画面)
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const subTabPanes = document.querySelectorAll('.sub-tab-pane');

    subTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const subtabId = btn.getAttribute('data-subtab');
            
            subTabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

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
        showMainTab('transactions');
    });
}

let headerMenuReturnFocus = null;

function setHeaderMenuOpen(isOpen, restoreFocus = true) {
    const button = document.getElementById('header-menu-button');
    const panel = document.getElementById('header-menu-panel');
    const scrim = document.getElementById('header-menu-scrim');
    if (!button || !panel || !scrim) return;

    if (!window.matchMedia(HEADER_MENU_MOBILE_QUERY).matches) {
        panel.classList.remove('hidden');
        scrim.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'メニューを開く');
        button.classList.remove('menu-open');
        document.body.classList.remove('menu-open');
        headerMenuReturnFocus = null;
        return;
    }

    if (isOpen) {
        headerMenuReturnFocus = document.activeElement;
        panel.classList.remove('hidden');
        scrim.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
        button.setAttribute('aria-label', 'メニューを閉じる');
        button.classList.add('menu-open');
        document.body.classList.add('menu-open');
        requestAnimationFrame(() => panel.querySelector('button')?.focus());
    } else {
        panel.classList.add('hidden');
        scrim.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-label', 'メニューを開く');
        button.classList.remove('menu-open');
        document.body.classList.remove('menu-open');
        if (restoreFocus && headerMenuReturnFocus instanceof HTMLElement) headerMenuReturnFocus.focus();
        headerMenuReturnFocus = null;
    }
}

function closeHeaderMenu(restoreFocus = true) {
    setHeaderMenuOpen(false, restoreFocus);
}

function initHeaderMenu() {
    const button = document.getElementById('header-menu-button');
    const closeButton = document.getElementById('header-menu-close');
    const scrim = document.getElementById('header-menu-scrim');
    const panel = document.getElementById('header-menu-panel');
    const mobileQuery = window.matchMedia(HEADER_MENU_MOBILE_QUERY);

    const updateMenuMode = () => {
        if (mobileQuery.matches) {
            panel.setAttribute('role', 'dialog');
            panel.setAttribute('aria-modal', 'true');
            if (button.getAttribute('aria-expanded') !== 'true') panel.classList.add('hidden');
        } else {
            panel.removeAttribute('role');
            panel.removeAttribute('aria-modal');
            setHeaderMenuOpen(false, false);
        }
    };

    button.addEventListener('click', () => {
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        setHeaderMenuOpen(!isOpen);
    });
    closeButton.addEventListener('click', () => closeHeaderMenu());
    scrim.addEventListener('click', () => closeHeaderMenu());
    document.addEventListener('keydown', event => {
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        if (event.key === 'Escape' && isOpen) {
            closeHeaderMenu();
            return;
        }

        if (event.key !== 'Tab' || !isOpen) return;
        const focusableItems = [...panel.querySelectorAll('button:not([disabled]), a[href]')];
        if (focusableItems.length === 0) return;
        const firstItem = focusableItems[0];
        const lastItem = focusableItems[focusableItems.length - 1];

        if (event.shiftKey && document.activeElement === firstItem) {
            event.preventDefault();
            lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
            event.preventDefault();
            firstItem.focus();
        }
    });

    if (typeof mobileQuery.addEventListener === 'function') mobileQuery.addEventListener('change', updateMenuMode);
    else mobileQuery.addListener(updateMenuMode);
    updateMenuMode();
}

function updateHeaderInfo(tabId) {
    const titleEl = document.getElementById('page-title');
    const monthSelector = document.querySelector('.month-selector');
    
    // 月次の文脈を持つ画面だけ月選択を表示
    if (monthSelector) {
        if (tabId === 'dashboard' || tabId === 'transactions') {
            monthSelector.style.display = 'flex';
        } else {
            monthSelector.style.display = 'none';
        }
    }

    switch (tabId) {
        case 'dashboard':
            titleEl.textContent = 'MoneyManager';
            break;
        case 'budget':
            titleEl.textContent = '予算と資産レポート';
            break;
        case 'annual-report':
            titleEl.textContent = '年間レポート';
            break;
        case 'transactions':
            titleEl.textContent = '明細・履歴';
            break;
        case 'add-transaction':
            titleEl.textContent = '取引を追加';
            break;
        case 'settings':
            titleEl.textContent = '設定';
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
        closeHeaderMenu(false);
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

function initAnnualReport() {
    document.getElementById('annual-prev-year').addEventListener('click', () => {
        state.annualReportYear -= 1;
        renderAnnualReport();
    });

    document.getElementById('annual-next-year').addEventListener('click', () => {
        state.annualReportYear += 1;
        renderAnnualReport();
    });
}

function initBudgetReport() {
    document.getElementById('budget-prev-year').addEventListener('click', () => {
        state.budgetReportYear -= 1;
        state.specialBudgetYear = state.budgetReportYear;
        renderBudgetView();
    });

    document.getElementById('budget-next-year').addEventListener('click', () => {
        state.budgetReportYear += 1;
        state.specialBudgetYear = state.budgetReportYear;
        renderBudgetView();
    });

    document.querySelectorAll('[data-budget-metric]').forEach(button => {
        button.addEventListener('click', () => {
            state.budgetMetric = button.getAttribute('data-budget-metric');
            document.querySelectorAll('[data-budget-metric]').forEach(metricButton => {
                const isActive = metricButton === button;
                metricButton.classList.toggle('active', isActive);
                metricButton.setAttribute('aria-pressed', String(isActive));
            });
            renderBudgetProgressChart(getBudgetReportData(state.budgetReportYear));
        });
    });

    document.getElementById('special-budget-years').addEventListener('click', event => {
        const card = event.target.closest('[data-special-budget-year]');
        if (!card) return;
        state.specialBudgetYear = Number(card.getAttribute('data-special-budget-year'));
        renderSpecialBudgetSection();
    });
}

function refreshActiveViews() {
    if (document.getElementById('tab-dashboard').classList.contains('active')) {
        renderDashboard();
    }
    if (document.getElementById('tab-budget').classList.contains('active')) {
        renderBudgetView();
    }
    if (document.getElementById('tab-annual-report').classList.contains('active')) {
        renderAnnualReport();
    }
    if (document.getElementById('tab-transactions').classList.contains('active')) {
        const activeSubtab = document.querySelector('.sub-tab-btn.active').getAttribute('data-subtab');
        if (activeSubtab === 'expense-list') renderExpensesList();
        else if (activeSubtab === 'income-list') renderIncomesList();
        else if (activeSubtab === 'sub-list') renderSubscriptionsList();
    }
}

// --- Connection & Data Loading ---
function showLoading(show) {
    const loader = document.getElementById('loading-overlay');
    if (show) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

function updateConnectionStatusUI() {
    const demoBadge = document.getElementById('demo-badge');
    const lastSyncText = document.getElementById('last-sync-text');
    const disconnectBtn = document.getElementById('disconnect-gas');

    demoBadge.classList.toggle('hidden', !state.isDemoMode);
    lastSyncText.textContent = formatLastSyncText(state.lastSyncedAt);
    disconnectBtn.classList.toggle('hidden', state.isDemoMode);
}

function formatLastSyncText(timestamp) {
    if (!Number.isFinite(timestamp)) return '最終更新: 未同期';
    const formatted = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(timestamp));
    return `最終更新: ${formatted}`;
}

function applyApiData(data) {
    state.assets = data.assets || [];
    state.incomes = data.incomes || [];
    state.expenses = data.expenses || [];
    state.subscriptions = data.subscriptions || [];
    state.budgetPlans = data.budgetPlans || [];
    state.specialBudgets = data.specialBudgets || [];
    state.annualBudgets = data.annualBudgets || [];
    state.itemBudgets = data.itemBudgets || [];
    state.assetTargets = data.assetTargets || [];
}

function getApiDataSnapshot() {
    return Object.fromEntries(API_DATA_FIELDS.map(field => [field, state[field]]));
}

function saveApiDataCache() {
    try {
        const savedAt = Number.isFinite(state.lastSyncedAt) ? state.lastSyncedAt : Date.now();
        localStorage.setItem(DATA_CACHE_KEY, JSON.stringify({
            version: DATA_CACHE_VERSION,
            sourceUrl: state.gasUrl,
            savedAt,
            data: getApiDataSnapshot()
        }));
    } catch (error) {
        console.warn('Cache Save Error:', error);
    }
}

function clearApiDataCache() {
    localStorage.removeItem(DATA_CACHE_KEY);
}

function loadApiDataCache() {
    try {
        const rawCache = localStorage.getItem(DATA_CACHE_KEY);
        if (!rawCache) return false;

        const cache = JSON.parse(rawCache);
        const isValid = cache.version === DATA_CACHE_VERSION
            && cache.sourceUrl === state.gasUrl
            && Number.isFinite(cache.savedAt)
            && Date.now() - cache.savedAt <= DATA_CACHE_TTL_MS
            && cache.data
            && API_DATA_FIELDS.every(field => Array.isArray(cache.data[field]));

        if (!isValid) {
            clearApiDataCache();
            return false;
        }

        applyApiData(cache.data);
        state.isDemoMode = false;
        state.syncState = 'cached';
        state.lastSyncedAt = cache.savedAt;
        updateConnectionStatusUI();
        renderDashboard();
        return true;
    } catch (error) {
        console.warn('Cache Load Error:', error);
        clearApiDataCache();
        return false;
    }
}

function refreshSyncedViews() {
    refreshActiveViews();
}

async function syncWithGas({ background = false, silent = false } = {}) {
    if (!state.gasUrl) return;
    if (!background) showLoading(true);
    if (!state.isDemoMode) {
        state.syncState = 'syncing';
        updateConnectionStatusUI();
    }

    try {
        const apiUrl = state.gasUrl + (state.gasUrl.includes('?') ? '&' : '?') + 'api=1';
        const response = await fetch(apiUrl, { method: 'GET' });
        if (!response.ok) throw new Error('ネットワーク接続が失敗しました。');
        
        const data = await response.json();
        
        if (data.status === 'success') {
            applyApiData(data);

            state.isDemoMode = false;
            state.syncState = 'synced';
            state.lastSyncedAt = Date.now();
            saveApiDataCache();
            updateConnectionStatusUI();
            refreshSyncedViews();
            if (!silent) showToast('スプレッドシートとデータを同期しました！', 'success');
        } else {
            throw new Error(data.message || 'データパースエラー');
        }
    } catch (error) {
        console.error('Sync Error:', error);
        if (background && !state.isDemoMode) {
            state.syncState = 'offline';
            updateConnectionStatusUI();
            if (!silent) showToast('同期できなかったため、保存済みデータを表示しています。', 'warning');
        } else {
            showToast('同期に失敗しました。URLとシートの共有設定を確認してください。', 'danger');
            loadDemoMode();
        }
    } finally {
        if (!background) showLoading(false);
    }
}

function loadDemoMode() {
    state.isDemoMode = true;
    state.syncState = 'idle';
    state.lastSyncedAt = null;
    updateConnectionStatusUI();

    // v2キーに分離し、旧デモデータや実データ風サンプルを公開画面へ持ち越さない
    const localExpenses = localStorage.getItem('kakeibo_demo_expenses_v2');
    const localIncomes = localStorage.getItem('kakeibo_demo_incomes_v2');
    state.assets = MOCK_ASSETS;
    state.incomes = localIncomes ? JSON.parse(localIncomes) : MOCK_INCOMES;
    state.expenses = localExpenses ? JSON.parse(localExpenses) : MOCK_EXPENSES;
    state.subscriptions = MOCK_SUBSCRIPTIONS;
    state.budgetPlans = MOCK_BUDGET_PLANS;
    state.specialBudgets = MOCK_SPECIAL_BUDGETS;
    state.annualBudgets = MOCK_ANNUAL_BUDGETS;
    state.itemBudgets = MOCK_ITEM_BUDGETS;
    state.assetTargets = MOCK_ASSET_TARGETS;

    renderDashboard();
}

// --- Dashboard Update Date Formatting Helper ---
function safeParseDate(dateVal) {
    if (!dateVal) return new Date(0);
    let d = dateVal;
    if (!(d instanceof Date)) {
        d = new Date(dateVal);
    }
    if (!isNaN(d.getTime())) return d;
    
    // スラッシュ区切りで時刻がある場合など、ブラウザ互換性のためのフォールバック
    const cleanStr = String(dateVal).replace(/-/g, '/');
    d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d;
    
    const parts = String(dateVal).split(" ");
    if (parts.length > 0) {
        const dPart = new Date(parts[0].replace(/-/g, '/'));
        if (!isNaN(dPart.getTime())) return dPart;
    }
    return new Date(0);
}

function formatAssetAsOfDate(dateVal) {
    if (!dateVal) return '記録なし';
    
    const d = safeParseDate(dateVal);
    if (isNaN(d.getTime()) || d.getTime() === 0) {
        return String(dateVal);
    }
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    
    return `${year}年${month}月${day}日時点`;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
}

function getLatestAssetRecords() {
    return state.assets
        .filter(asset => safeParseDate(asset.date).getTime() !== 0)
        .sort((a, b) => safeParseDate(b.date) - safeParseDate(a.date));
}

function setProgress(id, numerator, denominator, disabled = false) {
    const bar = document.getElementById(id);
    const track = bar.closest('.progress-track');
    const percentage = disabled || denominator <= 0 ? 0 : Math.max(0, Math.min(100, numerator / denominator * 100));
    bar.style.width = `${percentage}%`;
    track.setAttribute('aria-valuenow', String(Math.round(percentage)));
    track.classList.toggle('is-disabled', disabled);
}

function getBudgetReportData(year) {
    const planByMonth = Array.from({ length: 12 }, () => ({ income: 0, expenses: 0, hasPlan: false }));
    state.budgetPlans.forEach(plan => {
        const parsed = parseYearMonth(plan.yearMonth);
        if (!parsed || parsed.year !== year) return;
        planByMonth[parsed.month] = {
            income: Number(plan.grossIncomePlan || 0),
            expenses: Number(plan.recurringExpensePlan || 0),
            hasPlan: true
        };
    });

    const actualIncomeByMonth = Array(12).fill(0);
    state.incomes.forEach(income => {
        const parsed = parseYearMonth(income.yearMonth);
        if (parsed?.year === year) actualIncomeByMonth[parsed.month] += Number(income.grossPay || 0);
    });

    const actualExpenseByMonth = Array(12).fill(0);
    state.expenses.forEach(expense => {
        const parsed = getExpenseYearMonth(expense);
        if (parsed?.year === year && !isSpecialBudgetExpense(expense)) {
            actualExpenseByMonth[parsed.month] += Number(expense.amount || 0);
        }
    });

    const subscriptionMonthly = state.subscriptions
        .filter(subscription => Number(subscription.year) === year)
        .reduce((sum, subscription) => sum + Number(subscription.monthlyAmount || 0), 0);
    actualExpenseByMonth.forEach((_, monthIndex) => {
        actualExpenseByMonth[monthIndex] += subscriptionMonthly;
    });

    let cumulativeIncomePlan = 0;
    let cumulativeIncomeActual = 0;
    let cumulativeExpensePlan = 0;
    let cumulativeExpenseActual = 0;
    const months = planByMonth.map((plan, monthIndex) => {
        cumulativeIncomePlan += plan.income;
        cumulativeIncomeActual += actualIncomeByMonth[monthIndex];
        cumulativeExpensePlan += plan.expenses;
        cumulativeExpenseActual += actualExpenseByMonth[monthIndex];
        return {
            month: monthIndex + 1,
            hasPlan: plan.hasPlan,
            incomePlan: plan.income,
            incomeActual: actualIncomeByMonth[monthIndex],
            incomeDifference: actualIncomeByMonth[monthIndex] - plan.income,
            expensePlan: plan.expenses,
            expenseActual: actualExpenseByMonth[monthIndex],
            expenseRemaining: plan.expenses - actualExpenseByMonth[monthIndex],
            cumulativeIncomePlan,
            cumulativeIncomeActual,
            cumulativeExpensePlan,
            cumulativeExpenseActual
        };
    });

    return {
        year,
        months,
        hasPlan: planByMonth.some(plan => plan.hasPlan),
        incomePlan: months.reduce((sum, month) => sum + month.incomePlan, 0),
        incomeActual: months.reduce((sum, month) => sum + month.incomeActual, 0),
        expensePlan: months.reduce((sum, month) => sum + month.expensePlan, 0),
        expenseActual: months.reduce((sum, month) => sum + month.expenseActual, 0)
    };
}

function renderBudgetAssetSummary(year) {
    const latestAsset = getLatestAssetRecords()[0] || null;
    const assetTarget = state.assetTargets.find(target => Number(target.calendarYear) === year);
    const currentAssetEl = document.getElementById('budget-current-assets');
    const targetEl = document.getElementById('budget-asset-target');
    const gapEl = document.getElementById('budget-asset-gap');
    const gapLabelEl = document.getElementById('budget-asset-gap-label');
    const rateEl = document.getElementById('budget-asset-rate');

    currentAssetEl.textContent = latestAsset ? formatCurrency(Number(latestAsset.total || 0)) : '—';
    document.getElementById('budget-assets-as-of').textContent = latestAsset ? formatAssetAsOfDate(latestAsset.date) : '記録なし';
    document.getElementById('budget-asset-target-label').textContent = `${year}年末資産目標`;
    targetEl.textContent = assetTarget ? formatCurrency(Number(assetTarget.targetAmount || 0)) : '—';

    if (latestAsset && assetTarget) {
        const currentAmount = Number(latestAsset.total || 0);
        const targetAmount = Number(assetTarget.targetAmount || 0);
        const gap = targetAmount - currentAmount;
        gapLabelEl.textContent = gap >= 0 ? '目標まで' : '目標超過';
        gapEl.textContent = formatCurrency(Math.abs(gap));
        gapEl.className = `card-value${gap < 0 ? ' text-success' : ''}`;
        rateEl.textContent = targetAmount > 0 ? `進捗 ${formatPercentage(currentAmount / targetAmount * 100)}` : '—';
        setProgress('budget-asset-progress', currentAmount, targetAmount);
    } else {
        gapLabelEl.textContent = '目標まで';
        gapEl.textContent = '—';
        gapEl.className = 'card-value';
        rateEl.textContent = '—';
        setProgress('budget-asset-progress', 0, 0, true);
    }
}

function renderBudgetProgressSummary(report) {
    const incomeDifference = report.incomeActual - report.incomePlan;
    const expenseRemaining = report.expensePlan - report.expenseActual;
    const incomeDiffEl = document.getElementById('budget-income-difference');
    const expenseRemainingEl = document.getElementById('budget-expense-remaining');

    document.getElementById('budget-income-status').textContent = formatCurrency(report.incomeActual);
    document.getElementById('budget-expense-status').textContent = formatCurrency(report.expenseActual);
    document.getElementById('budget-income-plan').textContent = report.hasPlan ? formatCurrency(report.incomePlan) : '—';
    document.getElementById('budget-expense-plan').textContent = report.hasPlan ? formatCurrency(report.expensePlan) : '—';
    incomeDiffEl.textContent = report.hasPlan ? `${incomeDifference >= 0 ? '+' : ''}${formatCurrency(incomeDifference)}` : '—';
    incomeDiffEl.className = report.hasPlan ? (incomeDifference >= 0 ? 'text-success' : 'text-danger') : '';
    expenseRemainingEl.textContent = report.hasPlan ? formatCurrency(Math.abs(expenseRemaining)) : '—';
    expenseRemainingEl.className = report.hasPlan ? (expenseRemaining >= 0 ? 'text-success' : 'text-danger') : '';
    expenseRemainingEl.closest('div').querySelector('dt').textContent = report.hasPlan && expenseRemaining < 0 ? '超過' : '残額';
}

function renderBudgetMonthlyTable(months) {
    const tbody = document.getElementById('budget-monthly-tbody');
    tbody.replaceChildren();

    months.forEach(month => {
        const incomeDifferenceText = month.hasPlan
            ? `${month.incomeDifference >= 0 ? '+' : ''}${formatCurrency(month.incomeDifference)}`
            : '—';
        const expenseRemainingText = month.hasPlan ? formatCurrency(month.expenseRemaining) : '—';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="月"><strong>${month.month}月</strong></td>
            <td data-label="収入予定" class="text-right">${month.hasPlan ? formatCurrency(month.incomePlan) : '—'}</td>
            <td data-label="収入実績" class="text-right">${formatCurrency(month.incomeActual)}</td>
            <td data-label="収入差額" class="text-right ${month.hasPlan ? (month.incomeDifference >= 0 ? 'text-success' : 'text-danger') : ''}">${incomeDifferenceText}</td>
            <td data-label="支出予定" class="text-right">${month.hasPlan ? formatCurrency(month.expensePlan) : '—'}</td>
            <td data-label="支出実績" class="text-right">${formatCurrency(month.expenseActual)}</td>
            <td data-label="支出残額" class="text-right ${month.hasPlan ? (month.expenseRemaining >= 0 ? 'text-success' : 'text-danger') : ''}">${expenseRemainingText}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderBudgetProgressChart(report) {
    const ctx = document.getElementById('budget-progress-chart').getContext('2d');
    const theme = getChartTheme();
    const isExpense = state.budgetMetric === 'expense';
    const planValues = report.months.map(month => isExpense ? month.cumulativeExpensePlan : month.cumulativeIncomePlan);
    const actualValues = report.months.map(month => isExpense ? month.cumulativeExpenseActual : month.cumulativeIncomeActual);
    const actualColor = isExpense ? theme.error : theme.primary;
    const chartFont = { family: 'Roboto, "Noto Sans JP", sans-serif', size: 11 };

    if (budgetProgressChart) budgetProgressChart.destroy();
    budgetProgressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: report.months.map(month => `${month.month}月`),
            datasets: [
                {
                    label: '予定',
                    data: planValues,
                    borderColor: theme.outline,
                    backgroundColor: colorWithAlpha(theme.outline, 0.08),
                    borderWidth: 2,
                    borderDash: [7, 5],
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    tension: 0.22,
                    fill: false
                },
                {
                    label: '実績',
                    data: actualValues,
                    borderColor: actualColor,
                    backgroundColor: colorWithAlpha(actualColor, 0.1),
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: 0.22,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { font: chartFont, color: theme.onSurfaceVariant } },
                tooltip: { callbacks: { label: context => ` ${context.dataset.label}: ${formatCurrency(context.raw)}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: chartFont, color: theme.onSurfaceVariant } },
                y: {
                    beginAtZero: true,
                    grid: { color: theme.outlineVariant },
                    ticks: {
                        font: chartFont,
                        color: theme.onSurfaceVariant,
                        callback: value => Math.abs(value) >= 10000 ? `${value / 10000}万円` : `${value}円`
                    }
                }
            }
        }
    });
}

function isSpecialBudgetExpense(expense) {
    return String(expense?.category || '').trim() === '旅費'
        || String(expense?.description || '').includes('特別予算');
}

function getSpecialBudgetDetails(year) {
    return state.expenses
        .filter(expense => getExpenseYearMonth(expense)?.year === year && isSpecialBudgetExpense(expense))
        .sort((a, b) => safeParseDate(b.date) - safeParseDate(a.date));
}

function renderSpecialBudgetSection() {
    const container = document.getElementById('special-budget-years');
    const rows = [...state.specialBudgets].sort((a, b) => Number(a.year) - Number(b.year));
    const availableYears = rows.map(row => Number(row.year));
    if (rows.length > 0 && !availableYears.includes(state.specialBudgetYear)) {
        state.specialBudgetYear = availableYears.includes(state.budgetReportYear) ? state.budgetReportYear : availableYears[0];
    }
    container.replaceChildren();

    if (rows.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'section-note';
        empty.textContent = 'データなし';
        container.appendChild(empty);
    } else {
        rows.forEach(budget => {
            const year = Number(budget.year);
            const budgetAmount = Number(budget.budgetAmount || 0);
            const spentAmount = getSpecialBudgetDetails(year)
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
            const remainingAmount = budgetAmount - spentAmount;
            const percentage = budgetAmount > 0 ? Math.max(0, Math.min(100, spentAmount / budgetAmount * 100)) : 0;
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `special-budget-year-card${year === state.specialBudgetYear ? ' active' : ''}`;
            card.setAttribute('data-special-budget-year', String(year));
            card.setAttribute('aria-pressed', String(year === state.specialBudgetYear));
            card.innerHTML = `
                <strong>${year}年</strong>
                <span class="special-budget-year-values">
                    <span><span>予算</span><b>${formatCurrency(budgetAmount)}</b></span>
                    <span><span>消化</span><b>${formatCurrency(spentAmount)}</b></span>
                    <span><span>${remainingAmount >= 0 ? '残額' : '超過'}</span><b>${formatCurrency(Math.abs(remainingAmount))}</b></span>
                </span>
                <span class="progress-track" role="progressbar" aria-label="${year}年の特別予算消化率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percentage)}"><span style="width: ${percentage}%"></span></span>
            `;
            container.appendChild(card);
        });
    }

    const selectedYear = state.specialBudgetYear;
    const selectedBudget = rows.find(row => Number(row.year) === selectedYear);
    const details = getSpecialBudgetDetails(selectedYear);
    const detailsTotal = details.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const tbody = document.getElementById('special-budget-details-tbody');
    const reconcileEl = document.getElementById('special-budget-reconcile');
    document.getElementById('special-budget-detail-title').textContent = `${selectedYear}年 特別予算の明細`;
    tbody.replaceChildren();

    if (details.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="empty-state">明細なし</td>';
        tbody.appendChild(row);
    } else {
        details.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="日付">${escapeHtml(expense.date || '—')}</td>
                <td data-label="項目">${escapeHtml(expense.category || '—')}</td>
                <td data-label="備考">${escapeHtml(expense.description || '—')}</td>
                <td data-label="金額" class="text-right">${formatCurrency(Number(expense.amount || 0))}</td>
            `;
            tbody.appendChild(row);
        });
    }

    const sheetSpentAmount = Number(selectedBudget?.spentAmount || 0);
    const hasMismatch = !state.isDemoMode
        && Boolean(selectedBudget)
        && Math.round(sheetSpentAmount) !== Math.round(detailsTotal);
    reconcileEl.classList.toggle('hidden', !hasMismatch);
    reconcileEl.textContent = hasMismatch ? `シート消化額との差 ${formatCurrency(sheetSpentAmount - detailsTotal)}` : '';
}

function renderBudgetView() {
    const report = getBudgetReportData(state.budgetReportYear);
    document.getElementById('budget-year-display').textContent = `${state.budgetReportYear}年`;
    renderBudgetAssetSummary(state.budgetReportYear);
    renderBudgetProgressSummary(report);
    renderBudgetMonthlyTable(report.months);
    renderBudgetProgressChart(report);
    renderSpecialBudgetSection();
}

function getAnnualReportData(year) {
    const yearIncomes = state.incomes.filter(income => parseYearMonth(income.yearMonth)?.year === year);
    const yearExpenses = state.expenses.filter(expense => getExpenseYearMonth(expense)?.year === year);
    const monthlySubscriptionTotal = state.subscriptions
        .filter(subscription => Number(subscription.year) === year)
        .reduce((sum, subscription) => sum + Number(subscription.monthlyAmount || 0), 0);

    const months = Array.from({ length: 12 }, (_, monthIndex) => {
        const monthIncomes = yearIncomes.filter(income => parseYearMonth(income.yearMonth)?.month === monthIndex);
        const monthExpenses = yearExpenses.filter(expense => getExpenseYearMonth(expense)?.month === monthIndex);
        const income = monthIncomes.reduce((sum, item) => sum + Number(item.takeHomePay || 0), 0);
        const variableExpenses = monthExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const expenses = variableExpenses + monthlySubscriptionTotal;
        const balance = income - expenses;

        return {
            month: monthIndex + 1,
            income,
            variableExpenses,
            subscriptionExpenses: monthlySubscriptionTotal,
            expenses,
            balance,
            savingsRate: income > 0 ? (balance / income) * 100 : null
        };
    });

    const totalIncome = months.reduce((sum, month) => sum + month.income, 0);
    const variableExpenseTotal = months.reduce((sum, month) => sum + month.variableExpenses, 0);
    const subscriptionAnnualTotal = monthlySubscriptionTotal * 12;
    const totalExpenses = variableExpenseTotal + subscriptionAnnualTotal;
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : null;
    const categoryTotals = {};

    yearExpenses.forEach(expense => {
        const category = expense.category || '未分類';
        categoryTotals[category] = (categoryTotals[category] || 0) + Number(expense.amount || 0);
    });
    if (subscriptionAnnualTotal > 0) {
        categoryTotals['サブスク'] = (categoryTotals['サブスク'] || 0) + subscriptionAnnualTotal;
    }

    const sumIncomeField = field => yearIncomes.reduce((sum, income) => sum + Number(income[field] || 0), 0);

    return {
        year,
        months,
        totalIncome,
        variableExpenseTotal,
        subscriptionAnnualTotal,
        totalExpenses,
        balance,
        savingsRate,
        incomeRecordCount: yearIncomes.length,
        categoryEntries: Object.entries(categoryTotals)
            .filter(([, amount]) => amount > 0)
            .sort((a, b) => b[1] - a[1]),
        incomeBreakdown: {
            grossPay: sumIncomeField('grossPay'),
            taxes: sumIncomeField('incomeTax') + sumIncomeField('inhabitantTax'),
            socialInsurance: sumIncomeField('socialInsurance'),
            otherDeductions: sumIncomeField('otherDeductions'),
            transportation: sumIncomeField('transportation'),
            takeHomePay: totalIncome
        }
    };
}

function renderAnnualReport() {
    const report = getAnnualReportData(state.annualReportYear);
    document.getElementById('annual-year-display').textContent = `${report.year}年`;
    document.getElementById('annual-cashflow-title').textContent = `${report.year}年の月別収入・支出・収支`;
    document.getElementById('annual-monthly-title').textContent = `${report.year}年 1月〜12月の月別実績`;
    document.getElementById('annual-category-title').textContent = `${report.year}年の支出内訳`;
    document.getElementById('annual-income-breakdown-title').textContent = `${report.year}年の収入・控除内訳`;

    document.getElementById('annual-income-total').textContent = formatCurrency(report.totalIncome);
    document.getElementById('annual-income-note').textContent = `収入記録: ${report.incomeRecordCount}件`;
    document.getElementById('annual-expense-total').textContent = formatCurrency(report.totalExpenses);

    const balanceEl = document.getElementById('annual-balance-total');
    balanceEl.textContent = formatCurrency(report.balance);
    balanceEl.className = `card-value${report.balance < 0 ? ' text-danger' : ''}`;

    const savingsRateEl = document.getElementById('annual-savings-rate');
    savingsRateEl.textContent = formatPercentage(report.savingsRate);
    savingsRateEl.className = `card-value${report.savingsRate !== null && report.savingsRate < 0 ? ' text-danger' : ''}`;

    const breakdown = report.incomeBreakdown;
    document.getElementById('annual-gross-pay').textContent = formatCurrency(breakdown.grossPay);
    document.getElementById('annual-taxes').textContent = formatCurrency(breakdown.taxes);
    document.getElementById('annual-social-insurance').textContent = formatCurrency(breakdown.socialInsurance);
    document.getElementById('annual-other-deductions').textContent = formatCurrency(breakdown.otherDeductions);
    document.getElementById('annual-transportation').textContent = formatCurrency(breakdown.transportation);
    document.getElementById('annual-take-home-pay').textContent = formatCurrency(breakdown.takeHomePay);

    renderAnnualMonthlyTable(report.months);
    renderAnnualCashflowChart(report);
    renderAnnualCategoryChart(report);
}

function renderAnnualMonthlyTable(months) {
    const tbody = document.getElementById('annual-monthly-tbody');
    tbody.replaceChildren();

    months.forEach(month => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="月"><strong>${month.month}月</strong></td>
            <td data-label="手取り収入" class="text-right">${formatCurrency(month.income)}</td>
            <td data-label="総支出" class="text-right">${formatCurrency(month.expenses)}</td>
            <td data-label="収支" class="text-right ${month.balance >= 0 ? 'text-primary' : 'text-danger'}">${formatCurrency(month.balance)}</td>
            <td data-label="貯蓄率" class="text-right">${formatPercentage(month.savingsRate)}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderAnnualCashflowChart(report) {
    const ctx = document.getElementById('annual-cashflow-chart').getContext('2d');
    const theme = getChartTheme();
    const chartFont = { family: 'Roboto, "Noto Sans JP", sans-serif', size: 11 };

    if (annualCashflowChart) annualCashflowChart.destroy();

    annualCashflowChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: report.months.map(month => `${month.month}月`),
            datasets: [
                {
                    label: '手取り収入',
                    data: report.months.map(month => month.income),
                    backgroundColor: theme.primary,
                    borderRadius: 7,
                    order: 2
                },
                {
                    label: '総支出',
                    data: report.months.map(month => month.expenses),
                    backgroundColor: theme.error,
                    borderRadius: 7,
                    order: 2
                },
                {
                    type: 'line',
                    label: '収支',
                    data: report.months.map(month => month.balance),
                    borderColor: theme.onTertiaryContainer,
                    backgroundColor: colorWithAlpha(theme.onTertiaryContainer, 0.12),
                    borderWidth: 3,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: 0.28,
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { font: chartFont, color: theme.onSurfaceVariant } },
                tooltip: { callbacks: { label: context => ` ${context.dataset.label}: ${formatCurrency(context.raw)}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: chartFont, color: theme.onSurfaceVariant } },
                y: {
                    grid: { color: theme.outlineVariant },
                    ticks: {
                        font: chartFont,
                        color: theme.onSurfaceVariant,
                        callback: value => Math.abs(value) >= 10000 ? `${value / 10000}万円` : `${value}円`
                    }
                }
            }
        }
    });
}

function renderAnnualCategoryChart(report) {
    const ctx = document.getElementById('annual-category-chart').getContext('2d');
    const theme = getChartTheme();
    const colors = [
        theme.primary,
        theme.onTertiaryContainer,
        theme.inversePrimary,
        theme.onSecondaryContainer,
        theme.outline,
        theme.primaryContainer,
        theme.tertiaryContainer,
        theme.inverseSurface,
        theme.outlineVariant
    ];
    const labels = report.categoryEntries.map(([category]) => category);
    const values = report.categoryEntries.map(([, amount]) => amount);
    const list = document.getElementById('annual-category-list');
    list.replaceChildren();

    report.categoryEntries.slice(0, 5).forEach(([category, amount], index) => {
        const item = document.createElement('li');
        const label = document.createElement('span');
        label.className = 'category-rank-label';
        const dot = document.createElement('span');
        dot.className = 'category-color-dot';
        dot.style.backgroundColor = colors[index % colors.length];
        const name = document.createElement('span');
        name.textContent = category;
        label.append(dot, name);
        const value = document.createElement('strong');
        value.textContent = formatCurrency(amount);
        item.append(label, value);
        list.appendChild(item);
    });

    if (annualCategoryChart) annualCategoryChart.destroy();

    if (values.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'category-empty';
        emptyItem.textContent = '選択年の支出データはありません。';
        list.appendChild(emptyItem);
        annualCategoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['データなし'], datasets: [{ data: [1], backgroundColor: [theme.surfaceContainerHighest], borderWidth: 0 }] },
            plugins: [doughnutCenterLabel],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false }, doughnutCenterLabel: { caption: '年間支出', total: 0 } },
                cutout: '68%'
            }
        });
        return;
    }

    annualCategoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: labels.map((_, index) => colors[index % colors.length]),
                borderWidth: 1,
                borderColor: theme.surface,
                hoverOffset: 4
            }]
        },
        plugins: [doughnutCenterLabel],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: context => ` ${context.label}: ${formatCurrency(context.raw)}` } },
                doughnutCenterLabel: { caption: '年間支出', total: report.totalExpenses }
            },
            cutout: '68%'
        }
    });
}

// --- Dashboard Render Logic ---
function renderDashboard() {
    const totalSubsMonthly = state.subscriptions.reduce((sum, sub) => sum + Number(sub.monthlyAmount || 0), 0);
    const prevMonthDate = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    const currentIncomes = filterIncomesByMonth(state.incomes, state.currentMonth);
    const prevIncomes = filterIncomesByMonth(state.incomes, prevMonthDate);
    const totalIncome = currentIncomes.reduce((sum, income) => sum + Number(income.takeHomePay || 0), 0);
    const prevTotalIncome = prevIncomes.reduce((sum, income) => sum + Number(income.takeHomePay || 0), 0);
    const currentExpenses = filterExpensesByMonth(state.expenses, state.currentMonth);
    const prevExpenses = filterExpensesByMonth(state.expenses, prevMonthDate);
    const totalExpenses = currentExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) + totalSubsMonthly;
    const prevTotalExpenses = prevExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0) + totalSubsMonthly;

    const latestAssetRecords = getLatestAssetRecords();
    const latestAsset = latestAssetRecords[0] || null;
    const previousAsset = latestAssetRecords[1] || null;
    const assetTrendEl = document.getElementById('assets-trend');
    document.getElementById('total-assets').textContent = latestAsset ? formatCurrency(latestAsset.total) : '—';
    document.getElementById('assets-as-of').textContent = latestAsset ? formatAssetAsOfDate(latestAsset.date) : '記録なし';
    if (latestAsset && previousAsset) {
        const assetDiff = Number(latestAsset.total || 0) - Number(previousAsset.total || 0);
        assetTrendEl.className = `card-trend ${assetDiff >= 0 ? 'text-success' : 'text-danger'}`;
        assetTrendEl.textContent = `前回記録比: ${assetDiff >= 0 ? '+' : ''}${formatCurrency(assetDiff)}`;
    } else {
        assetTrendEl.className = 'card-trend';
        assetTrendEl.textContent = latestAsset ? '比較データなし' : '資産記録なし';
    }

    const incomeDiff = totalIncome - prevTotalIncome;
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('income-desc').textContent = `前月比: ${incomeDiff >= 0 ? '+' : ''}${formatCurrency(incomeDiff)}`;
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    const expenseDiff = totalExpenses - prevTotalExpenses;
    const expenseTrendEl = document.getElementById('expense-desc-card');
    expenseTrendEl.className = `card-trend ${expenseDiff > 0 ? 'text-danger' : 'text-success'}`;
    expenseTrendEl.textContent = `前月比: ${expenseDiff >= 0 ? '+' : ''}${formatCurrency(expenseDiff)}`;

    const currentBalance = totalIncome - totalExpenses;
    const previousBalance = prevTotalIncome - prevTotalExpenses;
    const balanceDiff = currentBalance - previousBalance;
    const balanceEl = document.getElementById('monthly-balance');
    balanceEl.textContent = formatCurrency(currentBalance);
    balanceEl.className = `card-value ${currentBalance >= 0 ? 'text-primary' : 'text-danger'}`;
    const balanceTrendEl = document.getElementById('balance-trend');
    balanceTrendEl.className = `card-trend ${balanceDiff >= 0 ? 'text-success' : 'text-danger'}`;
    balanceTrendEl.textContent = `前月比: ${balanceDiff >= 0 ? '+' : ''}${formatCurrency(balanceDiff)}`;
    document.getElementById('total-subs-monthly').textContent = formatCurrency(totalSubsMonthly);
    document.getElementById('total-subs-count').textContent = `契約数: ${state.subscriptions.length} 件`;

    document.getElementById('category-chart-title').textContent = `${state.currentMonth.getFullYear()}年${state.currentMonth.getMonth() + 1}月の支出内訳`;
    document.getElementById('recent-expenses-title').textContent = `${state.currentMonth.getFullYear()}年${state.currentMonth.getMonth() + 1}月の最近の支出`;
    renderCategoryDoughnut(currentExpenses, totalSubsMonthly);
    renderRecentExpenses(currentExpenses);
    renderCashflowChart();
    renderAssetChart();
}

function renderExpenseLedger(container, expenses, emptyMessage) {
    container.replaceChildren();

    if (expenses.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'expense-ledger-empty';
        empty.textContent = emptyMessage;
        container.appendChild(empty);
        return;
    }

    const sortedExpenses = [...expenses].sort((a, b) => safeParseDate(b.date) - safeParseDate(a.date));
    const groupedExpenses = new Map();

    sortedExpenses.forEach(expense => {
        const parsedDate = safeParseDate(expense.date);
        const dateKey = parsedDate.getTime() === 0
            ? String(expense.date || '日付不明')
            : `${parsedDate.getFullYear()}-${parsedDate.getMonth()}-${parsedDate.getDate()}`;
        if (!groupedExpenses.has(dateKey)) groupedExpenses.set(dateKey, []);
        groupedExpenses.get(dateKey).push(expense);
    });

    groupedExpenses.forEach(groupExpenses => {
        const group = document.createElement('section');
        group.className = 'expense-date-group';
        group.innerHTML = `<h3 class="expense-date-label">${escapeHtml(formatFullDateAndWeek(groupExpenses[0].date))}</h3>`;

        groupExpenses.forEach(expense => {
            const entry = document.createElement('article');
            entry.className = 'expense-entry';
            entry.innerHTML = `
                <div class="expense-entry-main">
                    <span class="expense-entry-category">${escapeHtml(expense.category || '項目なし')}</span>
                    <strong class="expense-entry-amount">-${formatCurrency(Number(expense.amount) || 0)}</strong>
                </div>
                <p class="expense-entry-note">${escapeHtml(expense.description || '備考なし')}</p>
            `;
            group.appendChild(entry);
        });

        container.appendChild(group);
    });
}

function renderRecentExpenses(currentMonthExpenses) {
    const recent = [...currentMonthExpenses]
        .sort((a, b) => safeParseDate(b.date) - safeParseDate(a.date))
        .slice(0, 5);
    renderExpenseLedger(
        document.getElementById('recent-expenses-list'),
        recent,
        '選択月の支出データはありません。'
    );
}

// --- Chart.js Draw Functions (Light Mode Custom Styling) ---

// 週次資産推移チャート
// 週次資産推移チャート
function renderAssetChart() {
    const ctx = document.getElementById('asset-trend-chart').getContext('2d');
    
    // 日付昇順でソート
    let sortedAssets = [...state.assets].sort((a, b) => safeParseDate(a.date) - safeParseDate(b.date));
    
    // 表示期間でフィルタリング
    if (state.assetRange && state.assetRange !== 'all' && sortedAssets.length > 0) {
        // 最新レコードの日付を基準にする
        const latestDate = safeParseDate(sortedAssets[sortedAssets.length - 1].date);
        let cutoffDate = new Date(latestDate);
        
        if (state.assetRange === '1m') {
            cutoffDate.setMonth(latestDate.getMonth() - 1);
        } else if (state.assetRange === '3m') {
            cutoffDate.setMonth(latestDate.getMonth() - 3);
        } else if (state.assetRange === '6m') {
            cutoffDate.setMonth(latestDate.getMonth() - 6);
        } else if (state.assetRange === '1y') {
            cutoffDate.setFullYear(latestDate.getFullYear() - 1);
        }
        
        sortedAssets = sortedAssets.filter(a => safeParseDate(a.date) >= cutoffDate);
    }

    // 詳細リストの初期表示（最新レコードを初期セット）
    if (sortedAssets.length > 0) {
        updateAssetDetailPanel(sortedAssets[sortedAssets.length - 1]);
    } else {
        // データがない場合は空欄リセット
        document.getElementById('hover-date').textContent = '-';
        document.getElementById('hover-total').textContent = '¥0';
        document.getElementById('hover-cash').textContent = '¥0';
        document.getElementById('hover-stocks').textContent = '¥0';
        document.getElementById('hover-trusts').textContent = '¥0';
        document.getElementById('hover-points').textContent = '¥0';
    }

    const labels = sortedAssets.map(a => {
        const d = safeParseDate(a.date);
        if (isNaN(d.getTime()) || d.getTime() === 0) return String(a.date).split(" ")[0];
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    }); // 年月日すべて表示
    const theme = getChartTheme();
    const themeColor = theme.primary;

    if (assetTrendChart) {
        assetTrendChart.destroy();
    }

    // Theme roles also drive Chart.js, which renders outside normal CSS styling.
    const fontConfig = { family: 'Roboto, "Noto Sans JP", sans-serif', size: 11 };

    if (!state.showAssetsBreakdown) {
        // 総資産のみの一本のライン
        const totals = sortedAssets.map(a => a.total);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, colorWithAlpha(theme.primary, 0.18));
        gradient.addColorStop(1, colorWithAlpha(theme.primary, 0));

        assetTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '総資産額',
                    data: totals,
                    borderColor: themeColor,
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.25,
                    pointBackgroundColor: themeColor,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                onHover: (event, activeElements) => {
                    // ホバーされたデータポイントの詳細を下部パネルに反映（指を離しても値が残るように、アクティブな時のみ更新）
                    if (activeElements && activeElements.length > 0) {
                        const index = activeElements[0].index;
                        updateAssetDetailPanel(sortedAssets[index]);
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` 総資産: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { color: theme.outlineVariant }, ticks: { font: fontConfig, color: theme.onSurfaceVariant } },
                    y: {
                        grid: { color: theme.outlineVariant },
                        ticks: {
                            font: fontConfig,
                            color: theme.onSurfaceVariant,
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
                        borderColor: theme.onTertiaryContainer,
                        backgroundColor: colorWithAlpha(theme.onTertiaryContainer, 0.24),
                        fill: true,
                        tension: 0.25,
                        pointBackgroundColor: theme.onTertiaryContainer
                    },
                    {
                        label: '投資信託',
                        data: trusts,
                        borderColor: theme.primary,
                        backgroundColor: colorWithAlpha(theme.primary, 0.24),
                        fill: true,
                        tension: 0.25,
                        pointBackgroundColor: theme.primary
                    },
                    {
                        label: '株式(現物)',
                        data: stocks,
                        borderColor: theme.inverseSurface,
                        backgroundColor: colorWithAlpha(theme.inverseSurface, 0.2),
                        fill: true,
                        tension: 0.25,
                        pointBackgroundColor: theme.inverseSurface
                    },
                    {
                        label: 'ポイント',
                        data: points,
                        borderColor: theme.outline,
                        backgroundColor: colorWithAlpha(theme.outline, 0.24),
                        fill: true,
                        tension: 0.25,
                        pointBackgroundColor: theme.outline
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                onHover: (event, activeElements) => {
                    if (activeElements && activeElements.length > 0) {
                        const index = activeElements[0].index;
                        updateAssetDetailPanel(sortedAssets[index]);
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { font: fontConfig, color: theme.onSurfaceVariant }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { color: theme.outlineVariant }, ticks: { font: fontConfig, color: theme.onSurfaceVariant } },
                    y: {
                        stacked: true,
                        grid: { color: theme.outlineVariant },
                        ticks: {
                            font: fontConfig,
                            color: theme.onSurfaceVariant,
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
    document.getElementById('btn-toggle-total').setAttribute('aria-pressed', 'true');
    document.getElementById('btn-toggle-breakdown').classList.remove('active');
    document.getElementById('btn-toggle-breakdown').setAttribute('aria-pressed', 'false');
    state.showAssetsBreakdown = false;
    renderAssetChart();
});
document.getElementById('btn-toggle-breakdown').addEventListener('click', () => {
    document.getElementById('btn-toggle-breakdown').classList.add('active');
    document.getElementById('btn-toggle-breakdown').setAttribute('aria-pressed', 'true');
    document.getElementById('btn-toggle-total').classList.remove('active');
    document.getElementById('btn-toggle-total').setAttribute('aria-pressed', 'false');
    state.showAssetsBreakdown = true;
    renderAssetChart();
});

// 期間切り替えボタンのバインド
document.querySelectorAll('.btn-range').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-range').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        state.assetRange = btn.getAttribute('data-range');
        renderAssetChart();
    });
});

// 資産詳細表示パネルの更新ヘルパー
function updateAssetDetailPanel(data) {
    if (!data) return;
    
    // 日付から曜日や不要な文字を取り除き、純粋な年月日(YYYY/MM/DD)を抽出
    let rawDate = data.date ? String(data.date).split(" ")[0] : '-';
    const d = safeParseDate(data.date);
    if (!isNaN(d.getTime()) && d.getTime() !== 0) {
        rawDate = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    } else {
        rawDate = rawDate.replace(/\(.\)/g, '').trim();
    }
    
    const dateEl = document.getElementById('hover-date');
    if (dateEl) dateEl.textContent = rawDate;
    
    document.getElementById('hover-total').textContent = formatCurrency(data.total || 0);
    document.getElementById('hover-cash').textContent = formatCurrency(data.cash || 0);
    document.getElementById('hover-stocks').textContent = formatCurrency(data.stocks || 0);
    document.getElementById('hover-trusts').textContent = formatCurrency(data.trusts || 0);
    document.getElementById('hover-points').textContent = formatCurrency(data.points || 0);
}

// 月次収支推移 (過去6ヶ月)
function renderCashflowChart() {
    const ctx = document.getElementById('monthly-trend-chart').getContext('2d');
    const theme = getChartTheme();
    const chartFont = { family: 'Roboto, "Noto Sans JP", sans-serif', size: 11 };
    
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
        const parsed = getExpenseYearMonth(exp);
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
                    backgroundColor: theme.primary,
                    borderRadius: 8
                },
                {
                    label: '総支出 (サブスク含)',
                    data: expensesData,
                    backgroundColor: theme.error,
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: chartFont, color: theme.onSurfaceVariant }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: chartFont, color: theme.onSurfaceVariant } },
                y: {
                    grid: { color: theme.outlineVariant },
                    ticks: {
                        font: chartFont,
                        color: theme.onSurfaceVariant,
                        callback: (val) => val >= 10000 ? (val / 10000) + '万円' : val + '円'
                    }
                }
            }
        }
    });
}

const doughnutCenterLabel = {
    id: 'doughnutCenterLabel',
    afterDraw(chart, _args, options) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const theme = getChartTheme();
        ctx.fillStyle = theme.onSurfaceVariant;
        ctx.font = '600 11px Roboto, "Noto Sans JP", sans-serif';
        ctx.fillText(options.caption || '支出合計', centerX, centerY - 12);
        ctx.fillStyle = theme.onSurface;
        ctx.font = '700 16px Roboto, "Noto Sans JP", sans-serif';
        ctx.fillText(formatCurrency(options.total || 0), centerX, centerY + 11);
        ctx.restore();
    }
};

// カテゴリ別支出割合 (ドーナツ)
function renderCategoryDoughnut(currentMonthExpenses, totalSubsMonthly) {
    const ctx = document.getElementById('category-distribution-chart').getContext('2d');
    const theme = getChartTheme();

    const expenseByCat = {};
    currentMonthExpenses.forEach(exp => {
        const category = exp.category || '未分類';
        expenseByCat[category] = (expenseByCat[category] || 0) + Number(exp.amount || 0);
    });
    if (totalSubsMonthly > 0) expenseByCat['サブスク'] = (expenseByCat['サブスク'] || 0) + totalSubsMonthly;

    const categoryEntries = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]);
    const labels = categoryEntries.map(([category]) => category);
    const dataVals = categoryEntries.map(([, amount]) => amount);
    const total = dataVals.reduce((sum, amount) => sum + amount, 0);
    const colors = [
        theme.primary,
        theme.onTertiaryContainer,
        theme.inversePrimary,
        theme.onSecondaryContainer,
        theme.outline,
        theme.primaryContainer,
        theme.tertiaryContainer,
        theme.inverseSurface,
        theme.outlineVariant
    ];

    const topList = document.getElementById('category-top-list');
    topList.replaceChildren();
    categoryEntries.slice(0, 5).forEach(([category, amount], index) => {
        const item = document.createElement('li');
        const label = document.createElement('span');
        label.className = 'category-rank-label';
        const dot = document.createElement('span');
        dot.className = 'category-color-dot';
        dot.style.backgroundColor = colors[index % colors.length];
        const name = document.createElement('span');
        name.textContent = category;
        label.append(dot, name);
        const value = document.createElement('strong');
        value.textContent = formatCurrency(amount);
        item.append(label, value);
        topList.appendChild(item);
    });

    if (categoryDistributionChart) {
        categoryDistributionChart.destroy();
    }

    if (dataVals.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'category-empty';
        emptyItem.textContent = '選択月の支出データはありません。';
        topList.appendChild(emptyItem);
        categoryDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['データなし'],
                datasets: [{ data: [1], backgroundColor: [theme.surfaceContainerHighest], borderWidth: 0 }]
            },
            plugins: [doughnutCenterLabel],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                    doughnutCenterLabel: { caption: '支出合計', total: 0 }
                },
                cutout: '68%'
            }
        });
    } else {
        categoryDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataVals,
                    backgroundColor: labels.map((_, index) => colors[index % colors.length]),
                    borderWidth: 1,
                    borderColor: theme.surface,
                    hoverOffset: 4
                }]
            },
            plugins: [doughnutCenterLabel],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.raw)}`
                        }
                    },
                    doughnutCenterLabel: { caption: '支出合計', total }
                },
                cutout: '68%'
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

    document.getElementById('expense-count').textContent = `選択月の支出明細: 全 ${displayList.length} 件`;
    renderExpenseLedger(
        document.getElementById('expense-list'),
        displayList,
        '条件に該当する支出明細はありません。'
    );
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
    
    document.getElementById('income-count').textContent = `選択月の収入明細: 全 ${currentMonthIncomes.length} 件`;

    if (currentMonthIncomes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">選択月の収入明細はありません。</td></tr>';
        return;
    }

    currentMonthIncomes.forEach(inc => {
        // 表示用に月のみを抽出 (例: "2026年07月" -> "7月")
        const parsed = parseYearMonth(inc.yearMonth);
        const monthDisplay = parsed ? (parsed.month + 1) + '月' : inc.yearMonth;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="年月"><strong>${escapeHtml(monthDisplay)}</strong></td>
            <td data-label="収入区分"><span class="badge-type income">${escapeHtml(inc.incomeType)}</span></td>
            <td data-label="総支給額">${formatCurrency(inc.grossPay)}</td>
            <td data-label="所得税" class="text-muted">${formatCurrency(inc.incomeTax)}</td>
            <td data-label="住民税" class="text-muted">${formatCurrency(inc.inhabitantTax)}</td>
            <td data-label="社会保険料" class="text-muted">${formatCurrency(inc.socialInsurance)}</td>
            <td data-label="その他控除" class="text-muted">${formatCurrency(inc.otherDeductions)}</td>
            <td data-label="控除合計" class="text-danger">${formatCurrency(inc.deductionTotal)}</td>
            <td data-label="交通費">${formatCurrency(inc.transportation)}</td>
            <td data-label="手取り" class="text-right text-success font-bold">${formatCurrency(inc.takeHomePay)}</td>
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
            <td data-label="年">${sub.year}年</td>
            <td data-label="媒体名"><strong>${escapeHtml(sub.name)}</strong></td>
            <td data-label="支出金額">${formatCurrency(sub.amount)}</td>
            <td data-label="支払回数">年 ${sub.paymentCount} 回</td>
            <td data-label="年間支払額">${formatCurrency(sub.annualAmount)}</td>
            <td data-label="月当たり" class="text-right font-bold text-primary">${formatCurrency(sub.monthlyAmount)} /月</td>
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
        btnExp.setAttribute('aria-pressed', 'true');
        btnInc.classList.remove('active');
        btnInc.setAttribute('aria-pressed', 'false');
        formExp.classList.remove('hidden');
        formInc.classList.add('hidden');
    });

    btnInc.addEventListener('click', () => {
        btnInc.classList.add('active');
        btnInc.setAttribute('aria-pressed', 'true');
        btnExp.classList.remove('active');
        btnExp.setAttribute('aria-pressed', 'false');
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
                localStorage.setItem('kakeibo_demo_expenses_v2', JSON.stringify(state.expenses));
                showToast('【デモモード】ローカルに支出を一時保存しました。スプレッドシートには反映されません。', 'warning');
                onTransactionSaved();
            } else {
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

                if (data.status === 'success') {
                    showToast('スプレッドシートに支出を追記しました！', 'success');
                    onTransactionSaved();
                    void syncWithGas({ background: true, silent: true });
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
                localStorage.setItem('kakeibo_demo_incomes_v2', JSON.stringify(state.incomes));
                showToast('【デモモード】ローカルに収入を一時保存しました。スプレッドシートには反映されません。', 'warning');
                onTransactionSaved();
            } else {
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

                if (data.status === 'success') {
                    showToast('スプレッドシートに収入を追記しました！', 'success');
                    onTransactionSaved();
                    void syncWithGas({ background: true, silent: true });
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
    showMainTab('dashboard');
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

            if (data.status === 'success') {
                state.gasUrl = url;
                localStorage.setItem('kakeibo_gas_url', url);
                state.isDemoMode = false;
                state.syncState = 'synced';
                state.lastSyncedAt = Date.now();
                
                applyApiData(data);
                saveApiDataCache();

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
            clearApiDataCache();
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

function formatPercentage(value) {
    return Number.isFinite(value) ? `${value.toFixed(1)}%` : '—';
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

function getExpenseYearMonth(expense) {
    return parseYearMonth(expense?.date) || parseYearMonth(expense?.yearMonth);
}

// 支出データを月でフィルタリング
function filterExpensesByMonth(expenses, targetDate) {
    if (!Array.isArray(expenses)) return [];
    if (!targetDate || !(targetDate instanceof Date)) return [];
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    return expenses.filter(exp => {
        if (!exp) return false;
        const parsed = getExpenseYearMonth(exp);
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
    toastIcon.setAttribute('class', 'icon toast-icon');
    const iconName = type === 'success' ? 'check-circle' : type === 'danger' ? 'cancel' : 'info';
    toastIcon.querySelector('use').setAttribute('href', `#icon-${iconName}`);

    toast.classList.remove('hidden');

    toastTimer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}

// 日付グループ見出し用（例: "2026/09/04" -> "2026年9月4日（金）"）
function formatFullDateAndWeek(dateStr) {
    if (!dateStr) return '日付不明';
    const dateObj = safeParseDate(dateStr);
    if (dateObj.getTime() === 0) return String(dateStr);

    const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];
    return `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日（${dayOfWeek}）`;
}

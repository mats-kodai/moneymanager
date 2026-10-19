/* Entirely fictional, deterministic fixtures. Never derived from a connected sheet. */
function createDemoData(year = new Date().getFullYear()) {
    const data = { assets: [], incomes: [], expenses: [], subscriptions: [], budgetPlans: [], specialBudgets: [], annualBudgets: [], itemBudgets: [], assetTargets: [], otherAssets: [] };
    const dateString = date => `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const addExpense = (month, day, category, amount, description) => data.expenses.push({
        id: `demo-exp-${data.expenses.length}`, yearMonth: `${year}/${month}`, date: dateString(new Date(year, month - 1, day)), category, amount, description
    });
    for (let month = 1; month <= 12; month++) {
        const bonus = month === 6 || month === 12;
        const grossPay = 320000 + (month % 3) * 10000 + (bonus ? 400000 : 0);
        const incomeTax = bonus ? 35000 : 10000;
        const inhabitantTax = 15000;
        const socialInsurance = bonus ? 90000 : 45000;
        const otherDeductions = 10000;
        const deductionTotal = incomeTax + inhabitantTax + socialInsurance + otherDeductions;
        data.incomes.push({id: `demo-inc-${month}`, yearMonth: `${year}/${month}`, incomeType: '給与所得', grossPay, incomeTax, inhabitantTax, socialInsurance, otherDeductions, deductionTotal, transportation: 0, takeHomePay: grossPay - deductionTotal});
        addExpense(month, 1, '家賃', 65000, 'サンプル住居');
        for (let week = 0; week < 4; week++) {
            addExpense(month, 3 + week * 7, '個人_食費', 6000 + ((month + week) % 4) * 1000, 'サンプルスーパー');
        }
        addExpense(month, 8, '交友_食費', 8000 + (month % 3) * 3000, '友人との食事');
        addExpense(month, 10, '交通費', 5000 + (month % 2) * 2000, '電車・バス');
        addExpense(month, 12, '日用品・被服費', 9000 + (month % 4) * 3000, '生活用品');
        addExpense(month, 16, '娯楽費', 6000 + (month % 3) * 4000, '映画・イベント');
        addExpense(month, 18, '教育費・研鑽費', 4000, '書籍');
        addExpense(month, 20, '通信費', 5000, '通信料金');
        addExpense(month, 22, '雑費', 3000, 'その他');
        if (month % 3 === 0) addExpense(month, 15, '医療費', 5000, '通院');
        if (month === 5 || month === 11) addExpense(month, 19, '交際費', 20000, 'お祝い');
        if (month === 3 || month === 8) addExpense(month, 21, '旅費', month === 8 ? 150000 : 100000, '旅行・宿泊');
        if (month === 10) addExpense(month, 24, '日用品・被服費', 120000, '特別予算：家電');
        data.otherAssets.push({id: `demo-asset-${month}`, date: dateString(new Date(year, month - 1, 15)), zaikei: 100000 + month * 30000, shares: 20 + month * 3});
    }
    data.subscriptions = [
        {year, name: 'サンプル動画', amount: 1000, paymentCount: 12, annualAmount: 12000, monthlyAmount: 1000},
        {year, name: 'サンプル音楽', amount: 1000, paymentCount: 12, annualAmount: 12000, monthlyAmount: 1000},
        {year, name: 'サンプルクラウド', amount: 6000, paymentCount: 1, annualAmount: 6000, monthlyAmount: 500}
    ];
    // Subscriptions are added by the existing monthly calculation; do not duplicate them in expenses.
    for (let offset = 0; offset < 5; offset++) {
        const planYear = year + offset;
        for (let month = 1; month <= 12; month++) {
            const grossIncomePlan = 330000 + offset * 10000 + ([6, 12].includes(month) ? 400000 : 0);
            const takeHomePlan = grossIncomePlan - ([6, 12].includes(month) ? 150000 : 80000);
            data.budgetPlans.push({yearMonth: `${planYear}/${month}`, grossIncomePlan, takeHomePlan, recurringExpensePlan: 160000, balancePlan: takeHomePlan - 160000});
        }
        const spentAmount = offset === 0 ? data.expenses.filter(e => e.category === '旅費' || e.description.includes('特別予算')).reduce((sum, e) => sum + e.amount, 0) : 0;
        data.specialBudgets.push({year: planYear, budgetAmount: 500000, spentAmount, remainingAmount: 500000 - spentAmount});
        data.assetTargets.push({calendarYear: planYear, targetAmount: 3000000 + offset * 1500000, targetType: '年末目標', note: 'デモ'});
        data.itemBudgets.push({fiscalYear: `FY${planYear}`, budgetType: '特別', item: '旅行', unit: '年', budgetAmount: 300000, expenseCategory: '旅費', minimumAmount: 0});
    }
    let week = 0;
    for (let day = new Date(year, 0, 1); day.getFullYear() === year; day.setDate(day.getDate() + 7)) {
        const cash = 600000 + week * 12000;
        const stocks = 200000 + week * 3000;
        const trusts = 700000 + week * 15000;
        const points = 10000;
        data.assets.push({date: dateString(day), cash, stocks, trusts, points, total: cash + stocks + trusts + points, demoBaseTotal: cash + stocks + trusts + points, demoPrice: 3500 + (week % 9) * 50});
        week++;
    }
    return data;
}

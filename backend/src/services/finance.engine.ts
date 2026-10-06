import type {
  FinancialScenario,
  FinancialMetricYear,
} from '../../../shared/types/agent.ts';

/**
 * Deterministic Financial Arithmetic Calculation Engine.
 * All arithmetic, cash runways, P&L, and break-even milestones are computed strictly
 * by this deterministic server-side engine, NEVER by the LLM.
 */
export class FinanceCalculationEngine {
  /**
   * Generates month-by-month financial projection for 12 months.
   */
  public static calculateTwelveMonthMetrics(
    startingBudget: number,
    initialSetupCosts: number,
    monthlyOpEx: number,
    startingMonthlyRevenue: number,
    monthlyRevenueGrowthRate: number // e.g. 0.15 for 15% growth
  ): FinancialMetricYear[] {
    const metrics: FinancialMetricYear[] = [];
    let cash = Math.max(0, startingBudget - initialSetupCosts);

    for (let month = 1; month <= 12; month++) {
      // Revenue grows month over month starting from month 2 or 3
      const revenue = month === 1
        ? Math.round(startingMonthlyRevenue * 0.2) // Ramp up month 1
        : Math.round(startingMonthlyRevenue * Math.pow(1 + monthlyRevenueGrowthRate, month - 1));

      // Operating expenses may increase modestly with scale
      const expenses = Math.round(monthlyOpEx * (1 + (month - 1) * 0.02));
      const netIncome = revenue - expenses;
      const burnRate = Math.max(0, expenses - revenue);
      cash = Math.max(0, cash + netIncome);

      metrics.push({
        month,
        revenue,
        expenses,
        netIncome,
        cashRemaining: cash,
        burnRate,
      });
    }

    return metrics;
  }

  /**
   * Calculates cash runway in months.
   */
  public static calculateRunway(cashAvailable: number, netMonthlyBurn: number): number {
    if (netMonthlyBurn <= 0) return 99; // Profitable or self-sustaining
    if (cashAvailable <= 0) return 0;
    const runway = cashAvailable / netMonthlyBurn;
    return Math.round(runway * 10) / 10;
  }

  /**
   * Computes the three standard financial scenarios (conservative, expected, optimistic).
   */
  public static generateScenarios(
    startingBudget: number,
    initialSetup: number,
    baseMonthlyOpEx: number,
    baseExpectedRevenue: number
  ): {
    conservative: FinancialScenario;
    expected: FinancialScenario;
    optimistic: FinancialScenario;
  } {
    // 1. Conservative: Higher OpEx (+25%), lower revenue (-40%), slower growth (5%/mo)
    const consOpEx = Math.round(baseMonthlyOpEx * 1.25);
    const consRev = Math.round(baseExpectedRevenue * 0.6);
    const consMetrics = this.calculateTwelveMonthMetrics(
      startingBudget,
      initialSetup,
      consOpEx,
      consRev,
      0.05
    );
    const consTotalRev = consMetrics.reduce((sum, m) => sum + m.revenue, 0);
    const consTotalExp = consMetrics.reduce((sum, m) => sum + m.expenses, 0) + initialSetup;
    const consBreakEven = consMetrics.find((m) => m.netIncome >= 0)?.month || null;
    const consNetBurn = Math.max(1, consOpEx - consRev);

    const conservative: FinancialScenario = {
      scenario: 'conservative',
      initialInvestmentINR: startingBudget,
      monthlyOperatingCostINR: consOpEx,
      expectedMonthlyRevenueINR: consRev,
      runwayMonths: this.calculateRunway(startingBudget - initialSetup, consNetBurn),
      breakEvenMonth: consBreakEven,
      twelveMonthRevenueINR: consTotalRev,
      twelveMonthExpensesINR: consTotalExp,
      twelveMonthProfitINR: consTotalRev - consTotalExp,
    };

    // 2. Expected (Baseline): Base OpEx, base revenue, 15% monthly growth
    const expMetrics = this.calculateTwelveMonthMetrics(
      startingBudget,
      initialSetup,
      baseMonthlyOpEx,
      baseExpectedRevenue,
      0.15
    );
    const expTotalRev = expMetrics.reduce((sum, m) => sum + m.revenue, 0);
    const expTotalExp = expMetrics.reduce((sum, m) => sum + m.expenses, 0) + initialSetup;
    const expBreakEven = expMetrics.find((m) => m.netIncome >= 0)?.month || null;
    const expNetBurn = Math.max(1, baseMonthlyOpEx - baseExpectedRevenue * 0.5);

    const expected: FinancialScenario = {
      scenario: 'expected',
      initialInvestmentINR: startingBudget,
      monthlyOperatingCostINR: baseMonthlyOpEx,
      expectedMonthlyRevenueINR: baseExpectedRevenue,
      runwayMonths: this.calculateRunway(startingBudget - initialSetup, expNetBurn),
      breakEvenMonth: expBreakEven,
      twelveMonthRevenueINR: expTotalRev,
      twelveMonthExpensesINR: expTotalExp,
      twelveMonthProfitINR: expTotalRev - expTotalExp,
    };

    // 3. Optimistic: Lower OpEx (-10%), higher revenue (+35%), 25% monthly growth
    const optOpEx = Math.round(baseMonthlyOpEx * 0.9);
    const optRev = Math.round(baseExpectedRevenue * 1.35);
    const optMetrics = this.calculateTwelveMonthMetrics(
      startingBudget,
      initialSetup,
      optOpEx,
      optRev,
      0.25
    );
    const optTotalRev = optMetrics.reduce((sum, m) => sum + m.revenue, 0);
    const optTotalExp = optMetrics.reduce((sum, m) => sum + m.expenses, 0) + initialSetup;
    const optBreakEven = optMetrics.find((m) => m.netIncome >= 0)?.month || null;
    const optNetBurn = Math.max(1, optOpEx - optRev * 0.8);

    const optimistic: FinancialScenario = {
      scenario: 'optimistic',
      initialInvestmentINR: startingBudget,
      monthlyOperatingCostINR: optOpEx,
      expectedMonthlyRevenueINR: optRev,
      runwayMonths: this.calculateRunway(startingBudget - initialSetup, optNetBurn),
      breakEvenMonth: optBreakEven,
      twelveMonthRevenueINR: optTotalRev,
      twelveMonthExpensesINR: optTotalExp,
      twelveMonthProfitINR: optTotalRev - optTotalExp,
    };

    return { conservative, expected, optimistic };
  }
}

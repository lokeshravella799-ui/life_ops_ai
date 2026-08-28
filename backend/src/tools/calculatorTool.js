const { z } = require('zod');

const calculatorInputSchema = z.object({
  operation: z.enum(['BUDGET_BREAKDOWN', 'TOTAL_SUM', 'PERCENTAGE', 'TIMELINE_MATH', 'CURRENCY_CONVERSION']),
  totalAmount: z.number().optional(),
  currency: z.string().default('USD'),
  categories: z.array(z.object({
    name: z.string(),
    percentage: z.number().optional(),
    fixedAmount: z.number().optional()
  })).optional(),
  numbers: z.array(z.number()).optional(),
  days: z.number().optional(),
  hoursPerDay: z.number().optional(),
  targetExchangeRate: z.number().optional(),
  targetCurrency: z.string().optional()
});

const calculatorOutputSchema = z.object({
  operation: z.string(),
  summary: z.string(),
  calculatedTotal: z.number(),
  currency: z.string(),
  breakdown: z.array(z.object({
    category: z.string(),
    amount: z.number(),
    percentage: z.number()
  })).optional(),
  metrics: z.record(z.any()).optional()
});

async function executeCalculator(input, context = {}) {
  const { operation, totalAmount, currency = 'USD', categories, numbers, days, hoursPerDay, targetExchangeRate, targetCurrency } = input;

  if (operation === 'BUDGET_BREAKDOWN') {
    const budget = totalAmount || 1000;
    const defaultCategories = categories && categories.length > 0 ? categories : [
      { name: 'Flights & Long-distance Transit', percentage: 35 },
      { name: 'Accommodation & Lodging', percentage: 30 },
      { name: 'Food, Dining & Groceries', percentage: 20 },
      { name: 'Attractions, Passes & Activities', percentage: 10 },
      { name: 'Emergency & Miscellaneous Buffer', percentage: 5 }
    ];

    let allocatedTotal = 0;
    const breakdown = defaultCategories.map(cat => {
      let amount = 0;
      let pct = cat.percentage || 0;
      if (cat.fixedAmount !== undefined) {
        amount = cat.fixedAmount;
        pct = Math.round((amount / budget) * 100);
      } else if (cat.percentage !== undefined) {
        amount = Math.round((budget * cat.percentage) / 100);
      }
      allocatedTotal += amount;
      return {
        category: cat.name,
        amount,
        percentage: pct
      };
    });

    return {
      operation: 'BUDGET_BREAKDOWN',
      summary: `Allocated total budget of ${currency} ${budget.toLocaleString()} across ${breakdown.length} categories.`,
      calculatedTotal: budget,
      currency,
      breakdown,
      metrics: {
        totalAllocated: allocatedTotal,
        remainingBuffer: Math.max(0, budget - allocatedTotal),
        categoriesCount: breakdown.length
      }
    };
  }

  if (operation === 'TIMELINE_MATH') {
    const totalDays = days || 10;
    const dailyHrs = hoursPerDay || 3;
    const totalHours = totalDays * dailyHrs;
    const totalMinutes = totalHours * 60;

    return {
      operation: 'TIMELINE_MATH',
      summary: `Total study/work capacity: ${totalHours} hours (${totalMinutes} minutes) across ${totalDays} days at ${dailyHrs} hrs/day.`,
      calculatedTotal: totalHours,
      currency: 'HOURS',
      metrics: {
        totalDays,
        dailyHours: dailyHrs,
        totalHours,
        totalMinutes
      }
    };
  }

  if (operation === 'TOTAL_SUM') {
    const nums = numbers || [];
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      operation: 'TOTAL_SUM',
      summary: `Sum of ${nums.length} items: ${sum}`,
      calculatedTotal: sum,
      currency,
      metrics: { count: nums.length, average: nums.length > 0 ? sum / nums.length : 0 }
    };
  }

  if (operation === 'CURRENCY_CONVERSION') {
    const amount = totalAmount || 100;
    const rate = targetExchangeRate || 83.5;
    const converted = Math.round(amount * rate * 100) / 100;
    const targetCurr = targetCurrency || 'INR';

    return {
      operation: 'CURRENCY_CONVERSION',
      summary: `${currency} ${amount} = ${targetCurr} ${converted.toLocaleString()} (Rate: ${rate})`,
      calculatedTotal: converted,
      currency: targetCurr,
      metrics: { baseAmount: amount, baseCurrency: currency, exchangeRate: rate, targetCurrency: targetCurr }
    };
  }

  return {
    operation: 'CALCULATOR',
    summary: 'Standard calculation completed successfully',
    calculatedTotal: totalAmount || 0,
    currency
  };
}

module.exports = {
  name: 'CALCULATOR',
  description: 'Deterministic mathematical, budget breakdown, timeline capacity, and currency calculations.',
  capability: 'CALCULATION',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: calculatorInputSchema,
  outputSchema: calculatorOutputSchema,
  execute: executeCalculator
};

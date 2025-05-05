import { z } from 'zod';

/**
 * A/B Test result metrics schema
 */
export const abTestMetricsSchema = z.object({
  sent: z.object({
    a: z.number().describe('Number of messages sent for variant A'),
    b: z.number().describe('Number of messages sent for variant B'),
    total: z.number().describe('Total number of messages sent'),
  }),
  delivered: z.object({
    a: z.number().describe('Number of messages delivered for variant A'),
    b: z.number().describe('Number of messages delivered for variant B'),
    total: z.number().describe('Total number of messages delivered'),
  }),
  reads: z.object({
    a: z.number().describe('Number of messages read for variant A'),
    b: z.number().describe('Number of messages read for variant B'),
    total: z.number().describe('Total number of messages read'),
  }),
  clicks: z.object({
    a: z.number().describe('Number of clicks for variant A'),
    b: z.number().describe('Number of clicks for variant B'),
    total: z.number().describe('Total number of clicks'),
  }),
  responses: z.object({
    a: z.number().describe('Number of responses for variant A'),
    b: z.number().describe('Number of responses for variant B'),
    total: z.number().describe('Total number of responses'),
  }),
  conversions: z.object({
    a: z.number().describe('Number of conversions for variant A'),
    b: z.number().describe('Number of conversions for variant B'),
    total: z.number().describe('Total number of conversions'),
  }),
  revenue: z.object({
    a: z.number().describe('Revenue from variant A'),
    b: z.number().describe('Revenue from variant B'),
    total: z.number().describe('Total revenue'),
  }),
  unsubscribes: z.object({
    a: z.number().describe('Number of unsubscribes for variant A'),
    b: z.number().describe('Number of unsubscribes for variant B'),
    total: z.number().describe('Total number of unsubscribes'),
  }),
});

export type ABTestMetrics = z.infer<typeof abTestMetricsSchema>;

/**
 * A/B Test result rates schema
 */
export const abTestRatesSchema = z.object({
  deliveryRate: z.object({
    a: z.number().describe('Delivery rate for variant A (%)'),
    b: z.number().describe('Delivery rate for variant B (%)'),
    overall: z.number().describe('Overall delivery rate (%)'),
    difference: z.number().describe('Difference between A and B (percentage points)'),
  }),
  readRate: z.object({
    a: z.number().describe('Read rate for variant A (%)'),
    b: z.number().describe('Read rate for variant B (%)'),
    overall: z.number().describe('Overall read rate (%)'),
    difference: z.number().describe('Difference between A and B (percentage points)'),
  }),
  clickRate: z.object({
    a: z.number().describe('Click rate for variant A (%)'),
    b: z.number().describe('Click rate for variant B (%)'),
    overall: z.number().describe('Overall click rate (%)'),
    difference: z.number().describe('Difference between A and B (percentage points)'),
  }),
  responseRate: z.object({
    a: z.number().describe('Response rate for variant A (%)'),
    b: z.number().describe('Response rate for variant B (%)'),
    overall: z.number().describe('Overall response rate (%)'),
    difference: z.number().describe('Difference between A and B (percentage points)'),
  }),
  conversionRate: z.object({
    a: z.number().describe('Conversion rate for variant A (%)'),
    b: z.number().describe('Conversion rate for variant B (%)'),
    overall: z.number().describe('Overall conversion rate (%)'),
    difference: z.number().describe('Difference between A and B (percentage points)'),
  }),
  revenuePerMessage: z.object({
    a: z.number().describe('Revenue per message for variant A'),
    b: z.number().describe('Revenue per message for variant B'),
    overall: z.number().describe('Overall revenue per message'),
    difference: z.number().describe('Difference between A and B'),
  }),
  unsubscribeRate: z.object({
    a: z.number().describe('Unsubscribe rate for variant A (%)'),
    b: z.number().describe('Unsubscribe rate for variant B (%)'),
    overall: z.number().describe('Overall unsubscribe rate (%)'),
    difference: z.number().describe('Difference between A and B (percentage points)'),
  }),
});

export type ABTestRates = z.infer<typeof abTestRatesSchema>;

/**
 * A/B Test result schema
 */
export const abTestResultSchema = z.object({
  id: z.string().describe('ID of the A/B test'),
  metrics: abTestMetricsSchema,
  rates: abTestRatesSchema,
  winner: z.enum(['a', 'b', 'tie', 'inconclusive']).optional().describe('Winning variant'),
  confidence: z.number().min(0).max(100).optional().describe('Confidence level in the result (%)'),
  startDate: z.string().describe('Start date of the test'),
  endDate: z.string().optional().describe('End date of the test'),
  duration: z.number().describe('Duration of the test in days'),
  status: z.enum(['running', 'completed', 'stopped']).describe('Status of the test'),
  primaryMetric: z.enum(['reads', 'clicks', 'responses', 'conversions', 'revenue']).default('conversions').describe('Primary metric for determining the winner'),
});

export type ABTestResult = z.infer<typeof abTestResultSchema>;

/**
 * Calculate metrics for an A/B test
 */
export function calculateABTestMetrics(data: {
  templateA: {
    sent: number;
    delivered: number;
    reads: number;
    clicks: number;
    responses: number;
    conversions: number;
    revenue: number;
    unsubscribes: number;
  };
  templateB: {
    sent: number;
    delivered: number;
    reads: number;
    clicks: number;
    responses: number;
    conversions: number;
    revenue: number;
    unsubscribes: number;
  };
}): { metrics: ABTestMetrics; rates: ABTestRates } {
  const { templateA, templateB } = data;
  
  // Calculate total metrics
  const metrics: ABTestMetrics = {
    sent: {
      a: templateA.sent,
      b: templateB.sent,
      total: templateA.sent + templateB.sent,
    },
    delivered: {
      a: templateA.delivered,
      b: templateB.delivered,
      total: templateA.delivered + templateB.delivered,
    },
    reads: {
      a: templateA.reads,
      b: templateB.reads,
      total: templateA.reads + templateB.reads,
    },
    clicks: {
      a: templateA.clicks,
      b: templateB.clicks,
      total: templateA.clicks + templateB.clicks,
    },
    responses: {
      a: templateA.responses,
      b: templateB.responses,
      total: templateA.responses + templateB.responses,
    },
    conversions: {
      a: templateA.conversions,
      b: templateB.conversions,
      total: templateA.conversions + templateB.conversions,
    },
    revenue: {
      a: templateA.revenue,
      b: templateB.revenue,
      total: templateA.revenue + templateB.revenue,
    },
    unsubscribes: {
      a: templateA.unsubscribes,
      b: templateB.unsubscribes,
      total: templateA.unsubscribes + templateB.unsubscribes,
    },
  };
  
  // Calculate rates
  const rates: ABTestRates = {
    deliveryRate: {
      a: templateA.sent > 0 ? (templateA.delivered / templateA.sent) * 100 : 0,
      b: templateB.sent > 0 ? (templateB.delivered / templateB.sent) * 100 : 0,
      overall: metrics.sent.total > 0 ? (metrics.delivered.total / metrics.sent.total) * 100 : 0,
      difference: 0, // Will calculate below
    },
    readRate: {
      a: templateA.delivered > 0 ? (templateA.reads / templateA.delivered) * 100 : 0,
      b: templateB.delivered > 0 ? (templateB.reads / templateB.delivered) * 100 : 0,
      overall: metrics.delivered.total > 0 ? (metrics.reads.total / metrics.delivered.total) * 100 : 0,
      difference: 0, // Will calculate below
    },
    clickRate: {
      a: templateA.delivered > 0 ? (templateA.clicks / templateA.delivered) * 100 : 0,
      b: templateB.delivered > 0 ? (templateB.clicks / templateB.delivered) * 100 : 0,
      overall: metrics.delivered.total > 0 ? (metrics.clicks.total / metrics.delivered.total) * 100 : 0,
      difference: 0, // Will calculate below
    },
    responseRate: {
      a: templateA.delivered > 0 ? (templateA.responses / templateA.delivered) * 100 : 0,
      b: templateB.delivered > 0 ? (templateB.responses / templateB.delivered) * 100 : 0,
      overall: metrics.delivered.total > 0 ? (metrics.responses.total / metrics.delivered.total) * 100 : 0,
      difference: 0, // Will calculate below
    },
    conversionRate: {
      a: templateA.delivered > 0 ? (templateA.conversions / templateA.delivered) * 100 : 0,
      b: templateB.delivered > 0 ? (templateB.conversions / templateB.delivered) * 100 : 0,
      overall: metrics.delivered.total > 0 ? (metrics.conversions.total / metrics.delivered.total) * 100 : 0,
      difference: 0, // Will calculate below
    },
    revenuePerMessage: {
      a: templateA.delivered > 0 ? templateA.revenue / templateA.delivered : 0,
      b: templateB.delivered > 0 ? templateB.revenue / templateB.delivered : 0,
      overall: metrics.delivered.total > 0 ? metrics.revenue.total / metrics.delivered.total : 0,
      difference: 0, // Will calculate below
    },
    unsubscribeRate: {
      a: templateA.delivered > 0 ? (templateA.unsubscribes / templateA.delivered) * 100 : 0,
      b: templateB.delivered > 0 ? (templateB.unsubscribes / templateB.delivered) * 100 : 0,
      overall: metrics.delivered.total > 0 ? (metrics.unsubscribes.total / metrics.delivered.total) * 100 : 0,
      difference: 0, // Will calculate below
    },
  };
  
  // Calculate differences
  rates.deliveryRate.difference = rates.deliveryRate.a - rates.deliveryRate.b;
  rates.readRate.difference = rates.readRate.a - rates.readRate.b;
  rates.clickRate.difference = rates.clickRate.a - rates.clickRate.b;
  rates.responseRate.difference = rates.responseRate.a - rates.responseRate.b;
  rates.conversionRate.difference = rates.conversionRate.a - rates.conversionRate.b;
  rates.revenuePerMessage.difference = rates.revenuePerMessage.a - rates.revenuePerMessage.b;
  rates.unsubscribeRate.difference = rates.unsubscribeRate.a - rates.unsubscribeRate.b;
  
  return { metrics, rates };
}

/**
 * Determine the winner of an A/B test
 */
export function determineABTestWinner(
  testData: {
    metrics: ABTestMetrics;
    rates: ABTestRates;
    primaryMetric: keyof ABTestRates;
    minimumSampleSize?: number;
    minimumConfidenceLevel?: number;
  }
): { winner: 'a' | 'b' | 'tie' | 'inconclusive'; confidence: number } {
  const {
    metrics,
    rates,
    primaryMetric,
    minimumSampleSize = 100,
    minimumConfidenceLevel = 95,
  } = testData;
  
  // Check if we have enough data
  if (metrics.sent.total < minimumSampleSize) {
    return { winner: 'inconclusive', confidence: 0 };
  }
  
  // Get the primary metric rates
  const metricRate = rates[primaryMetric];
  if (!metricRate) {
    return { winner: 'inconclusive', confidence: 0 };
  }
  
  // Calculate statistical significance
  // Using a simplified Z-test for proportion comparison
  
  // For unsubscribe rate, lower is better; for all other metrics, higher is better
  const isNegativeMetric = primaryMetric === 'unsubscribeRate';
  
  // Get the sample sizes and conversion counts
  const nA = metrics.delivered.a;
  const nB = metrics.delivered.b;
  
  let pA = 0;
  let pB = 0;
  
  switch (primaryMetric) {
    case 'readRate':
      pA = metrics.reads.a / nA;
      pB = metrics.reads.b / nB;
      break;
    case 'clickRate':
      pA = metrics.clicks.a / nA;
      pB = metrics.clicks.b / nB;
      break;
    case 'responseRate':
      pA = metrics.responses.a / nA;
      pB = metrics.responses.b / nB;
      break;
    case 'conversionRate':
      pA = metrics.conversions.a / nA;
      pB = metrics.conversions.b / nB;
      break;
    case 'revenuePerMessage':
      // This is more complex for revenue metrics, simplified here
      pA = templateA.revenue > 0 ? 1 : 0;
      pB = templateB.revenue > 0 ? 1 : 0;
      break;
    case 'unsubscribeRate':
      pA = metrics.unsubscribes.a / nA;
      pB = metrics.unsubscribes.b / nB;
      break;
    default:
      pA = metricRate.a / 100;
      pB = metricRate.b / 100;
  }
  
  // Check if we have enough conversions
  if ((pA * nA < 5 || pB * nB < 5) && 
      ((1 - pA) * nA < 5 || (1 - pB) * nB < 5)) {
    return { winner: 'inconclusive', confidence: 0 };
  }
  
  // Calculate pooled proportion and standard error
  const pPool = (pA * nA + pB * nB) / (nA + nB);
  const standardError = Math.sqrt(pPool * (1 - pPool) * (1/nA + 1/nB));
  
  // Calculate z-score
  const zScore = (pA - pB) / standardError;
  
  // Convert to confidence level
  const confidenceLevel = (1 - normalCDF(Math.abs(zScore))) * 200;
  
  // Determine winner
  if (confidenceLevel < minimumConfidenceLevel) {
    return { winner: 'inconclusive', confidence: confidenceLevel };
  }
  
  if (isNegativeMetric) {
    // For negative metrics (like unsubscribe rate), lower is better
    if (pA < pB) {
      return { winner: 'a', confidence: confidenceLevel };
    } else if (pB < pA) {
      return { winner: 'b', confidence: confidenceLevel };
    }
  } else {
    // For positive metrics, higher is better
    if (pA > pB) {
      return { winner: 'a', confidence: confidenceLevel };
    } else if (pB > pA) {
      return { winner: 'b', confidence: confidenceLevel };
    }
  }
  
  return { winner: 'tie', confidence: confidenceLevel };
}

/**
 * Helper function: Normal cumulative distribution function
 */
function normalCDF(x: number): number {
  // Approximation of the standard normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - probability : probability;
}

/**
 * Create a sample A/B test result
 */
export function createSampleABTestResult(): ABTestResult {
  const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();
  
  // Sample data for variant A
  const templateA = {
    sent: 500,
    delivered: 485,
    reads: 392,
    clicks: 118,
    responses: 45,
    conversions: 28,
    revenue: 2800,
    unsubscribes: 5,
  };
  
  // Sample data for variant B
  const templateB = {
    sent: 500,
    delivered: 490,
    reads: 402,
    clicks: 145,
    responses: 58,
    conversions: 35,
    revenue: 3675,
    unsubscribes: 8,
  };
  
  // Calculate metrics and rates
  const { metrics, rates } = calculateABTestMetrics({ templateA, templateB });
  
  // Determine winner based on conversion rate
  const { winner, confidence } = determineABTestWinner({
    metrics,
    rates,
    primaryMetric: 'conversionRate',
  });
  
  return {
    id: `abtest_${Date.now()}`,
    metrics,
    rates,
    winner,
    confidence,
    startDate,
    endDate,
    duration: 14, // 14 days
    status: 'completed',
    primaryMetric: 'conversions',
  };
}
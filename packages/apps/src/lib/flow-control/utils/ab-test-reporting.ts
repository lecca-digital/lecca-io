import { AbTestResults, AbTestVariant } from './ab-test-management';

/**
 * Generates a report of the A/B test results
 */
export function generateAbTestReport(
  results: AbTestResults | undefined,
  variants: AbTestVariant[]
): AbTestReport {
  if (!results || !results.variantStats || results.variantStats.length === 0) {
    return {
      totalExecutions: 0,
      totalConversions: 0,
      conversionRate: 0,
      variantReports: [],
    };
  }

  // Calculate totals
  const totalExecutions = results.variantStats.reduce(
    (sum, stat) => sum + (stat.executions || 0),
    0
  );

  const totalConversions = results.variantStats.reduce(
    (sum, stat) => sum + (stat.conversions || 0),
    0
  );

  const conversionRate = totalExecutions > 0 
    ? (totalConversions / totalExecutions) * 100 
    : 0;

  // Generate report for each variant
  const variantReports = results.variantStats.map(stat => {
    const variant = variants.find(v => v.pathId === stat.pathId);
    
    const executions = stat.executions || 0;
    const conversions = stat.conversions || 0;
    
    const variantConversionRate = executions > 0 
      ? (conversions / executions) * 100 
      : 0;
    
    const relativePerformance = conversionRate > 0 
      ? (variantConversionRate / conversionRate) * 100 
      : 100;
    
    return {
      pathId: stat.pathId,
      label: variant?.label || 'Unknown Variant',
      isArchived: variant?.isArchived || false,
      executions,
      conversions,
      conversionRate: variantConversionRate,
      percentage: variant?.percentage || 0,
      relativePerformance,
    };
  });

  return {
    totalExecutions,
    totalConversions,
    conversionRate,
    variantReports,
  };
}

/**
 * Determines the winning variant based on highest conversion rate
 */
export function determineWinningVariant(report: AbTestReport): string | null {
  if (!report.variantReports || report.variantReports.length === 0) {
    return null;
  }

  // Filter active variants with at least some executions
  const activeVariants = report.variantReports.filter(
    v => !v.isArchived && v.executions > 0
  );

  if (activeVariants.length === 0) {
    return null;
  }

  // Sort by conversion rate (highest first)
  const sortedVariants = [...activeVariants].sort(
    (a, b) => b.conversionRate - a.conversionRate
  );

  // Return the path ID of the variant with highest conversion rate
  return sortedVariants[0].pathId;
}

/**
 * Determines the statistical significance of the test results
 * Returns a value between 0-1 representing confidence level
 */
export function calculateStatisticalSignificance(report: AbTestReport): number {
  if (!report.variantReports || report.variantReports.length < 2) {
    return 0;
  }

  // Simple implementation: 
  // - If we have fewer than 30 executions total, significance is low
  // - If we have over 100 executions, significance increases
  // - If we have over 1000 executions, significance is very high
  const totalExecutions = report.totalExecutions;
  
  if (totalExecutions < 30) {
    return 0.1; // Very low significance
  } else if (totalExecutions < 100) {
    return 0.5; // Moderate significance
  } else if (totalExecutions < 1000) {
    return 0.8; // High significance
  } else {
    return 0.95; // Very high significance
  }
}

/**
 * Formats the report data for display in a UI
 */
export function formatReportForDisplay(report: AbTestReport): string {
  const totalExecutions = report.totalExecutions;
  const totalConversions = report.totalConversions;
  const overallConversionRate = report.conversionRate.toFixed(2);
  
  const winningVariantId = determineWinningVariant(report);
  const winningVariant = report.variantReports.find(v => v.pathId === winningVariantId);
  
  let reportText = `# A/B Test Results\n\n`;
  reportText += `Total Executions: ${totalExecutions}\n`;
  reportText += `Total Conversions: ${totalConversions}\n`;
  reportText += `Overall Conversion Rate: ${overallConversionRate}%\n\n`;
  
  if (winningVariant) {
    reportText += `## Winning Variant\n\n`;
    reportText += `"${winningVariant.label}" with ${winningVariant.conversionRate.toFixed(2)}% conversion rate\n\n`;
  }
  
  reportText += `## Variant Performance\n\n`;
  reportText += `| Variant | Traffic | Executions | Conversions | Conv. Rate | Relative Perf. |\n`;
  reportText += `|---------|---------|------------|-------------|------------|---------------|\n`;
  
  for (const variant of report.variantReports) {
    if (variant.isArchived) continue;
    
    reportText += `| ${variant.label} | ${variant.percentage}% | ${variant.executions} | ${variant.conversions} | ${variant.conversionRate.toFixed(2)}% | ${variant.relativePerformance.toFixed(2)}% |\n`;
  }
  
  // Add statistical significance notice
  const significance = calculateStatisticalSignificance(report);
  reportText += `\n\nStatistical confidence: ${(significance * 100).toFixed(0)}%\n`;
  
  if (significance < 0.5) {
    reportText += `\n**Note:** More data is needed for conclusive results.\n`;
  } else if (significance >= 0.95) {
    reportText += `\n**Note:** Results are statistically significant.\n`;
  }
  
  return reportText;
}

/**
 * Interfaces for A/B test reporting
 */
export interface VariantReport {
  pathId: string;
  label: string;
  isArchived: boolean;
  executions: number;
  conversions: number;
  conversionRate: number;
  percentage: number;
  relativePerformance: number;
}

export interface AbTestReport {
  totalExecutions: number;
  totalConversions: number;
  conversionRate: number;
  variantReports: VariantReport[];
}
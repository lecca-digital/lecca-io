import { z } from 'zod';

// Define types for A/B test variants
export const AbTestVariantSchema = z.object({
  label: z.string(),
  pathId: z.string(),
  percentage: z.number().min(0).max(100),
  isArchived: z.boolean().optional(),
});

export type AbTestVariant = z.infer<typeof AbTestVariantSchema>;

export const AbTestResultsSchema = z.object({
  variantStats: z.array(
    z.object({
      pathId: z.string(),
      executions: z.number(),
      conversions: z.number().optional(),
    })
  ),
});

export type AbTestResults = z.infer<typeof AbTestResultsSchema>;

/**
 * Ensures variant percentages add up to 100%
 */
export function normalizeVariantPercentages(variants: AbTestVariant[]): AbTestVariant[] {
  if (!variants || variants.length === 0) {
    return [];
  }

  // Filter out archived variants
  const activeVariants = variants.filter(v => !v.isArchived);
  
  if (activeVariants.length === 0) {
    return variants;
  }

  // Calculate total percentage of active variants
  let totalPercentage = 0;
  for (const variant of activeVariants) {
    totalPercentage += variant.percentage || 0;
  }

  // Normalize if not 100%
  if (Math.abs(totalPercentage - 100) > 0.001) {
    // Calculate scaling factor to adjust percentages
    const scalingFactor = 100 / totalPercentage;
    
    // Apply scaling to all active variants
    for (const variant of activeVariants) {
      variant.percentage = Math.round((variant.percentage * scalingFactor) * 10) / 10;
    }
    
    // Handle potential rounding errors by adjusting the first variant
    let adjustedTotal = 0;
    for (const variant of activeVariants) {
      adjustedTotal += variant.percentage;
    }
    
    if (Math.abs(adjustedTotal - 100) > 0.001) {
      activeVariants[0].percentage += (100 - adjustedTotal);
    }
  }

  // Merge active variants back with archived ones
  return variants.map(variant => {
    if (variant.isArchived) {
      return variant;
    }
    return activeVariants.find(v => v.pathId === variant.pathId) || variant;
  });
}

/**
 * Adds a new variant to the test
 */
export function addVariant(
  variants: AbTestVariant[], 
  newVariant: Omit<AbTestVariant, 'percentage'>
): AbTestVariant[] {
  // Filter active variants
  const activeVariants = variants.filter(v => !v.isArchived);
  
  // Calculate default percentage for new variant
  const defaultPercentage = activeVariants.length > 0 
    ? Math.floor(100 / (activeVariants.length + 1)) 
    : 100;
  
  // Add new variant
  const updatedVariants = [
    ...variants,
    {
      ...newVariant,
      percentage: defaultPercentage,
      isArchived: false,
    }
  ];
  
  // Normalize percentages
  return normalizeVariantPercentages(updatedVariants);
}

/**
 * Archives a variant by pathId
 */
export function archiveVariant(variants: AbTestVariant[], pathId: string): AbTestVariant[] {
  if (!variants || variants.length === 0) {
    return variants;
  }
  
  // Mark the variant as archived
  const updatedVariants = variants.map(variant => {
    if (variant.pathId === pathId) {
      return { ...variant, isArchived: true, percentage: 0 };
    }
    return variant;
  });
  
  // Normalize remaining active variants
  return normalizeVariantPercentages(updatedVariants);
}

/**
 * Unarchives a variant by pathId
 */
export function unarchiveVariant(variants: AbTestVariant[], pathId: string): AbTestVariant[] {
  if (!variants || variants.length === 0) {
    return variants;
  }
  
  // Mark the variant as unarchived
  const updatedVariants = variants.map(variant => {
    if (variant.pathId === pathId) {
      return { ...variant, isArchived: false, percentage: 10 }; // Default to 10%
    }
    return variant;
  });
  
  // Normalize percentages
  return normalizeVariantPercentages(updatedVariants);
}

/**
 * Updates variant percentages
 */
export function updateVariantPercentages(
  variants: AbTestVariant[], 
  updates: Array<{ pathId: string; percentage: number }>
): AbTestVariant[] {
  if (!variants || variants.length === 0) {
    return variants;
  }
  
  // Apply percentage updates
  const updatedVariants = variants.map(variant => {
    const update = updates.find(u => u.pathId === variant.pathId);
    if (update && !variant.isArchived) {
      return { ...variant, percentage: update.percentage };
    }
    return variant;
  });
  
  // Normalize percentages
  return normalizeVariantPercentages(updatedVariants);
}

/**
 * Selects a variant based on percentage splits
 */
export function selectVariant(variants: AbTestVariant[]): string | null {
  if (!variants || variants.length === 0) {
    return null;
  }
  
  // Filter active variants
  const activeVariants = variants.filter(v => !v.isArchived);
  
  if (activeVariants.length === 0) {
    return null;
  }
  
  // Normalize percentages
  const normalizedVariants = normalizeVariantPercentages(activeVariants);
  
  // Select variant based on random percentage
  const random = Math.random() * 100; // Random number between 0-100
  let accumulatedPercentage = 0;
  
  for (const variant of normalizedVariants) {
    accumulatedPercentage += variant.percentage;
    if (random <= accumulatedPercentage) {
      return variant.pathId;
    }
  }
  
  // Fallback to first variant (shouldn't happen if percentages are normalized)
  return normalizedVariants[0].pathId;
}

/**
 * Updates test results with new execution data
 */
export function updateTestResults(
  results: AbTestResults | undefined,
  variants: AbTestVariant[],
  selectedPathId: string,
  isConversion: boolean = false
): AbTestResults {
  // Initialize results if undefined
  if (!results) {
    results = {
      variantStats: variants.map(variant => ({
        pathId: variant.pathId,
        executions: 0,
        conversions: 0,
      }))
    };
  }
  
  // Ensure we have stats for all variants
  const missingVariants = variants.filter(
    variant => !results.variantStats.some(stat => stat.pathId === variant.pathId)
  );
  
  if (missingVariants.length > 0) {
    results.variantStats = [
      ...results.variantStats,
      ...missingVariants.map(variant => ({
        pathId: variant.pathId,
        executions: 0,
        conversions: 0,
      }))
    ];
  }
  
  // Update the selected variant stats
  const variantStats = results.variantStats.map(stat => {
    if (stat.pathId === selectedPathId) {
      return {
        ...stat,
        executions: (stat.executions || 0) + 1,
        conversions: isConversion ? (stat.conversions || 0) + 1 : (stat.conversions || 0),
      };
    }
    return stat;
  });
  
  return { variantStats };
}
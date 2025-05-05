import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

// Define the percentage split type
export type PercentageSplit = {
  /**
   * Node Name (node.data.name) of the connected node
   */
  label: string;
  /**
   * This is the edge id of the connected edge
   */
  pathId: string;
  /**
   * The percentage (0-100) this path should be taken
   */
  percentage: number;
};

export const abTestSplit = createAction({
  id: 'flow-control_action_ab-test-split',
  name: 'A/B Test Split',
  description: 'Split traffic between paths based on percentage',
  availableForAgent: false,
  iconUrl: `https://lecca-io.s3.us-east-2.amazonaws.com/assets/actions/flow-control_action_conditional-paths.svg`,
  inputConfig: [
    {
      id: 'percentageSplits',
      label: 'Configure A/B Test Splits',
      description:
        'Connect actions to this node and configure the percentage of traffic for each path.',
      inputType: 'percentage-splits',
    },
  ],
  aiSchema: z.object({}),
  run: async ({ configValue }) => {
    //AI can't run this action, so we must define the configValue type
    const { percentageSplits } = configValue as {
      percentageSplits: PercentageSplit[];
    };

    if (!percentageSplits || percentageSplits.length === 0) {
      throw new Error('No percentage splits found');
    }

    // Check that percentages sum to 100
    const totalPercentage = percentageSplits.reduce(
      (sum, split) => sum + (split.percentage || 0),
      0
    );

    // Allow a small margin of error (0.1) for floating point calculations
    if (Math.abs(totalPercentage - 100) > 0.1) {
      // Handle case where percentages don't sum to 100
      // We'll automatically adjust to ensure they sum to 100
      console.warn(
        `WARNING: A/B Test Split percentages sum to ${totalPercentage}%, not 100%. Adjusting proportionally.`
      );

      // Normalize percentages to sum to 100
      const adjustmentFactor = 100 / totalPercentage;
      percentageSplits.forEach(split => {
        split.percentage = split.percentage * adjustmentFactor;
      });
    }

    // Generate a random number between 0 and 100
    const randomNum = Math.random() * 100;

    // Determine which path to take based on the random number and configured percentages
    let cumulativePercentage = 0;
    
    for (const split of percentageSplits) {
      cumulativePercentage += split.percentage;
      
      if (randomNum <= cumulativePercentage) {
        // This is the path to take
        return { 
          pathsToTake: [split.pathId], 
          selectedPath: split.label,
          randomValue: randomNum,
          allPaths: percentageSplits.map(s => ({
            label: s.label,
            pathId: s.pathId,
            percentage: s.percentage
          }))
        };
      }
    }

    // Fallback to the last path if we somehow didn't select one
    // (this should never happen with proper percentages)
    const lastSplit = percentageSplits[percentageSplits.length - 1];
    return { 
      pathsToTake: [lastSplit.pathId], 
      selectedPath: lastSplit.label,
      randomValue: randomNum,
      allPaths: percentageSplits.map(s => ({
        label: s.label,
        pathId: s.pathId,
        percentage: s.percentage
      })) 
    };
  },

  mockRun: async () => {
    return {
      pathsToTake: ['path-1'],
      selectedPath: 'Option A',
      randomValue: 42.5,
      allPaths: [
        { label: 'Option A', pathId: 'path-1', percentage: 70 },
        { label: 'Option B', pathId: 'path-2', percentage: 30 }
      ]
    };
  },
});
import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

export const abTest = createAction({
  id: 'flow-control_action_ab-test',
  name: 'A/B Test',
  description: 'Split traffic between multiple paths based on percentage',
  availableForAgent: false,
  iconUrl: `https://lecca-io.s3.us-east-2.amazonaws.com/assets/actions/flow-control_action_conditional-paths.svg`,
  inputConfig: [
    {
      id: 'abTestPaths',
      label: 'Configure A/B Test Paths',
      description:
        'Configure paths and their percentage weights for A/B testing.',
      inputType: 'ab-test-paths',
    },
  ],
  aiSchema: z.object({}),
  run: async ({ configValue }) => {
    // AI can't run this action, so we must define the configValue type
    const { abTestPaths } = configValue as {
      abTestPaths: AbTestPath[];
    };

    if (!abTestPaths || abTestPaths.length === 0) {
      throw new Error('No A/B test paths found');
    }

    // Validate that percentages sum to 100
    const totalPercentage = abTestPaths.reduce(
      (sum, path) => sum + (path.percentage || 0),
      0
    );
    
    if (Math.abs(totalPercentage - 100) > 0.001) {
      throw new Error(`Percentages must sum to 100%. Current sum: ${totalPercentage}%`);
    }

    // Generate a random number between 0 and 100
    const randomValue = Math.random() * 100;
    
    // Determine which path to take based on the random value
    let cumulativePercentage = 0;
    let selectedPath = null;
    
    for (const path of abTestPaths) {
      cumulativePercentage += (path.percentage || 0);
      if (randomValue <= cumulativePercentage) {
        selectedPath = path.pathId;
        break;
      }
    }

    if (!selectedPath && abTestPaths.length > 0) {
      // Fallback to the last path if no path was selected (shouldn't happen)
      selectedPath = abTestPaths[abTestPaths.length - 1].pathId;
    }

    return { pathsToTake: [selectedPath] };
  },

  mockRun: async () => {
    return {
      pathsToTake: ['path-1'],
    };
  },
});

export type AbTestPath = {
  /**
   * Node Name (node.data.name) of the connected node
   */
  label: string;
  /**
   * This is the edge id of the connected edge
   */
  pathId: string;
  /**
   * Percentage weight for this path (0-100)
   */
  percentage: number;
};
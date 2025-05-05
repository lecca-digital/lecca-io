import {
  WorkflowNode,
  createAction,
  createMarkdownField,
} from '@lecca-io/toolkit';
import { z } from 'zod';
import { 
  AbTestVariantSchema, 
  AbTestResultsSchema,
  normalizeVariantPercentages,
  selectVariant,
  updateTestResults
} from '../utils/ab-test-management';

export const abTestPaths = createAction({
  id: 'flow-control_action_ab-test-paths',
  name: 'A/B Test Paths',
  description: 'Split execution flow between multiple paths based on percentage splits.',
  iconUrl: `https://lecca-io.s3.us-east-2.amazonaws.com/assets/actions/flow-control_action_ab-test-paths.svg`,
  availableForAgent: false,
  viewOptions: {
    showManualInputButton: false,
    saveButtonOptions: {
      hideSaveAndTestButton: false,
    },
  },
  aiSchema: z.object({
    abTestVariants: z.array(AbTestVariantSchema).optional(),
    isRecordingConversions: z.boolean().optional(),
    testResults: AbTestResultsSchema.optional(),
    markAsConversion: z.boolean().optional(),
  }),
  inputConfig: [
    createMarkdownField({
      id: 'markdown',
      markdown:
        "Configure A/B test variants below. Make sure the total percentage adds up to 100%.\n\nVariants can be added, edited, or archived using the controls in the UI.\n\nNote: Percentages will be automatically adjusted to ensure they add up to 100%.",
    }),
    {
      id: 'abTestVariants',
      label: 'Configure Variants',
      description:
        'Connect actions to this node to configure your A/B test variants.',
      inputType: 'ab-test-paths',
    },
    {
      id: 'isRecordingConversions',
      inputType: 'switch',
      label: 'Record Conversions',
      description: 'Enable to track conversion metrics for this A/B test.',
      switchOptions: {
        checked: true,
        unchecked: false,
        defaultChecked: true,
      },
    },
    {
      id: 'markAsConversion',
      inputType: 'switch',
      label: 'Mark as Conversion',
      description: 'If this action is triggered during a returning execution, mark it as a conversion.',
      loadOptions: {
        dependsOn: [
          {
            id: 'isRecordingConversions',
            value: true,
          },
        ],
      },
      switchOptions: {
        checked: true,
        unchecked: false,
        defaultChecked: false,
      },
    },
  ],
  run: async ({
    executionId,
    configValue,
    prisma,
  }) => {
    // Get the A/B test variants from config
    const { abTestVariants, isRecordingConversions, markAsConversion, testResults } = configValue;

    if (!abTestVariants || abTestVariants.length === 0) {
      throw new Error('No A/B test variants configured');
    }

    // Filter out archived variants
    const activeVariants = abTestVariants.filter(variant => !variant.isArchived);
    if (activeVariants.length === 0) {
      throw new Error('No active A/B test variants found. Please unarchive at least one variant.');
    }

    // Normalize percentages to ensure they add up to 100%
    const normalizedVariants = normalizeVariantPercentages(abTestVariants);
    
    // Select a variant based on percentage splits
    const selectedPathId = selectVariant(normalizedVariants) || activeVariants[0].pathId;

    // Update test statistics if tracking is enabled
    if (executionId && isRecordingConversions) {
      const executionWithNodes = await prisma.execution.findFirst({
        where: {
          id: executionId,
        },
        select: {
          nodes: true,
        },
      });

      if (executionWithNodes) {
        const nodes = executionWithNodes.nodes as WorkflowNode[];
        const currentNode = nodes.find(node => 
          node.data?.configValue?.abTestVariants === abTestVariants
        );

        if (currentNode) {
          const updatedTestResults = updateTestResults(
            testResults,
            normalizedVariants,
            selectedPathId,
            !!markAsConversion
          );

          // Update the node with the latest test results
          await prisma.execution.update({
            where: {
              id: executionId,
            },
            data: {
              nodes: nodes.map(node => {
                if (node.id === currentNode.id) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      configValue: {
                        ...node.data.configValue,
                        testResults: updatedTestResults,
                      },
                    },
                  };
                }
                return node;
              }),
            },
          });
        }
      }
    }

    return { 
      pathsToTake: [selectedPathId],
      abTestVariants: normalizedVariants,
      testResults,
    };
  },

  mockRun: async ({ configValue }) => {
    const { abTestVariants } = configValue;
    
    if (!abTestVariants || abTestVariants.length === 0) {
      return {
        pathsToTake: ['mock-path-id'],
        abTestVariants: [],
      };
    }

    // Normalize percentages
    const normalizedVariants = normalizeVariantPercentages(abTestVariants);
    
    // For mock, just return the first active path
    const activeVariants = normalizedVariants.filter(variant => !variant.isArchived);
    
    return {
      pathsToTake: activeVariants.length > 0 
        ? [activeVariants[0].pathId] 
        : ['mock-path-id'],
      abTestVariants: normalizedVariants,
    };
  },
});
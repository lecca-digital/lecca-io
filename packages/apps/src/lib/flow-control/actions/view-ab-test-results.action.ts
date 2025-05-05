import { createAction, createMarkdownField } from '@lecca-io/toolkit';
import { z } from 'zod';

import { 
  AbTestResultsSchema,
  AbTestVariantSchema,
} from '../utils/ab-test-management';
import { generateAbTestReport, formatReportForDisplay } from '../utils/ab-test-reporting';

export const viewAbTestResults = createAction({
  id: 'flow-control_action_view-ab-test-results',
  name: 'View A/B Test Results',
  description: 'View the results of an A/B test experiment.',
  iconUrl: `https://lecca-io.s3.us-east-2.amazonaws.com/assets/actions/flow-control_action_view-ab-test-results.svg`,
  availableForAgent: false,
  viewOptions: {
    showManualInputButton: false,
    saveButtonOptions: {
      hideSaveAndTestButton: false,
    },
  },
  aiSchema: z.object({
    testNodeId: z.string(),
    testResults: AbTestResultsSchema.optional(),
    abTestVariants: z.array(AbTestVariantSchema).optional(),
    report: z.string().optional(),
  }),
  inputConfig: [
    createMarkdownField({
      id: 'markdown',
      markdown:
        "View the results of your A/B test experiment. Select the A/B test node to view its results.",
    }),
    {
      id: 'testNodeId',
      label: 'A/B Test Node',
      description: 'Select the A/B test node to view its results.',
      inputType: 'node-selector',
      nodeTypeFilter: ['flow-control_action_ab-test-paths'],
    },
    {
      id: 'report',
      label: 'Results',
      description: 'A/B test results will appear here after retrieving data.',
      inputType: 'markdown',
      readOnly: true,
    },
  ],
  run: async ({
    workflowId,
    configValue,
    prisma,
  }) => {
    const { testNodeId, abTestVariants } = configValue;

    if (!testNodeId) {
      throw new Error('Please select an A/B test node to view results.');
    }

    // Get workflow nodes
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
      },
      select: {
        nodes: true,
      },
    });

    if (!workflow) {
      throw new Error('Workflow not found.');
    }

    // Find the A/B test node
    const nodes = workflow.nodes as any[];
    const targetNode = nodes.find(node => node.id === testNodeId);

    if (!targetNode) {
      throw new Error('Selected A/B test node not found in the workflow.');
    }

    // Get test results and variants
    const testResults = targetNode.data?.configValue?.testResults;
    const variants = targetNode.data?.configValue?.abTestVariants || abTestVariants || [];

    // Generate a report
    const report = generateAbTestReport(testResults, variants);
    const formattedReport = formatReportForDisplay(report);

    return {
      testNodeId,
      testResults,
      abTestVariants: variants,
      report: formattedReport,
    };
  },

  mockRun: async () => {
    // Generate a mock report
    const mockReport = `# A/B Test Results

Total Executions: 520
Total Conversions: 104
Overall Conversion Rate: 20.00%

## Winning Variant

"Variant B" with 22.50% conversion rate

## Variant Performance

| Variant | Traffic | Executions | Conversions | Conv. Rate | Relative Perf. |
|---------|---------|------------|-------------|------------|---------------|
| Variant A | 50% | 260 | 45 | 17.30% | 86.50% |
| Variant B | 50% | 260 | 59 | 22.50% | 113.50% |

Statistical confidence: 80%
`;

    return {
      testNodeId: 'mock-node-id',
      report: mockReport,
    };
  },
});
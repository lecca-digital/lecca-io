import { createApp } from '@lecca-io/toolkit';

import { abTestSplit } from './actions/ab-test-split.action';
import { conditionalPaths } from './actions/conditional-paths.action';
import { getCustomInput } from './actions/get-custom-input.action';
import { manuallyDecidePaths } from './actions/manually-decide-path.action';
import { outputWorkflowData } from './actions/output-workflow-data.action';
import { pause } from './actions/pause.action';
import { runWorkflow } from './actions/run-workflow.action';
import { schedule } from './actions/schedule.action';
import { wait } from './actions/wait.action';
import { listenForWebhook } from './triggers/listen-for-webhook.trigger';
import { manualTrigger } from './triggers/manual-trigger.trigger';
import { recurringSchedule } from './triggers/recurring-schedule.trigger';

export const flowControl = createApp({
  id: 'flow-control',
  name: 'Flow Control',
  logoUrl:
    'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/flow-control.svg',
  description: 'Triggers and actions to control the flow of your workflow',
  actions: [
    getCustomInput,
    manuallyDecidePaths,
    conditionalPaths,
    abTestSplit,
    runWorkflow,
    outputWorkflowData,
    schedule,
    pause,
    wait,
  ],
  triggers: [manualTrigger, recurringSchedule, listenForWebhook],
  connections: [],
});

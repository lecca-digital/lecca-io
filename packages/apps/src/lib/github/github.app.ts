import { createApp } from '@lecca-io/toolkit';

import { createWorkflowDispatchEvent } from './actions/create-workflow-dispatch-event.action';
import { downloadArtifacts } from './actions/download-artifacts.action';
import { listRepositories } from './actions/list-repositories.action';
import { listRepositoryWorkflows } from './actions/list-repository-workflows.action';
import { githubOAuth2 } from './connections/github.oauth2';

export const github = createApp({
  id: 'github',
  name: 'Github',
  description:
    'GitHub is a proprietary developer platform that allows developers to create, store, manage, and share their code.',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/github.svg',
  actions: [
    createWorkflowDispatchEvent,
    downloadArtifacts,
    listRepositories,
    listRepositoryWorkflows,
  ],
  triggers: [],
  connections: [githubOAuth2],
});

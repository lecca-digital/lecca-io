import { Icons } from '../icons';
import { Card } from '../ui/card';
import { YoutubeIframe } from '../youtube-iframe';

import { Tour } from './types';

export const tours: Tour[] = [
  {
    tour: 'application-overview',
    steps: [
      {
        icon: <Icons.project className="inline mb-0.5 size-4 mr-1" />,
        title: 'Projects',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Projects are a way to organize your agents and workflows.
              <br />
              <br />
              You can also create Connections, Knowledge Notebooks, and
              Variables within a project.
              <br />
              <br />
              <YoutubeIframe src="https://www.youtube.com/embed/JwE3L8tmpJI?si=e84DZqRZPF9jHIkN" />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step2',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.agent className="inline mb-0.5 size-4 mr-1" />,
        title: 'Agents',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Agents can search the web, send emails, create calendar events,
              and more.
              <br />
              <br />
              They use the connections and actions you configure to perform
              tasks given to them.
              <br />
              <br />
              <YoutubeIframe src="https://www.youtube.com/embed/kBk-swoAkY8?si=eVBmxzN0w_KVW22_" />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step3',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.workflow className="inline mb-0.5 size-4 mr-1" />,
        title: 'Workflows',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Workflows are a sequence of tasks that are executed in a specific
              order.
              <br />
              <br />
              You can configure triggers so they run automatically, on a
              schedule, or manually.
              <br />
              <br />
              <YoutubeIframe src="https://www.youtube.com/embed/csDLgJSMg-A?si=1c1zBpdwo4peTX7y" />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step4',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.knowledge className="inline mb-0.5 size-4 mr-1" />,
        title: 'Knowledge',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Knowledge notebooks are used to store custom data.
              <br />
              <br />
              Upload a file, paste some text, and let your Agents use to data to
              accomplish their tasks.
              <br />
              <br />
              <YoutubeIframe src="https://www.youtube.com/embed/2V7A3IpyJbo?si=4RUriV0AB5bevQy1" />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step5',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.link className="inline mb-0.5 size-4 mr-1" />,
        title: 'Connections',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Connect to your favorite apps.
              <br />
              <br />
              Once connected to your apps, you can use their actions in your
              workflows or give your AI Agents permission to perform these
              actions for you.
              <br />
              <br />
              <YoutubeIframe src="https://www.youtube.com/embed/b83bJYakaR8?si=5d5fl0sok1imQFC_" />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step6',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.braces className="inline mb-0.5 size-4 mr-1" />,
        title: 'Variables',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Create reusable values.
              <br />
              <br />
              Reuse common text, numbers, booleans, and dates within your
              workflows.
              <br />
              <br />
              <YoutubeIframe src="https://www.youtube.com/embed/TJEL2m7u07s?si=VG4_4tyZ0ng9bIWd" />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step7',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.chat className="inline mb-0.5 size-4 mr-1" />,
        title: 'Conversations',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              You can message your agents, other agents can message eachother,
              and workflows can also pass messages to agents.
              <br />
              <br />
              This helps manage all the conversations happening.
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step8',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.executions className="inline mb-0.5 size-4 mr-1" />,
        title: 'Executions',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              When you're workflows run, you can view them here.
              <br />
              <br />
              You'll be reviewing executions if a workflow requires human input
              or if you need to troubleshoot a workflow.
              <br />
              <br />
              <YoutubeIframe src="https://www.youtube.com/embed/1z6J5oMrd8I?si=3JFrUcnNeH4du-vn&amp;start=228" />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step9',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.users className="inline mb-0.5 size-4 mr-1" />,
        title: 'Team',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Invite your team members to join your workspace
              <br />
              <br />
              You must be a workspace Maintainer and your workspace must be at
              least on the Team plan to invite team members.
              <br />
              <br />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step10',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.app className="inline mb-0.5 size-4 mr-1" />,
        title: 'Apps',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              View our collections of apps you can integrate with.
              <br />
              <br />
              If you do not see an app you need, please reach out to our team.
              <br />
              <br />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step11',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.app className="inline mb-0.5 size-4 mr-1" />,
        title: 'Templates',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Use our pre-built templates to get started quickly.
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step12',
        side: 'right-top',
        pointerPadding: 0,
      },
      {
        icon: <Icons.creditCard className="inline mb-0.5 size-4 mr-1" />,
        title: 'Credit Usage',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              View your credit usage in detail.
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-step13',
        side: 'right-top',
        pointerPadding: 0,
      },
    ],
  },
  {
    tour: 'agents-overview',
    steps: [
      {
        icon: <Icons.hammer className="inline mb-0.5 mr-1" />,
        title: 'Tools',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Enable web search, email, calendar, phone calling, or other tools
              that your Agent can use to complete tasks.
              <br />
              <br />
              <YoutubeIframe src="https://www.youtube.com/embed/981hUqVIzhQ?si=8PlsMIyPp59dvabP" />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-agents-overview-tool',
        side: 'bottom-left',
        pointerPadding: 0,
      },
      {
        icon: <Icons.knowledge className="inline mb-0.5 mr-1" />,
        title: 'Knowledge',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              You can also give your Agent access to{' '}
              <em>
                <strong>Search Knowledge</strong>
              </em>{' '}
              you've uploaded to your knowledge notebooks.
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-agents-overview-tool',
        side: 'bottom-left',
        pointerPadding: 0,
      },
      {
        icon: <Icons.agent className="inline mb-0.5 mr-1" />,
        title: 'Message Agents',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              You can message other agents in your project. This is useful for
              delegating tasks to an Agent that is more equipped to solve a
              given task.
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-agents-overview-tool',
        side: 'bottom-left',
        pointerPadding: 0,
      },
      {
        icon: <Icons.agent className="inline mb-0.5 mr-1" />,
        title: 'Run Workflows',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              If you build workflows you can enable your agents to run them.
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-agents-overview-tool',
        side: 'bottom-left',
        pointerPadding: 0,
      },
      {
        icon: <Icons.zap className="inline mb-0.5 mr-1" />,
        title: 'Triggers',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Add a trigger to your Agent to run it automatically. You can
              configure a recurring schedule or an event from an integration.
              <br />
              <br />
              <YoutubeIframe src="https://www.youtube.com/embed/OMh9NMXSuWk?si=2IJAYcqku7lQbrxr" />
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-agents-overview-trigger',
        side: 'bottom-left',
        pointerPadding: 0,
      },
      {
        icon: <Icons.zap className="inline mb-0.5 mr-1" />,
        title: 'Triggers via Workflow',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              You can also trigger your Agent from a workflow using the{' '}
              <em>
                <strong>Message Agent</strong>
              </em>{' '}
              action.
              <br />
              <br />
              Workflow triggers are more configurable than agent triggers at the
              moment. You can add conditions, webhook triggers, and more.
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-agents-overview-trigger',
        side: 'bottom-left',
        pointerPadding: 0,
      },
      {
        icon: <Icons.settings2 className="inline mb-0.5 mr-1" />,
        title: 'Agent Configuration',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Here you can give your Agent instructions on how to behave, handle
              errors, and use tools. You can also select your preferred LLM
              provider and model, and even connect your own API key.
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-agents-overview-advanced-settings',
        side: 'bottom-left',
        pointerPadding: 20,
      },
      {
        icon: <Icons.images className="inline mb-0.5 mr-1" />,
        title: 'Content',
        content: (
          <div className="flex flex-col">
            <Card.Description className="text-primary">
              Upload images, link to images, or even just paste an image from
              your clipboard to the chat.
              <br />
              <br />
              The language model you're using must support images for this
              content feature to work.
            </Card.Description>
          </div>
        ),
        selector: '#onboarding-agents-overview-add-content',
        side: 'bottom-left',
        pointerPadding: 0,
      },
    ],
  },
];

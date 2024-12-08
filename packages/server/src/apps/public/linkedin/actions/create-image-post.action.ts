import { z } from 'zod';

import { Action, RunActionArgs } from '@/apps/lib/action';
import { InputConfig } from '@/apps/lib/input-config';

import { Linkedin } from '../linkedin.app';

export class CreateImagePost extends Action {
  app: Linkedin;

  id = 'linkedin_action_create-image-post';
  name = 'Create Image Post';
  description = 'Create an image post on LinkedIn.';
  aiSchema = z.object({
    commentary: z
      .string()
      .min(1)
      .describe('The text content of the LinkedIn post'),
    imageUrl: z.string().min(1).describe('The URL of the image to post'),
    visibility: z
      .enum(['PUBLIC', 'CONNECTIONS', 'LOGGED_IN'])
      .describe(
        'Post visibility (Public, Only My Connections, Viewable by logged-in members only)',
      ),
    feedDistribution: z
      .enum(['MAIN_FEED', 'NONE'])
      .nullable()
      .optional()
      .describe('Ignored if visibility is public'),
    lifecycleState: z
      .enum(['PUBLISHED', 'DRAFT'])
      .nullable()
      .optional()
      .describe('Whether to create post as draft or published'),
    canReshare: z.enum(['true', 'false']).describe('Allow others to reshare'),
  });
  inputConfig: InputConfig[] = [
    {
      label: 'Text Content',
      id: 'commentary',
      inputType: 'text',
      placeholder: 'Add content',
      description: '',
      required: {
        missingMessage: 'Content is required',
        missingStatus: 'warning',
      },
    },
    {
      label: 'Image',
      id: 'imageUrl',
      inputType: 'file',
      description: 'Add an image to the post',
      required: {
        missingMessage: 'Image is required',
        missingStatus: 'warning',
      },
    },
    {
      label: 'Visibility',
      id: 'visibility',
      inputType: 'select',
      selectOptions: [
        { label: 'Public', value: 'PUBLIC' },
        { label: 'Only My Connections', value: 'CONNECTIONS' },
        { label: 'Logged in members only', value: 'LOGGED_IN' },
      ],
      placeholder: 'Select visibility',
      description: 'Who can see this post',
      required: {
        missingMessage: 'Visibility is required',
        missingStatus: 'warning',
      },
      defaultValue: 'PUBLIC',
    },
    {
      label: 'Feed Distribution',
      id: 'feedDistribution',
      inputType: 'select',
      selectOptions: [
        {
          label: 'Main Feed',
          value: 'MAIN_FEED',
        },
        {
          label: 'Not Distributed via Feed',
          value: 'NONE',
        },
      ],
      defaultValue: 'MAIN_FEED',
      description:
        'Whether to share post on main feed or to post but not distribute. Will always be Main Feed if visibility is Public',
    },
    {
      label: 'Create as Draft',
      id: 'lifecycleState',
      inputType: 'switch',
      switchOptions: {
        checked: 'DRAFT',
        unchecked: 'PUBLISHED',
        defaultChecked: false,
      },
      description:
        'Whether to create the post as a draft or publish it immediately',
    },
    {
      label: 'Can Reshare',
      id: 'canReshare',
      inputType: 'switch',
      switchOptions: {
        checked: 'true',
        unchecked: 'false',
        defaultChecked: true,
      },
      description:
        'Whether the author allows others to reshare the post or not',
    },
  ];

  async run({
    configValue,
    connection,
    workspaceId,
  }: RunActionArgs<ConfigValue>): Promise<any> {
    const url = 'https://api.linkedin.com/rest/posts';

    const personId = await this.app.getPersonId({
      accessToken: connection.accessToken,
      workspaceId,
    });

    const {
      canReshare,
      commentary,
      imageUrl,
      lifecycleState,
      feedDistribution,
      visibility,
    } = configValue;

    const urn = `person:${personId}`;

    if (!imageUrl) {
      throw new Error('Image is required');
    }

    const imageId = await this.app.uploadMediaImage({
      accessToken: connection.accessToken,
      mediaUrl: imageUrl,
      urn,
      workspaceId,
    });

    const postBody = {
      author: `urn:li:${urn}`,
      commentary,
      lifecycleState,
      isReshareDisabledByAuthor: canReshare === 'false',
      visibility,
      distribution: {
        feedDistribution, //MAIN_FEED | NONE
      },
      content: {
        media: {
          id: imageId,
        },
      },
    };

    if (visibility === 'PUBLIC') {
      postBody.distribution.feedDistribution = 'MAIN_FEED';
    }

    await this.app.http.loggedRequest({
      method: 'POST',
      url,
      data: postBody,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Linkedin-Version': 202408,
      },
      workspaceId,
    });

    return {
      postCreated: true,
    };
  }

  async mockRun(): Promise<any> {
    return {
      postCreated: true,
    };
  }
}

type ConfigValue = z.infer<CreateImagePost['aiSchema']>;

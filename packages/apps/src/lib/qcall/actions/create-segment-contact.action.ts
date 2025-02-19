import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

export const createSegmentContact = createAction({
  id: 'segment_contact_create',
  name: 'Create Segment Contact',
  description: 'Create a contact in a specified segment',
  
  aiSchema: z.object({
    first_name: z.string().describe('First name of the contact'),
    last_name: z.string().describe('Last name of the contact'),
    email: z.string().email().describe('Email address of the contact'),
    phone: z.string().describe('Phone number of the contact'),
    description: z.string().optional().describe('Description of the contact'),
    job_title: z.string().optional().describe('Job title of the contact'),
    lifecycle_stage: z.string().optional().describe('Lifecycle stage of the contact'),
    lead_status: z.string().optional().describe('Lead status of the contact'),
    segment_id: z.string().describe('ID of the segment to add the contact to')
  }),

  inputConfig: [
    {
      id: 'segment_id',
      inputType: 'text',
      label: 'Segment ID',
      description: 'The unique identifier of the segment where the contact will be added',
      placeholder: 'Enter segment ID',
      required: {
        missingMessage: 'Segment ID is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'first_name',
      inputType: 'text',
      label: 'First Name',
      description: 'The first name of the contact',
      placeholder: 'Enter first name',
      required: {
        missingMessage: 'First name is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'last_name',
      inputType: 'text',
      label: 'Last Name',
      description: 'The last name of the contact',
      placeholder: 'Enter last name',
      required: {
        missingMessage: 'Last name is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'email',
      inputType: 'text',
      label: 'Email',
      description: 'The email address of the contact',
      placeholder: 'Enter email address',
      required: {
        missingMessage: 'Email is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'phone',
      inputType: 'text',
      label: 'Phone',
      description: 'The phone number of the contact',
      placeholder: 'Enter phone number',
      required: {
        missingMessage: 'Phone number is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'description',
      inputType: 'text',
      label: 'Description',
      description: 'Additional description or notes about the contact',
      placeholder: 'Enter description',
    },
    {
      id: 'job_title',
      inputType: 'text',
      label: 'Job Title',
      description: 'The job title or position of the contact',
      placeholder: 'Enter job title',
    },
    {
      id: 'lifecycle_stage',
      inputType: 'text',
      label: 'Lifecycle Stage',
      description: 'The current lifecycle stage of the contact',
      placeholder: 'Enter lifecycle stage',
    },
    {
      id: 'lead_status',
      inputType: 'text',
      label: 'Lead Status',
      description: 'The current status of the lead',
      placeholder: 'Enter lead status',
    }
  ],

  run: async ({
    configValue,
    workspaceId,
    http,
  }) => {
    const createContactResult = await http.request({
      method: 'POST',
      url: `https://api.qcall.ai/api/v1/segment/contact/create?id=${configValue.segment_id}`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.QCALL_API_KEY,
      },
      data: {
        first_name: configValue.first_name,
        last_name: configValue.last_name,
        email: configValue.email,
        phone: configValue.phone,
        description: configValue.description,
        job_title: configValue.job_title,
        lifecycle_stage: configValue.lifecycle_stage,
        lead_status: configValue.lead_status,
      },
      workspaceId,
    });

    return {
      result: createContactResult.data
    };
  },

  mockRun: async () => {
    return {
      result: {
        status: 200,
        success: true,
        message: "contact add successfully"
      }
    };
  },
});
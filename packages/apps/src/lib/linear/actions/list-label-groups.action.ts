import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

export const listLabelGroups = createAction({
  id: 'linear_action_list-label-groups',
  name: 'List Label Groups',
  description: 'List all label groups in Linear',
  aiSchema: z.object({}),
  inputConfig: [],
  run: async ({ connection, workspaceId, http }) => {
    const url = 'https://api.linear.app/graphql';
    const query = `
      query {
        issueLabels(first: 250) {
          nodes {
            id
            name
            color
            isGroup
            parent {
              id
              name
            }
          }
        }
      }
    `;

    const result = await http.request({
      method: 'POST',
      url,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
      },
      data: {
        query,
      },
      workspaceId,
    });

    if (result.status === 200 && result.data?.data?.issueLabels?.nodes) {
      const allLabels = result.data.data.issueLabels.nodes;
      
      // Check if we have actual group labels
      const groups = allLabels.filter(label => label.isGroup);
      
      if (groups.length > 0) {
        // If we have groups, return them directly
        return {
          status: 'success',
          data: groups.sort((a, b) => a.name.localeCompare(b.name)),
        };
      } else {
        // If no groups exist, create virtual groups from parent labels
        const groupsMap = new Map();
        
        // Add an "Ungrouped" option for labels without a parent
        groupsMap.set('ungrouped', { 
          id: 'ungrouped', 
          name: 'Ungrouped Labels',
          color: '#000000',
          isGroup: true,
          virtualGroup: true
        });
        
        // Collect parent labels to use as groups
        allLabels.forEach(label => {
          if (label.parent) {
            if (!groupsMap.has(label.parent.id)) {
              groupsMap.set(label.parent.id, {
                id: label.parent.id,
                name: label.parent.name,
                color: label.parent.color || '#000000',
                isGroup: true,
                virtualGroup: true
              });
            }
          }
        });
        
        // Convert to array and sort by name
        const groupsArray = Array.from(groupsMap.values());
        return {
          status: 'success',
          data: groupsArray.sort((a, b) => a.name.localeCompare(b.name)),
        };
      }
    } else {
      const errorMessage =
        result.data?.errors?.[0]?.message ||
        `Failed to list label groups: ${result.status}`;
      throw new Error(errorMessage);
    }
  },
  mockRun: async () => {
    return {
      status: 'success',
      data: [
        {
          id: 'group-123',
          name: 'Issue Type',
          color: '#000000',
          isGroup: true
        },
        {
          id: 'group-456',
          name: 'Priority',
          color: '#0000FF',
          isGroup: true
        },
        {
          id: 'group-789',
          name: 'Status',
          color: '#00FF00',
          isGroup: true
        }
      ],
    };
  },
});
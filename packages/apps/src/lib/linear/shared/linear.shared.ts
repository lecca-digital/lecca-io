import { createDynamicSelectInputField } from '@lecca-io/toolkit';

export const shared = {
  fields: {
    dynamicSelectTeam: createDynamicSelectInputField({
      id: 'teamId',
      label: 'Team',
      description: 'Select a Linear team',
      placeholder: 'Select team',
      _getDynamicValues: async ({ connection, workspaceId, http }) => {
        const url = 'https://api.linear.app/graphql';
        const query = `
          query {
            teams {
              nodes {
                id
                name
              }
            }
          }
        `;

        const response = await http.request({
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

        if (response.status !== 200 || !response.data?.data?.teams?.nodes) {
          throw new Error(`Failed to fetch teams: ${response.status}`);
        }

        const teams = response.data.data.teams.nodes;
        return teams.map((team) => ({
          label: team.name,
          value: team.id,
        }));
      },
      required: {
        missingMessage: 'Team is required',
        missingStatus: 'warning',
      },
    }),
    dynamicSelectLabelGroup: createDynamicSelectInputField({
      id: 'labelGroupId',
      label: 'Label Group',
      description: 'Select a Linear label group',
      placeholder: 'Select label group',
      _getDynamicValues: async ({ connection, workspaceId, http }) => {
        const url = 'https://api.linear.app/graphql';
        
        // Linear stores label groups as part of the label structure
        // We need to extract unique group names from labels
        const query = `
          query {
            issueLabels(first: 250) {
              nodes {
                id
                name
                parent {
                  id
                  name
                  color
                }
                isGroup
              }
            }
          }
        `;

        const response = await http.request({
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

        if (
          response.status !== 200 ||
          !response.data?.data?.issueLabels?.nodes
        ) {
          throw new Error(`Failed to fetch labels: ${response.status}`);
        }

        // Extract groups and label parents
        const labels = response.data.data.issueLabels.nodes;
        const groupsMap = new Map();
        
        // Add an "Ungrouped" option for labels without a parent
        groupsMap.set('ungrouped', { 
          id: 'ungrouped', 
          name: 'Ungrouped Labels',
          color: '#000000' 
        });
        
        // First pass: find actual groups (labels with isGroup=true)
        const groups = labels.filter(label => label.isGroup);
        groups.forEach(group => {
          groupsMap.set(group.id, {
            id: group.id,
            name: group.name,
            color: group.color || '#000000'
          });
        });
        
        // If we have no groups, use parent labels as groups
        if (groups.length === 0) {
          // Collect parent labels to use as groups
          labels.forEach(label => {
            if (label.parent) {
              groupsMap.set(label.parent.id, label.parent);
            }
          });
        }
        
        // Convert to array and sort by name
        const groupsArray = Array.from(groupsMap.values());
        return groupsArray.sort((a, b) => a.name.localeCompare(b.name)).map(group => ({
          label: group.name,
          value: group.id,
        }));
      },
      required: {
        missingMessage: 'Label group is required',
        missingStatus: 'warning',
      },
      loadOptions: {
        forceRefresh: true,
      },
    }),
    dynamicSelectLabel: createDynamicSelectInputField({
      id: 'labelId',
      label: 'Label',
      description: 'Select a Linear label',
      placeholder: 'Select label',
      _getDynamicValues: async ({
        connection,
        workspaceId,
        http,
        extraOptions,
      }) => {
        const { labelGroupId } = extraOptions;

        if (!labelGroupId?.trim?.()) {
          return [];
        }

        const url = 'https://api.linear.app/graphql';
        
        // Fetch all labels
        const query = `
          query {
            issueLabels(first: 250) {
              nodes {
                id
                name
                color
                parent {
                  id
                }
                isGroup
              }
            }
          }
        `;

        const response = await http.request({
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

        if (
          response.status !== 200 ||
          !response.data?.data?.issueLabels?.nodes
        ) {
          throw new Error(`Failed to fetch labels: ${response.status}`);
        }

        const allLabels = response.data.data.issueLabels.nodes;
        
        let filteredLabels = [];
        
        // Check if we have actual group labels
        const hasGroups = allLabels.some(label => label.isGroup);
        
        if (hasGroups) {
          // If labelGroupId is a group, get all labels that aren't groups
          if (labelGroupId === 'ungrouped') {
            // For ungrouped, get labels without a parent and that aren't groups
            filteredLabels = allLabels.filter(label => 
              !label.parent && !label.isGroup
            );
          } else {
            // For a specific group, look for labels where the parent.id matches the group id
            // or the label itself is a group being displayed
            filteredLabels = allLabels.filter(label => 
              (label.parent && label.parent.id === labelGroupId && !label.isGroup)
            );
          }
        } else {
          // Fallback to parent/child relationship
          if (labelGroupId === 'ungrouped') {
            // For ungrouped, get labels without a parent
            filteredLabels = allLabels.filter(label => !label.parent);
          } else {
            // For a specific parent, get all child labels
            filteredLabels = allLabels.filter(label => 
              label.parent && label.parent.id === labelGroupId
            );
          }
        }
        
        // Sort labels alphabetically
        return filteredLabels
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((label) => ({
            label: label.name,
            value: label.id,
          }));
      },
      required: {
        missingMessage: 'Label is required',
        missingStatus: 'warning',
      },
      loadOptions: {
        forceRefresh: true,
        dependsOn: ['labelGroupId'],
      },
    }),
    dynamicSelectIssue: createDynamicSelectInputField({
      id: 'issueId',
      label: 'Issue',
      description: 'Select a Linear issue',
      placeholder: 'Select issue',
      _getDynamicValues: async ({
        connection,
        workspaceId,
        http,
        extraOptions,
      }) => {
        const { teamId } = extraOptions;

        if (!teamId?.trim?.()) {
          return [];
        }

        const url = 'https://api.linear.app/graphql';
        const query = `
          query($teamId: ID!, $first: Int!) {
            issues(
              filter: { team: { id: { eq: $teamId } } }
              first: $first
              orderBy: updatedAt
            ) {
              nodes {
                id
                title
                identifier
              }
            }
          }
        `;

        const response = await http.request({
          method: 'POST',
          url,
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
          },
          data: {
            query,
            variables: {
              teamId,
              first: 100,
            },
          },
          workspaceId,
        });

        if (response.status !== 200 || !response.data?.data?.issues?.nodes) {
          throw new Error(`Failed to fetch issues: ${response.status}`);
        }

        const issues = response.data.data.issues.nodes;
        return issues.map((issue) => ({
          label: `${issue.identifier} - ${issue.title}`,
          value: issue.id,
        }));
      },
      required: {
        missingMessage: 'Issue is required',
        missingStatus: 'warning',
      },
      loadOptions: {
        forceRefresh: true,
        dependsOn: ['teamId'],
      },
    }),
  },
};
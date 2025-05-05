import { useCallback, useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Edge, Node, useReactFlow } from 'reactflow';

import { Form } from '../../../../../../../components/ui/form';
import { Input } from '../../../../../../../components/ui/input';
import { FieldConfig } from '../../../../../../../models/workflow/input-config-model';
import { cn } from '../../../../../../../utils/cn';

export type PercentageSplit = {
  /**
   * Node Name (node.data.name) of the connected node
   */
  label: string;
  /**
   * This is the edge id of the connected edge
   */
  pathId: string;
  /**
   * The percentage (0-100) this path should be taken
   */
  percentage: number;
};

export function PercentageSplitsFormFields({
  form,
  node,
  fieldConfig,
  readonly,
  projectId,
  agentId,
}: {
  form: UseFormReturn<any, any, undefined>;
  node: Node;
  fieldConfig: FieldConfig;
  readonly?: boolean;
  projectId: string;
  agentId: string | undefined;
}) {
  const { getEdges, getNodes } = useReactFlow();
  const [percentageSplits, setPercentageSplits] = useState<PercentageSplit[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(100);

  const connectedEdgesAndNodes = useMemo(() => {
    // Return an array of objects like { edge, node } for each connected edge
    const edges = getEdges();
    const nodes = getNodes();

    const connectedEdges = edges.filter((edge) => edge.source === node.id);
    const connectedEdgesAndNodes = connectedEdges.map((edge) => {
      const node = nodes.find((n) => n.id === edge.target);
      return { edge, node };
    });

    // Only return the edge where the connected node exists and is not type 'placeholder'
    return connectedEdgesAndNodes.filter(
      (edgeAndNode) =>
        edgeAndNode.node && edgeAndNode.node.type !== 'placeholder',
    ) as { edge: Edge; node: Node }[];
  }, [getEdges, getNodes, node.id]);

  const onPercentageChange = useCallback(
    ({ percentage, splitIndex }: { percentage: number; splitIndex: number }) => {
      // Convert percentage to a number and limit to valid range (0-100)
      const validPercentage = Math.min(Math.max(0, percentage), 100);

      const newSplits = percentageSplits.map((split, index) => {
        if (index === splitIndex) {
          return { ...split, percentage: validPercentage };
        }
        return split;
      });

      setPercentageSplits(newSplits);
      
      // Calculate total percentage
      const total = newSplits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      setTotalPercentage(total);
    },
    [percentageSplits],
  );

  const distributeRemaining = useCallback(() => {
    if (percentageSplits.length <= 1) return;

    // Handle special case: if all percentages are 0, distribute evenly
    const allZeros = percentageSplits.every(split => split.percentage === 0);
    if (allZeros) {
      const evenPercentage = 100 / percentageSplits.length;
      const newSplits = percentageSplits.map(split => ({
        ...split,
        percentage: Math.round(evenPercentage * 10) / 10 // Round to 1 decimal place
      }));
      setPercentageSplits(newSplits);
      setTotalPercentage(100);
      return;
    }

    // Find how much percentage remains to distribute
    const currentTotal = percentageSplits.reduce((sum, split) => sum + (split.percentage || 0), 0);
    const remaining = 100 - currentTotal;
    
    if (remaining === 0) return; // Already at 100%, nothing to distribute
    
    // Count splits where percentage is not explicitly set or is 0
    const unsetSplits = percentageSplits.filter(split => !split.percentage || split.percentage === 0);
    
    if (unsetSplits.length === 0) {
      // If all splits have values, distribute proportionally
      const adjustmentFactor = 100 / currentTotal;
      const newSplits = percentageSplits.map(split => ({
        ...split,
        percentage: Math.round((split.percentage * adjustmentFactor) * 10) / 10 // Round to 1 decimal place
      }));
      setPercentageSplits(newSplits);
    } else {
      // Distribute remaining percentage evenly among unset splits
      const percentagePerUnset = remaining / unsetSplits.length;
      const newSplits = percentageSplits.map(split => {
        if (!split.percentage || split.percentage === 0) {
          return {
            ...split,
            percentage: Math.round(percentagePerUnset * 10) / 10 // Round to 1 decimal place
          };
        }
        return split;
      });
      setPercentageSplits(newSplits);
    }
    
    setTotalPercentage(100);
  }, [percentageSplits]);

  useEffect(() => {
    if (
      !form.getValues('percentageSplits') ||
      !form.getValues('percentageSplits').length
    ) {
      // When there is no saved data, initialize with connected nodes
      const splits = connectedEdgesAndNodes.map((edgeAndNode, index) => {
        let pathLabel = edgeAndNode.node.data.name;

        // Add index to path name if duplicate, e.g. "name (1)"
        if (
          connectedEdgesAndNodes.filter(
            (item) => item.node.data.name === pathLabel,
          ).length > 1
        ) {
          pathLabel = `${pathLabel} (${index + 1})`;
        }

        // For two nodes, default to 50/50
        // For more than two, make the first one 100% and others 0%
        // (User will need to adjust)
        let defaultPercentage = 0;
        if (connectedEdgesAndNodes.length === 2) {
          defaultPercentage = 50;
        } else if (index === 0) {
          defaultPercentage = 100;
        }

        return {
          label: pathLabel,
          pathId: edgeAndNode.edge.id,
          percentage: defaultPercentage,
        };
      });

      setPercentageSplits(splits);
      setTotalPercentage(splits.reduce((sum, split) => sum + (split.percentage || 0), 0));
    } else {
      // When there is saved data, need to update for any changes to the connected nodes
      const savedSplits = form.getValues('percentageSplits') as PercentageSplit[];
      
      // Extract path IDs from saved options and connected edges and nodes
      const savedPathIds = new Set(
        savedSplits.map((split) => split.pathId),
      );
      const connectedPathIds = new Set(
        connectedEdgesAndNodes.map((edgeAndNode) => edgeAndNode.edge.id),
      );

      // Filter out deleted paths from saved splits
      const updatedSplits = savedSplits.filter((split) =>
        connectedPathIds.has(split.pathId),
      );

      // Find new paths that are in connectedEdgesAndNodes but not in savedSplits
      const usedLabels = new Set(
        updatedSplits.map((split) => split.label),
      );
      const newPaths = connectedEdgesAndNodes
        .filter((edgeAndNode) => !savedPathIds.has(edgeAndNode.edge.id))
        .map((edgeAndNode) => {
          const baseLabel = edgeAndNode.node.data.name;
          let pathLabel = baseLabel;
          let suffix = 1;

          // Ensure unique path labels
          while (usedLabels.has(pathLabel)) {
            pathLabel = `${baseLabel} (${suffix++})`;
          }
          usedLabels.add(pathLabel);

          return {
            label: pathLabel,
            pathId: edgeAndNode.edge.id,
            percentage: 0, // New paths start with 0%
          };
        });

      // Update the splits state
      const combinedSplits = [...updatedSplits, ...newPaths];
      setPercentageSplits(combinedSplits);
      setTotalPercentage(combinedSplits.reduce((sum, split) => sum + (split.percentage || 0), 0));
    }
  }, [connectedEdgesAndNodes, form]);

  useEffect(() => {
    if (percentageSplits?.length) {
      form.setValue('percentageSplits', percentageSplits);
    }
  }, [form, percentageSplits]);

  if (node.data.executionStatus === 'NEEDS_INPUT') {
    // For execution status needs input - this should not happen for A/B testing
    return (
      <div>
        A/B Test Split happens automatically based on configured percentages. 
        No manual input is required.
      </div>
    );
  } 
  
  if (!percentageSplits.length) {
    return (
      <div className="">
        <p className="font-bold text-md">{fieldConfig.label}</p>
        <p className="text-sm">{fieldConfig.description}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect actions to this node to start configuring A/B test splits.
        </p>
      </div>
    );
  }

  return (
    <Form.Item>
      <div className="ml-1 text-sm font-semibold">
        {readonly ? 'Selected Split' : 'A/B Test Path Configuration'}
      </div>
      {!readonly && (
        <div className="text-sm text-muted-foreground mb-2">
          Distribute traffic between paths by setting percentages (total should equal 100%)
        </div>
      )}
      <Form.Control>
        <div
          className={cn('space-y-4 overflow-x-hidden', {
            'bg-muted/30 border p-3 rounded-md': !readonly,
          })}
        >
          {percentageSplits.map((split, index) => (
            <div key={split.pathId} className="flex flex-row items-center gap-2">
              <div className="flex-grow">{split.label}</div>
              <div className="flex flex-row items-center gap-1 w-24">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={split.percentage}
                  onChange={(e) =>
                    onPercentageChange({
                      percentage: parseFloat(e.target.value) || 0,
                      splitIndex: index,
                    })
                  }
                  className="w-16 text-right"
                  readOnly={readonly}
                />
                <span>%</span>
              </div>
            </div>
          ))}
          
          {!readonly && (
            <div className="flex flex-row justify-between mt-4">
              <div className={`font-medium ${totalPercentage !== 100 ? 'text-destructive' : ''}`}>
                Total: {totalPercentage.toFixed(1)}%
              </div>
              {totalPercentage !== 100 && (
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={distributeRemaining}
                >
                  Auto-balance
                </button>
              )}
            </div>
          )}
        </div>
      </Form.Control>
      <Form.Message />
    </Form.Item>
  );
}
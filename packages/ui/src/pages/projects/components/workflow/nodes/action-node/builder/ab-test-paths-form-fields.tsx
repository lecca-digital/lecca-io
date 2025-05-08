import { useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Edge, Node, useReactFlow } from 'reactflow';

import { Button } from '../../../../../../../components/ui/button';
import { Form } from '../../../../../../../components/ui/form';
import { Input } from '../../../../../../../components/ui/input';
import { Slider } from '../../../../../../../components/ui/slider';
import { Tabs } from '../../../../../../../components/ui/tabs';
import { FieldConfig } from '../../../../../../../models/workflow/input-config-model';

export function AbTestPathsFormFields({
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
  const [remainingPercentage, setRemainingPercentage] = useState(0);

  const connectedEdgesAndNodes = useMemo(() => {
    const edges = getEdges();
    const nodes = getNodes();

    const connectedEdges = edges.filter((edge) => edge.source === node.id);
    const connectedEdgesAndNodes = connectedEdges.map((edge) => {
      const node = nodes.find((n) => n.id === edge.target);
      return { edge, node };
    });

    // Only return edges where the connected node exists and is not type 'placeholder'
    return connectedEdgesAndNodes.filter(
      (edgeAndNode) =>
        edgeAndNode.node && edgeAndNode.node.type !== 'placeholder',
    ) as { edge: Edge; node: Node }[];
  }, [getEdges, getNodes, node.id]);

  const abTestPaths = useMemo(() => {
    const savedPaths = form.getValues('abTestPaths') as AbTestPath[] || [];
    
    return (connectedEdgesAndNodes ?? []).map((edgeAndNode) => {
      const existingPath = savedPaths.find(
        (path) => path.pathId === edgeAndNode.edge.id,
      );

      // Default to even distribution if no existing configuration
      const defaultPercentage = savedPaths.length === 0 
        ? 100 / connectedEdgesAndNodes.length 
        : 0;

      const abTestPath: AbTestPath = {
        label: edgeAndNode.node.data.name,
        pathId: edgeAndNode.edge.id,
        percentage: existingPath?.percentage ?? defaultPercentage,
      };

      return abTestPath;
    });
  }, [connectedEdgesAndNodes, form]);

  // Calculate remaining percentage for auto-distribution
  useMemo(() => {
    const total = abTestPaths.reduce((sum, path) => sum + path.percentage, 0);
    setRemainingPercentage(Math.max(0, 100 - total));
  }, [abTestPaths]);

  // Update form value whenever abTestPaths changes
  useMemo(() => {
    if (abTestPaths.length > 0) {
      form.setValue('abTestPaths', abTestPaths);
    }
  }, [abTestPaths, form]);

  const distributeRemaining = () => {
    if (remainingPercentage <= 0 || abTestPaths.length === 0) return;
    
    const currentPaths = [...abTestPaths];
    const equalShare = remainingPercentage / currentPaths.length;
    
    const updatedPaths = currentPaths.map(path => ({
      ...path,
      percentage: path.percentage + equalShare
    }));
    
    form.setValue('abTestPaths', updatedPaths);
  };

  const handlePercentageChange = (index: number, value: number) => {
    const currentPaths = [...(form.getValues('abTestPaths') as AbTestPath[] || [])];
    
    // Ensure we don't exceed 100% total
    const otherPathsTotal = currentPaths.reduce((sum, path, i) => 
      i !== index ? sum + path.percentage : sum, 0);
    
    const maxAllowed = Math.min(value, 100 - otherPathsTotal);
    
    currentPaths[index] = {
      ...currentPaths[index],
      percentage: maxAllowed
    };
    
    form.setValue('abTestPaths', currentPaths);
  };

  if (!abTestPaths.length) {
    return readonly ? (
      <div className="">
        <p className="font-bold text-md">No paths available for A/B testing</p>
      </div>
    ) : (
      <div className="">
        <p className="font-bold text-md">{fieldConfig.label}</p>
        <p className="text-sm">{fieldConfig.description}</p>
        <p className="text-sm mt-2">
          Connect this node to two or more paths to set up A/B testing.
        </p>
      </div>
    );
  }

  // Calculate total percentage
  const totalPercentage = abTestPaths.reduce(
    (sum, path) => sum + path.percentage,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <p className="font-bold text-md">{fieldConfig.label}</p>
        <p className="text-sm">{fieldConfig.description}</p>
        
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm font-medium">
            Total: {totalPercentage.toFixed(1)}%
          </p>
          {totalPercentage < 100 && !readonly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={distributeRemaining}
            >
              Distribute Remaining {remainingPercentage.toFixed(1)}%
            </Button>
          )}
        </div>
        
        {totalPercentage !== 100 && (
          <p className={`text-sm ${totalPercentage > 100 ? 'text-red-500' : 'text-yellow-500'}`}>
            {totalPercentage > 100 
              ? 'Warning: Total exceeds 100%. Reduce some percentages.' 
              : 'Warning: Total should equal 100%. Distribute the remaining percentage.'}
          </p>
        )}
      </div>

      <Tabs
        className="space-y-6"
        defaultValue={abTestPaths[0].pathId}
      >
        <div className="flex flex-col items-start justify-start w-full overflow-x-auto">
          <Tabs.List>
            {abTestPaths.map((path) => (
              <Tabs.Trigger key={path.pathId} value={path.pathId}>
                {path.label} ({path.percentage.toFixed(1)}%)
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>
        
        {abTestPaths.map((path, index) => (
          <Tabs.Content
            key={path.pathId}
            value={path.pathId}
          >
            <div className="space-y-4">
              <div>
                <p className="font-semibold mb-2">{path.label}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Set the percentage of traffic that should flow through this path.
                </p>
              </div>
              
              <div className="flex flex-col space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Slider
                      disabled={readonly}
                      value={[path.percentage]}
                      max={100}
                      step={0.1}
                      onValueChange={(values) => handlePercentageChange(index, values[0])}
                    />
                  </div>
                  <div className="w-16">
                    <Form.Field
                      control={form.control}
                      name={`abTestPaths.${index}.percentage`}
                      render={({ field }) => (
                        <Input
                          disabled={readonly}
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          {...field}
                          value={field.value.toFixed(1)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value)) {
                              handlePercentageChange(index, value);
                            }
                          }}
                        />
                      )}
                    />
                  </div>
                  <div className="w-4">%</div>
                </div>
              </div>
            </div>
          </Tabs.Content>
        ))}
      </Tabs>
    </div>
  );
}

export type AbTestPath = {
  /**
   * Node Name (node.data.name) of the connected node
   */
  label: string;
  /**
   * This is the edge id of the connected edge
   */
  pathId: string;
  /**
   * Percentage weight for this path (0-100)
   */
  percentage: number;
};
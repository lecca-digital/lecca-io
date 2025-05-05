import { format, isValid } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import React from 'react';
import { ControllerRenderProps, UseFormReturn } from 'react-hook-form';
import { Node } from 'reactflow';

import { api, appQueryClient } from '../../../../../../../api/api-library';
import { DynamicInput } from '../../../../../../../components/dynamic-input/dynamic-input';
import { Icons } from '../../../../../../../components/icons';
import { MarkdownViewer } from '../../../../../../../components/markdown-viewer';
import { Button } from '../../../../../../../components/ui/button';
import { ComboBox } from '../../../../../../../components/ui/combo-box';
import { DatePicker } from '../../../../../../../components/ui/date-picker';
import { DateRangePicker } from '../../../../../../../components/ui/date-range-picker';
import { DateTimePicker } from '../../../../../../../components/ui/date-time-picker';
import { Form } from '../../../../../../../components/ui/form';
import { Input } from '../../../../../../../components/ui/input';
import { MultiSelect } from '../../../../../../../components/ui/multi-select';
import { Popover } from '../../../../../../../components/ui/popover';
import { Separator } from '../../../../../../../components/ui/separator';
import { Skeleton } from '../../../../../../../components/ui/skeleton';
import { Switch } from '../../../../../../../components/ui/switch';
import { Tabs } from '../../../../../../../components/ui/tabs';
import { Textarea } from '../../../../../../../components/ui/textarea';
import { useToast } from '../../../../../../../hooks/useToast';
import { FieldConfig } from '../../../../../../../models/workflow/input-config-model';
import { cn } from '../../../../../../../utils/cn';
import { CustomInputConfigFormFields } from '../manually-start-trigger-node';

import { ConditionalPathsFormFields } from './conditional-paths-form-fields';
import { ConfigBuilderFormField } from './config-builder-form-field';
import { DecidePathsFormFields } from './decide-paths-form-fields';
import { PercentageSplitsFormFields } from './percentage-splits-form-fields';
import { ResumeExecutionFormField } from './resume-execution-form-field';
import { SharedLabelAndTooltip } from './shared-label-and-tooltip';

export type DynamicFormFieldProps = {
  fieldConfig: FieldConfig;
  form: UseFormReturn<any, any, undefined>;
  formName: string;
  isNestedFieldConfig?: boolean;
  useGroupLabel?: boolean;
  node: Node;
  fieldOverrides: {
    placeholder?: string;
    label?: string;
    hideTooltip?: boolean;
  };
  projectId: string;
  agentId: string | undefined;
  workflowId: string | undefined;
  executionId: string | undefined;
};

export function DynamicFormField({
  fieldConfig,
  form,
  formName,
  isNestedFieldConfig,
  useGroupLabel,
  node,
  fieldOverrides,
  projectId,
  agentId,
  workflowId,
  executionId,
}: DynamicFormFieldProps) {
  const completeFormName = isNestedFieldConfig
    ? `${formName}.${fieldConfig.id}`
    : formName;

  return (
    <Form.Field
      key={completeFormName}
      control={form.control}
      name={completeFormName}
      render={({ field }) => {
        return (
          <DynamicFormItem
            form={form}
            field={field}
            fieldConfig={fieldConfig}
            isNestedFieldConfig={isNestedFieldConfig}
            formName={completeFormName}
            useGroupLabel={useGroupLabel}
            node={node}
            fieldOverrides={fieldOverrides}
            agentId={agentId}
            workflowId={workflowId}
            executionId={executionId}
            projectId={projectId}
          />
        );
      }}
    />
  );
}

export type DynamicFormItemProps = {
  form: DynamicFormFieldProps['form'];
  formName: string;
  fieldConfig: DynamicFormFieldProps['fieldConfig'];
  field: ControllerRenderProps<any, any>;
  isNestedFieldConfig: DynamicFormFieldProps['isNestedFieldConfig'];
  useGroupLabel?: boolean;
  node: Node; //Mostly need this for the trigger/action id and appId properties
  fieldOverrides: DynamicFormFieldProps['fieldOverrides'];
  projectId: string;
  workflowId: string | undefined;
  executionId: string | undefined;
  agentId: string | undefined;
};

function DynamicFormItem({
  formName,
  form,
  field,
  fieldConfig,
  isNestedFieldConfig,
  useGroupLabel,
  node,
  fieldOverrides,
  projectId,
  workflowId,
  executionId,
  agentId,
}: DynamicFormItemProps) {
  const [isLoadingDynamicData, setIsLoadingDynamicData] = useState(false);
  const refreshRef = React.useRef<HTMLButtonElement>(null);

  /**
   * If this matches dependsOnValue, then we don't run the useEffect to set the dependsOnValues
   * This prevents an infinite loop in the use effect.
   */
  const [
    dependsOnChangeHackValueComparison,
    setDependsOnChangeHackValueComparison,
  ] = useState<Record<string, any>>();
  const [dynamicData, setDynamicData] =
    useState<{ label: string; value: string }[]>();
  const connectionId = form.watch('connectionId');

  const dependsOnWatchers = form.watch(
    fieldConfig.loadOptions?.dependsOn?.map
      ? fieldConfig.loadOptions.dependsOn.map((val: any) => val.id ?? val)
      : [''],
  );
  const { toast } = useToast();
  const [dependsOnValues, setDependsOnValues] = useState<Record<string, any>>();

  const loadDynamicData = useCallback(async () => {
    if (!fieldConfig.inputType.includes('dynamic')) {
      return;
    }

    if (!dependsOnValues && fieldConfig.loadOptions?.dependsOn) {
      //Depends on values will only be set if they're all set.
      return;
    }

    setIsLoadingDynamicData(true);
    try {
      const appId = node.data.appId;
      const actionId = node.data.actionId;
      const triggerId = node.data.triggerId;

      let selectOptions: { label: string; value: string }[] | undefined =
        undefined;

      if ((connectionId || !node.data.needsConnection) && appId) {
        if (actionId || triggerId) {
          selectOptions = await appQueryClient.fetchQuery({
            queryKey: [
              'workflow-apps',
              'retrieveDynamicValues',
              {
                fieldId: formName, //used to be field.id but nested fields need to pass in everything properties.0.field instead of just field
                connectionId: connectionId,
                appId: appId,
                actionId: actionId,
                triggerId: triggerId,
                workflowId,
                agentId,
              },
            ],
            queryFn: async () => {
              if (projectId) {
                const response = actionId
                  ? await api.workflowApps.retrieveActionDynamicValues({
                      actionId,
                      projectId,
                      workflowId,
                      agentId,
                      appId,
                      data: {
                        fieldId: formName, //used to be field.id but nested fields need to pass in everything properties.0.field instead of just field
                        connectionId: connectionId,
                      },
                      extraOptions: { ...dependsOnValues },
                    })
                  : await api.workflowApps.retrieveTriggerDynamicValues({
                      triggerId,
                      projectId,
                      workflowId,
                      agentId,
                      appId: appId,
                      data: {
                        fieldId: formName, //used to be field.id but nested fields need to pass in everything properties.0.field instead of just field
                        connectionId: connectionId,
                      },
                      extraOptions: { ...dependsOnValues },
                    });
                if (response.data) {
                  return response.data;
                } else {
                  throw response.error;
                }
              } else {
                return [];
              }
            },
          });
        }
      }
      setDynamicData(selectOptions);
    } catch (error: any) {
      toast({
        title: 'Error loading dynamic data',
        description: error,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDynamicData(false);
    }
  }, [
    fieldConfig.inputType,
    fieldConfig.loadOptions?.dependsOn,
    dependsOnValues,
    node.data.appId,
    node.data.actionId,
    node.data.triggerId,
    node.data.needsConnection,
    connectionId,
    formName,
    workflowId,
    agentId,
    projectId,
    toast,
  ]);

  const hasVariableReferences = useMemo(() => {
    if (node.data.value && formName && node.data.value[formName]) {
      const fieldValueFromNode = node.data.value[formName]; //Already parsed

      return (
        JSON.stringify(fieldValueFromNode).includes('={{') &&
        JSON.stringify(fieldValueFromNode).includes('}}')
      );
    }
  }, [formName, node.data.value]);

  const DynamicRefreshButton = useMemo(() => {
    return (
      (connectionId || !node.data.needsConnection) &&
      !executionId && (
        <Button
          variant="ghost"
          size="sm"
          ref={refreshRef}
          className={cn('text-muted-foreground text-xs', {
            hidden: fieldConfig?.loadOptions?.hideRefreshButton,
          })}
          loading={isLoadingDynamicData}
          type="button"
          onClick={async () => {
            const appId = node.data.appId;
            const actionId = node.data.actionId;
            const triggerId = node.data.triggerId;

            setIsLoadingDynamicData(true);
            await appQueryClient.invalidateQueries({
              queryKey: [
                'workflow-apps',
                'retrieveDynamicValues',
                {
                  fieldId: fieldConfig.id,
                  connectionId: connectionId,
                  appId: appId,
                  actionId: actionId,
                  triggerId: triggerId,
                  workflowId,
                  agentId,
                },
              ],
            });
            loadDynamicData();
          }}
        >
          Refresh
        </Button>
      )
    );
  }, [
    agentId,
    connectionId,
    executionId,
    fieldConfig.id,
    fieldConfig?.loadOptions?.hideRefreshButton,
    isLoadingDynamicData,
    loadDynamicData,
    node.data.actionId,
    node.data.appId,
    node.data.needsConnection,
    node.data.triggerId,
    workflowId,
  ]);

  const DynamicField = useCallback(
    ({
      fieldConfig,
      field,
      formName,
      hasVariableReferences,
      readOnly,
    }: {
      fieldConfig: FieldConfig;
      field: ControllerRenderProps<any, any>;
      formName: string;
      hasVariableReferences?: boolean;
      readOnly: boolean;
    }) => {
      if (fieldConfig.loadOptions?.executionOnly && !executionId) {
        return null;
      } else if (fieldConfig.loadOptions?.workflowOnly && !workflowId) {
        return null;
      }

      switch (fieldConfig.inputType) {
        case 'text': {
          return (
            <Form.Item>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Form.Control>
                <DynamicInput
                  projectId={projectId}
                  onChange={field.onChange}
                  defaultValue={field.value}
                  required={
                    !!form.register(formName, {
                      required: !!fieldConfig.required && !agentId,
                    }).required
                  }
                  placeholder={
                    fieldOverrides.placeholder ?? fieldConfig.placeholder
                  }
                  node={node}
                  readOnly={readOnly}
                  agentId={agentId}
                />
              </Form.Control>
              <Form.Message />
            </Form.Item>
          );
        }
        case 'number': {
          return (
            <Tabs defaultValue={hasVariableReferences ? 'custom' : 'number'}>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  className="mb-1"
                  description={fieldConfig.description}
                  label={fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Tabs.List
                className={cn({
                  hidden: fieldConfig.hideCustomTab,
                })}
              >
                <Tabs.Trigger value="number" className="text-xs">
                  Number
                </Tabs.Trigger>
                <Tabs.Trigger value="custom" className="text-xs">
                  Custom
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="number">
                <Form.Item>
                  <Form.Control>
                    <Input
                      onChange={field.onChange}
                      type="number"
                      min={fieldConfig.numberOptions?.min}
                      max={fieldConfig.numberOptions?.max}
                      step={fieldConfig.numberOptions?.step}
                      defaultValue={field.value}
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                          valueAsNumber: true,
                          max: fieldConfig.numberOptions?.max,
                          min: fieldConfig.numberOptions?.min,
                        }).required
                      }
                      placeholder={
                        hasVariableReferences
                          ? 'Custom Value'
                          : (fieldOverrides.placeholder ??
                            fieldConfig.placeholder)
                      }
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
              <Tabs.Content value="custom">
                <Form.Item>
                  <Form.Control>
                    <DynamicInput
                      projectId={projectId}
                      onChange={field.onChange}
                      defaultValue={
                        Number(field.value)
                          ? `${Number(field.value)}`
                          : field.value
                      }
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                          valueAsNumber: true,
                        }).required
                      }
                      placeholder={
                        fieldOverrides.placeholder ?? fieldConfig.placeholder
                      }
                      node={node}
                      readOnly={readOnly}
                      agentId={agentId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
            </Tabs>
          );
        }
        case 'file': {
          return (
            <Tabs defaultValue={'custom'}>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  className="mb-1"
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Tabs.List
                className={cn({
                  hidden: fieldConfig.hideCustomTab,
                })}
              >
                {/* <Tabs.Trigger value="file" className="text-xs">
                  File
                </Tabs.Trigger> */}
                <Tabs.Trigger value="custom" className="text-xs">
                  File URL
                </Tabs.Trigger>
              </Tabs.List>
              {/* <Tabs.Content value="file">
                <Form.Item>
                  <Form.Control>
                    <ImageUpload />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content> */}
              <Tabs.Content value="custom">
                <Form.Item>
                  <Form.Control>
                    <DynamicInput
                      projectId={projectId}
                      onChange={field.onChange}
                      defaultValue={field.value}
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      placeholder={
                        fieldOverrides.placeholder ?? fieldConfig.placeholder
                      }
                      node={node}
                      readOnly={readOnly}
                      agentId={agentId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
            </Tabs>
          );
        }
        case 'date-time': {
          return (
            <Tabs defaultValue={hasVariableReferences ? 'custom' : 'date'}>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  className="mb-1"
                  description={fieldConfig.description}
                  label={fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Tabs.List
                className={cn({
                  hidden: fieldConfig.hideCustomTab,
                })}
              >
                <Tabs.Trigger value="date" className="text-xs">
                  Date & Time
                </Tabs.Trigger>
                <Tabs.Trigger value="custom" className="text-xs">
                  Custom
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="date">
                <Form.Item>
                  <Form.Control>
                    <DateTimePicker
                      required={
                        form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      value={
                        isValid(new Date(field.value))
                          ? new Date(field.value)
                          : undefined
                      }
                      placeholder={
                        field.value
                          ? isValid(new Date(field.value))
                            ? 'Valid date'
                            : 'Invalid date'
                          : 'Pick a date'
                      }
                      hourCycle={12}
                      granularity="minute"
                      onChange={(date) => field.onChange(date)}
                      disabled={!!executionId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
              <Tabs.Content value="custom">
                <Form.Item>
                  <Form.Control>
                    <DynamicInput
                      projectId={projectId}
                      onChange={field.onChange}
                      defaultValue={
                        isValid(new Date(field.value))
                          ? new Date(field.value).toISOString()
                          : field.value
                      }
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      placeholder="Enter valid date (ISO String)"
                      node={node}
                      readOnly={readOnly}
                      agentId={agentId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
            </Tabs>
          );
        }
        case 'date': {
          return (
            <Tabs defaultValue={hasVariableReferences ? 'custom' : 'date'}>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  className="mb-1"
                  description={fieldConfig.description}
                  label={fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Tabs.List
                className={cn({
                  hidden: fieldConfig.hideCustomTab,
                })}
              >
                <Tabs.Trigger value="date" className="text-xs">
                  Date
                </Tabs.Trigger>
                <Tabs.Trigger value="custom" className="text-xs">
                  Custom
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="date">
                <Form.Item>
                  <Form.Control>
                    <DatePicker
                      required={
                        form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      value={
                        isValid(new Date(field.value))
                          ? new Date(field.value)
                          : undefined
                      }
                      placeholder={
                        field.value
                          ? isValid(new Date(field.value))
                            ? 'Valid date'
                            : 'Invalid date'
                          : 'Pick a date'
                      }
                      onChange={(date) => field.onChange(date)}
                      disabled={!!executionId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
              <Tabs.Content value="custom">
                <Form.Item>
                  <Form.Control>
                    <DynamicInput
                      projectId={projectId}
                      onChange={field.onChange}
                      defaultValue={
                        isValid(new Date(field.value))
                          ? field.value.toString()
                          : field.value
                      }
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      placeholder="Enter valid date (ISO String)"
                      node={node}
                      readOnly={readOnly}
                      agentId={agentId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
            </Tabs>
          );
        }
        case 'date-range': {
          return (
            <Tabs defaultValue={hasVariableReferences ? 'custom' : 'date'}>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  className="mb-1"
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Tabs.List
                className={cn({
                  hidden: fieldConfig.hideCustomTab,
                })}
              >
                <Tabs.Trigger value="date" className="text-xs">
                  Date
                </Tabs.Trigger>
                <Tabs.Trigger value="custom" className="text-xs">
                  Custom
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="date">
                <Form.Item>
                  <Form.Control>
                    <DateRangePicker
                      required={
                        form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      value={
                        isValid(new Date(field.value?.from)) //At least need from for range
                          ? {
                              from: isValid(new Date(field.value.from))
                                ? new Date(field.value.from)
                                : undefined,
                              to: isValid(new Date(field.value?.to))
                                ? new Date(field.value.to)
                                : undefined,
                            }
                          : undefined
                      }
                      placeholder={
                        field.value?.from
                          ? isValid(new Date(field.value?.from))
                            ? 'Valid date'
                            : 'Invalid date'
                          : 'Pick a date'
                      }
                      onChange={(date) => field.onChange(date)}
                      disabled={!!executionId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
              <Tabs.Content value="custom">
                <Form.Item>
                  <Form.Control>
                    <DynamicInput
                      projectId={projectId}
                      onChange={field.onChange}
                      defaultValue={
                        field.value?.from
                          ? field.value.to
                            ? `${
                                field.value.from
                                  ? format(field.value.from, 'LLL dd, y')
                                  : ''
                              } - ${
                                field.value.to
                                  ? format(field.value.to, 'LLL dd, y')
                                  : ''
                              }`
                            : format(field.value.from, 'LLL dd, y')
                          : JSON.stringify(field.value)
                      }
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      placeholder={
                        fieldOverrides.placeholder ?? fieldConfig.placeholder
                      }
                      node={node}
                      readOnly={readOnly}
                      agentId={agentId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
            </Tabs>
          );
        }
        case 'select': {
          form.register(formName, {
            required: !!fieldConfig.required && !agentId,
          });

          if (!fieldConfig.selectOptions) {
            if (fieldConfig.loadOptions?.dependsOn) {
              fieldConfig.selectOptions = [];
            } else {
              throw new Error(
                `selectOptions is required for select field type in inputConfig for ${fieldConfig.id}`,
              );
            }
          }

          let selectedItem: undefined | { value: string; label: string } =
            undefined;

          if (field.value != null) {
            if (executionId) {
              //If it's an execution, we need to show the value even if it doesn't exist anymore
              selectedItem = {
                value: field.value,
                label: JSON.stringify(field.value),
              };
            } else {
              selectedItem = fieldConfig.selectOptions?.find(
                (option) => option.value === field.value,
              );

              if (!selectedItem) {
                selectedItem = {
                  value: field.value,
                  label: "This option doesn't exist",
                };
              }
            }
          }

          const placeholder =
            fieldOverrides.placeholder ??
            fieldConfig.placeholder ??
            'Select an option';

          return (
            <Tabs defaultValue={hasVariableReferences ? 'custom' : 'options'}>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  className="mb-1"
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Tabs.List
                className={cn({
                  hidden: fieldConfig.hideCustomTab,
                })}
              >
                <Tabs.Trigger value="options" className="text-xs">
                  Options
                </Tabs.Trigger>
                <Tabs.Trigger value="custom" className="text-xs">
                  Custom
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="options">
                <Form.Item>
                  <Form.Control>
                    <ComboBox
                      dropdownWidthMatchesButton
                      fallbackLabel={placeholder}
                      disabled={!!executionId}
                      className="w-full flex justify-between"
                      toggle
                      searchable={true}
                      items={fieldConfig.selectOptions}
                      defaultSelectedItem={selectedItem}
                      onChange={(item) => field.onChange(item)}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
              <Tabs.Content value="custom">
                <Form.Item>
                  <Form.Control>
                    <DynamicInput
                      projectId={projectId}
                      onChange={field.onChange}
                      defaultValue={field.value}
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      placeholder={
                        fieldOverrides.placeholder ?? fieldConfig.placeholder
                      }
                      node={node}
                      readOnly={readOnly}
                      agentId={agentId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
            </Tabs>
          );
        }
        case 'dynamic-select': {
          form.register(formName, {
            required: !!fieldConfig.required && !agentId,
          });

          let selectedItem: undefined | { value: string; label: string } =
            undefined;

          if (
            field.value != null &&
            (connectionId || !node.data.needsConnection)
          ) {
            if (executionId) {
              //If it's an execution, we need to show the value even if it doesn't exist anymore
              selectedItem = {
                value: field.value,
                label: JSON.stringify(field.value),
              };
            } else if (dynamicData) {
              selectedItem = [
                ...dynamicData,
                ...(fieldConfig.selectOptions ?? []),
              ].find((option) => option.value === field.value);

              if (!selectedItem) {
                selectedItem = {
                  value: field.value,
                  label: "This option doesn't exist",
                };
              }
            }
          }

          const placeholder =
            fieldOverrides.placeholder ??
            fieldConfig.placeholder ??
            'Select an option';

          return (
            <Tabs defaultValue={hasVariableReferences ? 'custom' : 'options'}>
              <div
                className={cn({
                  'flex justify-between items-end': fieldConfig.hideCustomTab,
                })}
              >
                {(!useGroupLabel || isNestedFieldConfig) && (
                  <SharedLabelAndTooltip
                    required={!!fieldConfig.required && !agentId}
                    className="mb-1"
                    description={fieldConfig.description}
                    label={fieldOverrides.label ?? fieldConfig.label}
                    hideTooltip={fieldOverrides.hideTooltip}
                    small={isNestedFieldConfig}
                    requiredForAgent={agentId ? false : undefined}
                  />
                )}
                <div className="flex justify-between items-end">
                  <Tabs.List
                    className={cn({
                      hidden: fieldConfig.hideCustomTab,
                    })}
                  >
                    <Tabs.Trigger value="options" className="text-xs">
                      Options
                    </Tabs.Trigger>
                    <Tabs.Trigger value="custom" className="text-xs">
                      Custom
                    </Tabs.Trigger>
                  </Tabs.List>
                  {DynamicRefreshButton}
                </div>
              </div>
              <Tabs.Content value="options">
                <Form.Item>
                  {dynamicData === undefined && !isLoadingDynamicData ? (
                    <ComboBox
                      dropdownWidthMatchesButton
                      toggle
                      fallbackLabel={
                        !connectionId && node.data.needsConnection
                          ? 'Select a connection to load options'
                          : placeholder
                      }
                      disabled={!!executionId}
                      className="w-full flex justify-between"
                      searchable={false}
                      items={[]}
                      defaultSelectedItem={selectedItem}
                      onChange={(item) => field.onChange(item)}
                    />
                  ) : (
                    <Form.Control>
                      {isLoadingDynamicData ? (
                        <Skeleton className="h-9" />
                      ) : (
                        <div className="flex">
                          <ComboBox
                            toggle
                            dropdownWidthMatchesButton
                            fallbackLabel={placeholder}
                            disabled={!!executionId}
                            className="w-full flex justify-between"
                            searchable={true}
                            items={[
                              ...(fieldConfig.selectOptions ?? []),
                              ...(dynamicData ?? []),
                            ]}
                            defaultSelectedItem={selectedItem}
                            onChange={(item) => field.onChange(item)}
                          />
                        </div>
                      )}
                    </Form.Control>
                  )}
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
              <Tabs.Content value="custom">
                <Form.Item>
                  <Form.Control>
                    <DynamicInput
                      projectId={projectId}
                      onChange={field.onChange}
                      defaultValue={field.value}
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      placeholder={
                        fieldOverrides.placeholder ?? fieldConfig.placeholder
                      }
                      node={node}
                      readOnly={readOnly}
                      agentId={agentId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
            </Tabs>
          );
        }
        case 'multi-select': {
          if (!fieldConfig.selectOptions) {
            if (fieldConfig.loadOptions?.dependsOn) {
              fieldConfig.selectOptions = [];
            } else {
              throw new Error(
                `selectOptions is required for multi-select field type in inputConfig for ${fieldConfig.id}`,
              );
            }
          }

          return (
            <Tabs defaultValue={hasVariableReferences ? 'custom' : 'options'}>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  className="mb-1"
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Tabs.List
                className={cn({
                  hidden: fieldConfig.hideCustomTab,
                })}
              >
                <Tabs.Trigger value="options" className="text-xs">
                  Options
                </Tabs.Trigger>
                <Tabs.Trigger value="custom" className="text-xs">
                  Custom
                </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="options">
                <Form.Item>
                  <Form.Control>
                    <MultiSelect
                      items={fieldConfig.selectOptions}
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      value={field.value}
                      onChange={(items) => field.onChange(items)}
                      placeholder={
                        fieldOverrides.placeholder ?? fieldConfig.placeholder
                      }
                      disabled={!!executionId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
              <Tabs.Content value="custom">
                <Form.Item>
                  <Form.Control>
                    <DynamicInput
                      projectId={projectId}
                      onChange={field.onChange}
                      defaultValue={
                        field.value != null
                          ? JSON.stringify(field.value)
                          : undefined
                      }
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      placeholder={
                        fieldOverrides.placeholder ?? fieldConfig.placeholder
                      }
                      node={node}
                      readOnly={readOnly}
                      agentId={agentId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
            </Tabs>
          );
        }
        case 'dynamic-multi-select': {
          return (
            <Tabs defaultValue={hasVariableReferences ? 'custom' : 'options'}>
              <div
                className={cn({
                  'flex justify-between items-end': fieldConfig.hideCustomTab,
                })}
              >
                {(!useGroupLabel || isNestedFieldConfig) && (
                  <SharedLabelAndTooltip
                    required={!!fieldConfig.required && !agentId}
                    className="mb-1"
                    description={fieldConfig.description}
                    label={fieldOverrides.label ?? fieldConfig.label}
                    hideTooltip={fieldOverrides.hideTooltip}
                    small={isNestedFieldConfig}
                    requiredForAgent={agentId ? false : undefined}
                  />
                )}
                <div className="flex justify-between items-end">
                  <Tabs.List
                    className={cn({
                      hidden: fieldConfig.hideCustomTab,
                    })}
                  >
                    <Tabs.Trigger value="options" className="text-xs">
                      Options
                    </Tabs.Trigger>
                    <Tabs.Trigger value="custom" className="text-xs">
                      Custom
                    </Tabs.Trigger>
                  </Tabs.List>
                  {DynamicRefreshButton}
                </div>
              </div>
              <Tabs.Content value="options">
                <Form.Item>
                  {dynamicData === undefined && !isLoadingDynamicData ? (
                    <ComboBox
                      dropdownWidthMatchesButton
                      toggle
                      fallbackLabel={
                        !connectionId && node.data.needsConnection
                          ? 'Select a connection to load options'
                          : 'No options'
                      }
                      disabled={!!executionId}
                      className="w-full flex justify-between"
                      searchable={false}
                      items={[]}
                      onChange={(item) => field.onChange(item)}
                    />
                  ) : (
                    <Form.Control>
                      {isLoadingDynamicData ? (
                        <Skeleton className="h-9" />
                      ) : (
                        <MultiSelect
                          items={dynamicData!}
                          required={
                            !!form.register(formName, {
                              required: !!fieldConfig.required && !agentId,
                            }).required
                          }
                          value={field.value}
                          onChange={(items) => field.onChange(items)}
                          placeholder={
                            fieldOverrides.placeholder ??
                            fieldConfig.placeholder
                          }
                          disabled={!!executionId}
                        />
                      )}
                    </Form.Control>
                  )}
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
              <Tabs.Content value="custom">
                <Form.Item>
                  <Form.Control>
                    <DynamicInput
                      projectId={projectId}
                      onChange={field.onChange}
                      defaultValue={
                        field.value != null
                          ? JSON.stringify(field.value)
                          : undefined
                      }
                      required={
                        !!form.register(formName, {
                          required: !!fieldConfig.required && !agentId,
                        }).required
                      }
                      placeholder={
                        fieldOverrides.placeholder ?? fieldConfig.placeholder
                      }
                      node={node}
                      readOnly={readOnly}
                      agentId={agentId}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              </Tabs.Content>
            </Tabs>
          );
        }
        case 'switch': {
          if (!fieldConfig.switchOptions) {
            throw new Error(
              `switchOptions is required for switch field type in inputConfig for ${fieldConfig.id}`,
            );
          }

          let checked: boolean = fieldConfig.switchOptions.defaultChecked;
          if (field.value != null) {
            checked = field.value === fieldConfig.switchOptions.checked;
          }

          let value;
          if (field.value != null) {
            value = field.value;
          } else {
            value = fieldConfig.switchOptions.defaultChecked
              ? fieldConfig.switchOptions.checked
              : fieldConfig.switchOptions.unchecked;
          }

          return (
            <Form.Item>
              <Form.Control>
                <div className="flex items-center space-x-2">
                  <Switch
                    className="ml-1"
                    onCheckedChange={(e) => {
                      return field.onChange(
                        e
                          ? fieldConfig.switchOptions!.checked
                          : fieldConfig.switchOptions!.unchecked,
                      );
                    }}
                    {...form.register(formName)}
                    checked={checked}
                    value={value}
                    disabled={!!executionId}
                  />
                  {(!useGroupLabel || isNestedFieldConfig) && (
                    <SharedLabelAndTooltip
                      required={!!fieldConfig.required && !agentId}
                      description={fieldConfig.description}
                      label={fieldOverrides.label ?? fieldConfig.label}
                      hideTooltip={fieldOverrides.hideTooltip}
                      small={isNestedFieldConfig}
                      requiredForAgent={agentId ? false : undefined}
                    />
                  )}
                </div>
              </Form.Control>
              <Form.Message />
            </Form.Item>
          );
        }
        case 'map': {
          return (
            <Form.Item>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  /**
                   * Map is a special case where an agent can't fill it out.
                   * To avoid any confusion, we'll always make it required for an agent.
                   * There may be cases where a map field is optional. But so far,
                   * we only use map fields for when occurence type if "dynamic" and always required.
                   */
                  required={!!fieldConfig.required}
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? true : undefined}
                />
              )}
              <Form.Control>
                <div className="flex space-x-1 items-start">
                  <DynamicInput
                    projectId={projectId}
                    className="w-full flex-1"
                    onChange={(key: any) => {
                      field.onChange({
                        key,
                        value: field.value?.['value'],
                        //So node-utils calculateValueFromRaw can identify the nested tiptap content
                        objectType: 'lecca-io-map',
                      });
                    }}
                    defaultValue={field.value?.key}
                    required={
                      !!form.register(formName, {
                        /**
                         * Map is a special case where an agent can't fill it out.
                         * To avoid any confusion, we'll always make it required for an agent.
                         * There may be cases where a map field is optional. But so far,
                         * we only use map fields for when occurence type if "dynamic" and always required.
                         */
                        required: !!fieldConfig.required || !!agentId,
                      }).required
                    }
                    placeholder={
                      fieldConfig.mapOptions?.keyPlaceholder ?? 'Add a key'
                    }
                    node={node}
                    readOnly={
                      !!executionId || fieldConfig.mapOptions?.disableKeyInput
                    }
                    agentId={agentId}
                  />
                  <DynamicInput
                    projectId={projectId}
                    className="w-full flex-1 "
                    onChange={(value: any) => {
                      field.onChange({
                        key: field.value?.['key'],
                        value,
                        //So node-utils calculateValueFromRaw can identify the nested tiptap content
                        objectType: 'lecca-io-map',
                      });
                    }}
                    defaultValue={field.value?.value}
                    required={
                      !!form.register(formName, {
                        required: !!fieldConfig.required || !!agentId,
                      }).required
                    }
                    placeholder={
                      fieldConfig.mapOptions?.valuePlaceholder ?? 'Add a value'
                    }
                    node={node}
                    readOnly={
                      !!executionId || fieldConfig.mapOptions?.disableValueInput
                    }
                    agentId={agentId}
                  />
                </div>
              </Form.Control>
              <Form.Description>
                {agentId && (
                  <div className="text-xs text-muted-foreground">
                    Agent's can't fill out this field. You must provide all
                    values. Consider building a workflow instead.
                  </div>
                )}
              </Form.Description>
              <Form.Message />
            </Form.Item>
          );
        }
        case 'markdown': {
          return (
            <Form.Item>
              <Form.Control>
                <MarkdownViewer className="leading-tight text-muted-foreground ">
                  {fieldConfig.markdown}
                </MarkdownViewer>
              </Form.Control>
            </Form.Item>
          );
        }
        case 'decide-paths': {
          return (
            <DecidePathsFormFields
              node={node}
              form={form}
              projectId={projectId}
              fieldConfig={fieldConfig}
              readonly={readOnly}
              agentId={agentId}
            />
          );
        }
        case 'resume-execution': {
          if (executionId) {
            return <ResumeExecutionFormField node={node} form={form} />;
          } else {
            return null;
          }
        }
        case 'conditional-paths': {
          return (
            <ConditionalPathsFormFields
              node={node}
              form={form}
              fieldConfig={fieldConfig}
              readonly={readOnly}
              projectId={projectId}
              agentId={agentId}
            />
          );
        }
        case 'percentage-splits': {
          return (
            <PercentageSplitsFormFields
              node={node}
              form={form}
              fieldConfig={fieldConfig}
              readonly={readOnly}
              projectId={projectId}
              agentId={agentId}
            />
          );
        }
        case 'config-builder': {
          return (
            <Form.Item key={workflowId}>
              <Form.Control>
                <ConfigBuilderFormField
                  readonly={readOnly}
                  form={form}
                  node={node}
                />
              </Form.Control>
              <Form.Message />
            </Form.Item>
          );
        }
        case 'dynamic-input-config': {
          if (dynamicData == null || dynamicData.length === 0) {
            return null;
          }

          return (
            <div className="flex flex-col">
              <div className={cn('flex justify-between mb-1')}>
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  className="mb-1"
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? true : undefined}
                />
                {DynamicRefreshButton}
              </div>
              <div
                className={cn('flex flex-col justify-start w-full space-y-4', {
                  'bg-muted/30 border p-3 rounded-md': dynamicData?.length,
                })}
              >
                {dynamicData?.map((fieldConfig: unknown, index) => {
                  const customFieldConfig = fieldConfig as FieldConfig;
                  const customFormName = `${formName}.${customFieldConfig.id}`;

                  if (customFieldConfig.required && !agentId) {
                    customFieldConfig.description = `This field is required.`;
                  } else {
                    customFieldConfig.description = `This field is optional.`;
                  }

                  const customHasVariableReferences =
                    JSON.stringify(
                      node.data.value?.[formName]?.[customFieldConfig.id],
                    )?.includes?.('={{') &&
                    JSON.stringify(
                      node.data?.value?.[formName]?.[customFieldConfig.id],
                    )?.includes?.('}}');

                  const fieldValue = form.getValues(customFormName);
                  if (fieldValue == null) {
                    //If the value is null, set it to the customFieldConfig.default if it exists
                    if (customFieldConfig.defaultValue != null) {
                      form.setValue(
                        customFormName,
                        customFieldConfig.defaultValue,
                      );
                    }
                  }

                  return (
                    <>
                      <Form.Field
                        key={customFieldConfig.id}
                        control={form.control}
                        name={customFormName}
                        render={({ field }) => {
                          return (
                            <DynamicField
                              formName={customFormName}
                              key={customFieldConfig.id}
                              fieldConfig={customFieldConfig}
                              field={field}
                              hasVariableReferences={
                                customHasVariableReferences
                              }
                              readOnly={readOnly}
                            />
                          );
                        }}
                      />
                      {index < dynamicData.length - 1 && <Separator />}
                    </>
                  );
                })}
              </div>
            </div>
          );
        }
        case 'static-input-config': {
          const customInputConfig = node.data.value?.['customInputConfig'] as
            | FieldConfig[]
            | undefined;

          if (customInputConfig == null || !customInputConfig.length) {
            return null;
          }

          if (executionId == null) {
            return null;
          }

          const idPrefix = `customInputConfigValues`;

          customInputConfig.forEach((customFieldConfig) => {
            const customFormName = `${idPrefix}.${customFieldConfig.id}`;
            const fieldValue = form.getValues(customFormName);
            if (fieldValue == null) {
              //If the value is null, set it to the customFieldConfig.default if it exists
              if (customFieldConfig.defaultValue != null) {
                form.setValue(customFormName, customFieldConfig.defaultValue);
              }
            }
          });

          return (
            <div className="flex flex-col">
              <div className={cn('flex justify-between mb-1')}>
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  className="mb-1"
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? true : undefined}
                />
                {DynamicRefreshButton}
              </div>
              <div
                className={cn('flex flex-col justify-start w-full space-y-4', {
                  'bg-muted/30 border p-3 rounded-md':
                    customInputConfig?.length,
                })}
              >
                <CustomInputConfigFormFields
                  customInputConfig={customInputConfig as FieldConfig[]}
                  form={form}
                  idPrefix={idPrefix}
                />
              </div>
            </div>
          );
        }
        case 'dynamic-workflow-webhook-url': {
          /**
           * You can't actually update this field, it's just so the server
           * can send data that the client can copy to clipboard.
           */

          return (
            <Form.Item key={workflowId}>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                />
              )}
              <Form.Control>
                {isLoadingDynamicData ? (
                  <Skeleton className="h-9" />
                ) : (
                  <div className="flex space-x-1 items-center">
                    <Textarea
                      value={dynamicData?.[0]?.value ?? ''}
                      readOnly={true}
                      className="resize-none !border-none !outline-0 !ring-0 bg-muted"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-1.5 py-4"
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          dynamicData?.[0]?.value ?? '',
                        );
                      }}
                    >
                      <Icons.copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </Form.Control>
              <Form.Message />
            </Form.Item>
          );
        }
        case 'json': {
          return (
            <Form.Item>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Form.Control>
                <DynamicInput
                  projectId={projectId}
                  onChange={field.onChange}
                  defaultValue={field.value}
                  required={
                    !!form.register(formName, {
                      required: !!fieldConfig.required && !agentId,
                    }).required
                  }
                  placeholder={
                    fieldOverrides.placeholder ?? fieldConfig.placeholder
                  }
                  node={node}
                  readOnly={readOnly}
                  agentId={agentId}
                />
              </Form.Control>
              <Form.Description className="text-xs ml-1">
                Will be parsed as JSON.
                <Popover>
                  <Popover.Trigger className="ml-1 text-blue-500">
                    Learn more
                  </Popover.Trigger>
                  <Popover.Content className="p-4 text-sm">
                    We will attempt to parse the value as JSON. However, if it
                    is not valid JSON, we will return the value as a string.
                  </Popover.Content>
                </Popover>
                .
              </Form.Description>
              <Form.Message />
            </Form.Item>
          );
        }
        case 'code': {
          return (
            <Form.Item>
              {(!useGroupLabel || isNestedFieldConfig) && (
                <SharedLabelAndTooltip
                  required={!!fieldConfig.required && !agentId}
                  description={fieldConfig.description}
                  label={fieldOverrides.label ?? fieldConfig.label}
                  hideTooltip={fieldOverrides.hideTooltip}
                  small={isNestedFieldConfig}
                  requiredForAgent={agentId ? false : undefined}
                />
              )}
              <Form.Control>
                <DynamicInput
                  projectId={projectId}
                  onChange={field.onChange}
                  defaultValue={field.value}
                  required={
                    !!form.register(formName, {
                      required: !!fieldConfig.required && !agentId,
                    }).required
                  }
                  placeholder={
                    fieldOverrides.placeholder ?? fieldConfig.placeholder
                  }
                  node={node}
                  readOnly={readOnly}
                  agentId={agentId}
                />
              </Form.Control>
              <Form.Message />
            </Form.Item>
          );
        }
        default:
          throw new Error(
            `${fieldConfig.inputType} is not a valid field type. Add it to dynamic-form-field.tsx`,
          );
      }
    },
    [
      DynamicRefreshButton,
      agentId,
      connectionId,
      dynamicData,
      executionId,
      fieldOverrides.hideTooltip,
      fieldOverrides.label,
      fieldOverrides.placeholder,
      form,
      isLoadingDynamicData,
      isNestedFieldConfig,
      node,
      projectId,
      useGroupLabel,
      workflowId,
    ],
  );

  const RenderDynamicField = useMemo(() => {
    return DynamicField({
      fieldConfig: fieldConfig,
      field: field,
      formName,
      hasVariableReferences,
      readOnly: !!executionId,
    });
  }, [
    DynamicField,
    executionId,
    field,
    fieldConfig,
    formName,
    hasVariableReferences,
  ]);

  useEffect(() => {
    if (fieldConfig.loadOptions?.dependsOn) {
      const tempDependsOnValues: Record<string, any> = {};
      let allValuesSet = true;

      dependsOnWatchers.forEach((watcherValue, index) => {
        if (!watcherValue) {
          allValuesSet = false;
          return false;
        }

        const dependsOnItem = fieldConfig.loadOptions!.dependsOn[index];
        if ((dependsOnItem as any).value) {
          //Check if the value matches the watcherValue
          if (
            JSON.stringify((dependsOnItem as any).value) !==
            JSON.stringify(watcherValue)
          ) {
            allValuesSet = false;
            return false;
          }
        }

        tempDependsOnValues[(dependsOnItem as any)?.id ?? dependsOnItem] =
          watcherValue;

        return true;
      });

      if (
        allValuesSet &&
        JSON.stringify(tempDependsOnValues) !==
          JSON.stringify(dependsOnChangeHackValueComparison)
      ) {
        setDependsOnChangeHackValueComparison(tempDependsOnValues);
        setDependsOnValues(tempDependsOnValues);

        if (dynamicData && fieldConfig.loadOptions?.forceRefresh) {
          //Only forcing after dynamic data has been loaded. This prevents the refresh from overriding the values before the dynamic data is loaded
          //If you remove dynamicData, then the saved values will always be overwritten since refresh click will reset the values.

          setTimeout(() => {
            refreshRef.current?.click();
          }, 100); //Keep this at 100. Since we're using react strict mode, if it's set to 0, it won't work in production
        }
      } else if (
        !allValuesSet &&
        JSON.stringify(tempDependsOnValues) !==
          JSON.stringify(dependsOnChangeHackValueComparison)
      ) {
        setDependsOnChangeHackValueComparison(undefined);
        setDependsOnValues(undefined);
      }
    }
  }, [
    dependsOnChangeHackValueComparison,
    dependsOnValues,
    dependsOnWatchers,
    dynamicData,
    fieldConfig.loadOptions,
    fieldConfig.loadOptions?.dependsOn,
  ]);

  useEffect(() => {
    loadDynamicData();
  }, [loadDynamicData, connectionId]);

  if (!dependsOnValues && fieldConfig.loadOptions?.dependsOn) return null;

  return RenderDynamicField;
}

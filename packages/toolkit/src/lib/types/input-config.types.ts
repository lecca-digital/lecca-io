import { ConnectionData } from './connection.types';
import { InjectedServices } from './services.types';

export const INPUT_TYPES = [
  'text',
  'file',
  'select',
  'dynamic-select',
  'date',
  'date-time',
  'date-range',
  'multi-select',
  'dynamic-multi-select',
  'switch',
  'number',
  'json',
  'map',
  'code',

  // markdown is a special input type that is used to render markdown
  'markdown',

  // A unique input that lets the user create conditional paths dictated by the edges connected to the node.
  'conditional-paths',

  // A unique input that lets the user create A/B test paths with percentage splits.
  'ab-test-paths',

  //Similar to conditional-paths, but an action must be selected by a user or AI.
  'decide-paths',

  //A blank field that just sets a boolean value to true on the form so that it will run the execution when Resume is pressed
  'resume-execution',

  // A unique input type that is used to render a config builder. Only used for manual trigger at the moment.
  'config-builder',

  // A unique input type that returns a dynamic input config. Retrieves values from the workflow trigger's config-builder input
  'dynamic-input-config',
  // A unique input type similar to dynamic-input-config, but this one uses the config-builder properties of that exist on the same inputConfig
  'static-input-config',

  // special input that just allows the server to send value that the client can copy
  // Must be be an array with { label, value} even though the first value is the only one used
  'dynamic-workflow-webhook-url',
] as const;
export type InputType = (typeof INPUT_TYPES)[number];

export const OCCURENCE_TYPES = ['single', 'multiple', 'dynamic'] as const;
export type OccurenceType = (typeof OCCURENCE_TYPES)[number];

export type SelectOptions = {
  label: string;
  value: string | undefined;
};

export type SwitchOptions = {
  checked: string;
  unchecked: string;
  defaultChecked: boolean;
};

export type NumberOptions = {
  max?: number;
  min?: number;
  step?: number;
};

export type MapOptions = {
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disableKeyInput?: boolean;
  disableValueInput?: boolean;
};

export const REQUIRED_MISSING_STATUS = ['warning', 'error'] as const;
export type RequiredMissingStatus = (typeof REQUIRED_MISSING_STATUS)[number];
export type RequiredField = {
  missingMessage: string;
  missingStatus: RequiredMissingStatus;
};

export type BaseFieldConfig = {
  id: string;
  label: string;

  /**
   * Can be left as an empty string if no description is needed
   */
  description: string;
  inputType: InputType;
  placeholder?: string;
  defaultValue?: any;

  required?: RequiredField;
  hideCustomTab?: boolean;

  /**
   * Default is `single`
   *
   * `multiple` - allows multiple values
   *
   * `dynamic` - the server will provide the options
   */
  occurenceType?: OccurenceType;

  /**
   * Options for hiding/showing and loading the field based on other field values
   */
  loadOptions?: {
    /**
     * once this is selected, the current field will be loaded/displayed
     */
    dependsOn?: (
      | string
      | {
          /**
           * The id of the field that the current field depends on
           */
          id: string;
          /**
           * The value of the field that the current field depends on
           */
          value: string | string[];
        }
    )[];

    /**
     * Only visible if viewing the execution
     */
    executionOnly?: boolean;

    /**
     * Only visible if viewing the workflow builder
     */
    workflowOnly?: boolean;

    /**
     * Will cause force a re-fetch if any of the dependsOn field changes
     */
    forceRefresh?: boolean;

    /**
     * Hides refresh button. Pairs well with force refresh
     */
    hideRefreshButton?: boolean;
  };
};

export type FieldConfig = BaseFieldConfig & {
  /**
   * Required when using inputType: 'select' or 'multi-select'
   */
  selectOptions?: SelectOptions[];

  /**
   * Required when using inputType: 'switch'
   */
  switchOptions?: SwitchOptions;

  /**
   * Optional when using inputType: 'number'
   */
  numberOptions?: NumberOptions;

  /**
   * Optional when using inputType: 'map'
   */
  mapOptions?: MapOptions;

  /**
   * Value is populated from the client
   */
  value?: string;

  /**
   * Raw is populated from the client
   */
  raw?: string;

  markdown?: string;

  /**
   * Used for 'dynamic-select' and 'dynamic-multi-select'
   * This function will be called from the client to get dynamic options from the server
   */
  _getDynamicValues?: (args: {
    connection: ConnectionData;
    extraOptions: Record<string, any> | undefined;
    projectId: string;
    workspaceId: string;
    workflowId: string | undefined;
    agentId: string | undefined;
    http: InjectedServices['http'];
    prisma: InjectedServices['prisma'];
    aiProviders: InjectedServices['aiProviders'];
  }) => Promise<SelectOptions[]>;
};

/**
 * A field with nested fields.
 * Must be used with occurenceType: 'multiple'
 */
export type NestedInputConfig = {
  id: string;
  label: string;
  description: string;
  occurenceType: OccurenceType;
  inputConfig: FieldConfig[];
};

/**
 * Fields that are used to create a config form in the UI.
 */
export type InputConfig = (FieldConfig | NestedInputConfig)[];

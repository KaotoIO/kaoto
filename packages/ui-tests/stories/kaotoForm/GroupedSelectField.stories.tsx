import {
  CustomFieldsFactory,
  FieldProps,
  GroupedSelectField,
  GroupedSelectOptionGroup,
  KaotoForm,
  KaotoFormProps,
} from '@kaoto/forms';
import { KaotoSchemaDefinition } from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { FunctionComponent } from 'react';

/**
 * `GroupedSelectField` is presentational: it renders the dropdown, and the host supplies the
 * groups, the icons and the fallback. These stories stand in for that host — the real one is
 * `CatalogSelectorField` in `packages/ui`, which maps the Camel catalog library to these props.
 */
export default {
  title: 'KaotoForm/GroupedSelectField',
  component: GroupedSelectField,
} as Meta<typeof GroupedSelectField>;

const schema: KaotoSchemaDefinition['schema'] = {
  type: 'object',
  properties: {
    runtimeVersion: {
      type: 'string',
      title: 'Integrations runtime version',
      description: 'Pick the runtime the integration is built against.',
    },
  },
};

/** Stands in for a host's real icons, which live in the consuming app rather than in `forms`. */
const RuntimeDot: FunctionComponent<{ color: string }> = ({ color }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-block',
      inlineSize: '0.75rem',
      blockSize: '0.75rem',
      borderRadius: '50%',
      background: color,
    }}
  />
);

const runtimeGroups: GroupedSelectOptionGroup[] = [
  {
    label: 'Main',
    icon: <RuntimeDot color="#ee0000" />,
    options: [
      { value: 'camel-main-4.14.5', label: 'Camel Main 4.14.5', icon: <RuntimeDot color="#ee0000" /> },
      { value: 'camel-main-4.15.0', label: 'Camel Main 4.15.0', icon: <RuntimeDot color="#ee0000" /> },
    ],
  },
  {
    label: 'Quarkus',
    icon: <RuntimeDot color="#4695eb" />,
    options: [{ value: 'camel-quarkus-3.8.0', label: 'Camel Quarkus 3.8.0', icon: <RuntimeDot color="#4695eb" /> }],
  },
  {
    label: 'Spring Boot',
    icon: <RuntimeDot color="#6db33f" />,
    options: [
      { value: 'camel-spring-boot-4.10.0', label: 'Camel Spring Boot 4.10.0', icon: <RuntimeDot color="#6db33f" /> },
    ],
  },
];

/**
 * The factory only receives the schema, so a host reaches the field through a small wrapper that
 * closes over its own data — the same shape `CatalogSelectorField` uses.
 */
const getCustomFieldsFactory =
  (groups?: GroupedSelectOptionGroup[]): CustomFieldsFactory =>
  (fieldSchema) => {
    if (fieldSchema.title !== 'Integrations runtime version') return undefined;

    const RuntimeVersionField: FunctionComponent<FieldProps> = (props) => (
      <GroupedSelectField {...props} groups={groups} loadingText="Loading catalogs..." />
    );

    return RuntimeVersionField;
  };

interface GroupedSelectStoryArgs {
  groups?: GroupedSelectOptionGroup[];
  model: Record<string, unknown>;
  disabled?: boolean;
}

const Template: StoryFn<GroupedSelectStoryArgs> = ({ groups, model, disabled }) => (
  <KaotoForm
    data-testid="grouped-select-field-form"
    schema={schema}
    model={model}
    disabled={disabled}
    onChange={(() => {}) as KaotoFormProps['onChange']}
    customFieldsFactory={getCustomFieldsFactory(groups)}
  />
);

export const Default = Template.bind({});
Default.args = { groups: runtimeGroups, model: {} };

export const WithSelectedOption = Template.bind({});
WithSelectedOption.args = { groups: runtimeGroups, model: { runtimeVersion: 'camel-quarkus-3.8.0' } };

/** `groups: undefined` is the host saying "not fetched yet", and renders `loadingText`. */
export const Loading = Template.bind({});
Loading.args = { groups: undefined, model: {} };

/** `groups: []` is a finished fetch that matched nothing — an empty dropdown, not a loading state. */
export const NoMatchingOptions = Template.bind({});
NoMatchingOptions.args = { groups: [], model: {} };

export const Disabled = Template.bind({});
Disabled.args = { groups: runtimeGroups, model: { runtimeVersion: 'camel-main-4.14.5' }, disabled: true };

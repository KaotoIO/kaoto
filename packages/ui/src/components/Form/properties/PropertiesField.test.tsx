import { render } from '@testing-library/react';
import { KaotoSchemaDefinition } from '../../../models';
import { UniformsWrapper } from '../../../stubs/TestUniformsWrapper';
import { PropertiesField } from './PropertiesField';

describe('PropertiesField Component', () => {
  const parametersSchema: KaotoSchemaDefinition['schema'] = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      parameters: {
        title: 'Parameters',
        group: 'consumer',
        description: 'List of Tool parameters in the form of parameter.=',
        type: 'object',
        deprecated: false,
      },
    },
  };

  it('renders without crashing', () => {
    const wrapper = render(
      <UniformsWrapper model={{}} schema={parametersSchema}>
        <PropertiesField name="parameters" />
      </UniformsWrapper>,
    );

    const propertiesFieldElement = wrapper.getByTestId('expandable-section-parameters');
    expect(propertiesFieldElement).toBeInTheDocument();
  });

  it('displays the correct label', () => {
    const label = 'Test Label';
    const wrapper = render(
      <UniformsWrapper model={{}} schema={parametersSchema}>
        <PropertiesField name="parameters" label={label} />
      </UniformsWrapper>,
    );
    const labelElement = wrapper.getByText(label);
    expect(labelElement).toBeInTheDocument();
  });
});

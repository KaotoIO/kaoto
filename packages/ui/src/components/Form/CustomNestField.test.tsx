import { render } from '@testing-library/react';
import { CustomNestField } from './CustomNestField';
import { AutoForm } from '@kaoto-next/uniforms-patternfly';
import { SchemaService } from '.';

describe('CustomNestField', () => {
  it('should render', () => {
    const schema = new SchemaService().getSchemaBridge({
      title: 'Rest Configuration',
      description: 'To configure rest',
      type: 'object',
      additionalProperties: false,
      properties: {
        objectProp: {
          type: 'object',
        },
      },
    });

    const { container } = render(
      <AutoForm schema={schema} onSubmit={() => {}} model={{}}>
        <CustomNestField name="objectProp" label="Custom nest field label" />
      </AutoForm>,
    );

    expect(container).toMatchSnapshot();
  });
});

import { AutoForm } from '@kaoto-next/uniforms-patternfly';
import { act, fireEvent, render } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useEffect, useRef, useState } from 'react';
import { KaotoSchemaDefinition } from '../../../models/kaoto-schema';
import { SchemaBridgeContext } from '../../../providers/schema-bridge.provider';
import { SchemaService } from '../schema.service';
import { OneOfField } from './OneOfField';

describe('OneOfField', () => {
  const oneOfSchema: KaotoSchemaDefinition['schema'] = {
    oneOf: [
      { title: 'Name schema', type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      { title: 'Number schema', type: 'object', properties: { amount: { type: 'number' } }, required: ['amount'] },
      { title: 'Boolean schema', type: 'object', properties: { isValid: { type: 'boolean' } }, required: ['isValid'] },
    ],
    type: 'object',
    properties: {
      name: {},
      amount: {},
      isValid: {},
    },
  };

  it('should render', () => {
    const wrapper = render(<OneOfField name="" oneOf={oneOfSchema.oneOf} />, {
      wrapper: (props) => (
        <UniformsWrapper model={{}} schema={oneOfSchema}>
          {props.children}
        </UniformsWrapper>
      ),
    });

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should render correctly', () => {
    const wrapper = render(<OneOfField name="" oneOf={oneOfSchema.oneOf} />, {
      wrapper: (props) => (
        <UniformsWrapper model={{}} schema={oneOfSchema}>
          {props.children}
        </UniformsWrapper>
      ),
    });

    const dropDownToggle = wrapper.getByText(SchemaService.DROPDOWN_PLACEHOLDER);
    expect(dropDownToggle).toBeInTheDocument();
  });

  it('should render the appropriate schema when given a matching model', () => {
    const wrapper = render(<OneOfField name="" oneOf={oneOfSchema.oneOf} />, {
      wrapper: (props) => (
        <UniformsWrapper model={{ name: 'John Doe' }} schema={oneOfSchema}>
          {props.children}
        </UniformsWrapper>
      ),
    });

    const nameField = wrapper.getByTestId('text-field');
    expect(nameField).toBeInTheDocument();
    expect(nameField).toHaveAttribute('label', 'Name');
    expect(nameField).toHaveValue('John Doe');
  });

  it('should render a new selected schema', async () => {
    const wrapper = render(<OneOfField name="" oneOf={oneOfSchema.oneOf} />, {
      wrapper: (props) => (
        <UniformsWrapper model={{}} schema={oneOfSchema}>
          {props.children}
        </UniformsWrapper>
      ),
    });

    await act(async () => {
      const dropDownToggle = wrapper.getByText(SchemaService.DROPDOWN_PLACEHOLDER);
      expect(dropDownToggle).toBeInTheDocument();

      fireEvent.click(dropDownToggle);
    });

    await act(async () => {
      const schema2Item = wrapper.getByText('Number schema');
      fireEvent.click(schema2Item);
    });

    const nameField = wrapper.getByTestId('text-field');
    expect(nameField).toBeInTheDocument();
    expect(nameField).toHaveAttribute('label', 'Amount');
    expect(nameField).toHaveValue('');
  });
});

const UniformsWrapper: FunctionComponent<
  PropsWithChildren<{
    model: Record<string, unknown>;
    schema: KaotoSchemaDefinition['schema'];
  }>
> = (props) => {
  const schemaBridge = new SchemaService().getSchemaBridge(props.schema);
  const divRef = useRef<HTMLDivElement>(null);
  const [, setLastRenderTimestamp] = useState<number>(-1);

  useEffect(() => {
    /** Force re-render to update the divRef */
    setLastRenderTimestamp(Date.now());
  }, []);

  return (
    <SchemaBridgeContext.Provider value={{ schemaBridge, parentRef: divRef }}>
      <AutoForm model={props.model} schema={schemaBridge}>
        {props.children}
      </AutoForm>
      <div ref={divRef} />
    </SchemaBridgeContext.Provider>
  );
};

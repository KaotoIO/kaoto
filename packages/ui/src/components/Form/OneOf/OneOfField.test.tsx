import { act, fireEvent, render } from '@testing-library/react';
import { KaotoSchemaDefinition } from '../../../models/kaoto-schema';
import { UniformsWrapper } from '../../../stubs/TestUniformsWrapper';
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
    const wrapper = render(<OneOfField name="" oneOf={oneOfSchema.oneOf!} />, {
      wrapper: (props) => (
        <UniformsWrapper model={{}} schema={oneOfSchema}>
          {props.children}
        </UniformsWrapper>
      ),
    });

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should render correctly', () => {
    const wrapper = render(<OneOfField name="" oneOf={oneOfSchema.oneOf!} />, {
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
    const wrapper = render(<OneOfField name="" oneOf={oneOfSchema.oneOf!} />, {
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
    const wrapper = render(<OneOfField name="" oneOf={oneOfSchema.oneOf!} />, {
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

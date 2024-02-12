import { act, fireEvent, render } from '@testing-library/react';
import { OneOfSchemas } from '../../../utils/get-oneof-schema-list';
import { SchemaService } from '../schema.service';
import { OneOfSchemaList } from './OneOfSchemaList';

describe('OneOfSchemaList', () => {
  const oneOfSchemas: OneOfSchemas[] = [
    { name: 'Schema 1', schema: { type: 'object', properties: { name: { type: 'string' } } } },
    { name: 'Schema 2', schema: { type: 'object', properties: { amount: { type: 'number' } } } },
    { name: 'Schema 3', schema: { type: 'object', properties: { isValid: { type: 'boolean' } } } },
  ];

  it('should render', () => {
    const wrapper = render(<OneOfSchemaList name="" oneOfSchemas={oneOfSchemas} onSchemaChanged={() => {}} />);

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should render the dropwdown toggle correctly', () => {
    const wrapper = render(<OneOfSchemaList name="" oneOfSchemas={oneOfSchemas} onSchemaChanged={() => {}} />);

    const dropDownToggle = wrapper.getByText(SchemaService.DROPDOWN_PLACEHOLDER);
    expect(dropDownToggle).toBeInTheDocument();
  });

  it('should render the provided children', () => {
    const wrapper = render(
      <OneOfSchemaList name="" oneOfSchemas={oneOfSchemas} selectedSchemaName="Schema 1" onSchemaChanged={() => {}}>
        <div data-testid="children">Children</div>
      </OneOfSchemaList>,
    );

    const children = wrapper.getByTestId('children');
    expect(children).toBeInTheDocument();
  });

  it('should notify the parent when a schema is selected', async () => {
    const schemaChangedSpy = jest.fn();

    const wrapper = render(
      <OneOfSchemaList
        name=""
        oneOfSchemas={oneOfSchemas}
        selectedSchemaName={undefined}
        onSchemaChanged={schemaChangedSpy}
      >
        <div data-testid="children">Children</div>
      </OneOfSchemaList>,
    );

    await act(async () => {
      const dropDownToggle = wrapper.getByText(SchemaService.DROPDOWN_PLACEHOLDER);
      expect(dropDownToggle).toBeInTheDocument();

      fireEvent.click(dropDownToggle);
    });

    await act(async () => {
      const schema2Item = wrapper.getByText('Schema 2');
      fireEvent.click(schema2Item);
    });

    expect(schemaChangedSpy).toHaveBeenCalledWith('Schema 2');
  });

  it('should notify the parent when a schema is changed', async () => {
    const schemaChangedSpy = jest.fn();

    const wrapper = render(
      <OneOfSchemaList
        name=""
        oneOfSchemas={oneOfSchemas}
        selectedSchemaName="Schema 2"
        onSchemaChanged={schemaChangedSpy}
      >
        <div data-testid="children">Children</div>
      </OneOfSchemaList>,
    );

    await act(async () => {
      const dropDownToggle = wrapper.getByText('Schema 2');
      expect(dropDownToggle).toBeInTheDocument();

      fireEvent.click(dropDownToggle);
    });

    await act(async () => {
      const schema3Item = wrapper.getByText('Schema 3');
      fireEvent.click(schema3Item);
    });

    expect(schemaChangedSpy).toHaveBeenCalledWith(undefined);
    expect(schemaChangedSpy).toHaveBeenCalledWith('Schema 3');
  });
});

import { fireEvent, render } from '@testing-library/react';
import { SchemaSelector } from './SchemaSelector';
import userSchemaJson from '../../stubs/user-schema.json';

describe('SchemaSelector', () => {
  it('should render correctly', () => {
    const props = {
      schemas: [
        {
          name: 'name',
          version: 'version',
          schema: userSchemaJson,
        },
      ],
    };

    const { container } = render(<SchemaSelector {...props} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should call onClick when a tile is clicked', () => {
    const props = {
      schemas: [
        {
          name: 'name',
          version: 'version',
          schema: userSchemaJson,
        },
      ],
      onClick: jest.fn(),
    };

    const { getByText } = render(<SchemaSelector {...props} />);

    fireEvent.click(getByText('name'));

    expect(props.onClick).toHaveBeenCalledWith(props.schemas[0].schema);
  });
});

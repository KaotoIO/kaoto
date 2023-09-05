import { fireEvent, render } from '@testing-library/react';
import { SchemaSelector } from './SchemaSelector';
import userSchemaJson from '../../stubs/user-schema.json';

describe('SchemaSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const props = {
    schemas: [
      {
        name: 'name',
        version: 'version',
        tags: [],
        uri: 'uri',
        schema: userSchemaJson,
      },
    ],
    onClick: jest.fn(),
  };

  it('should render correctly', () => {
    const { container } = render(<SchemaSelector {...props} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should call onClick when a tile is clicked', () => {
    const { getByText } = render(<SchemaSelector {...props} />);

    fireEvent.click(getByText('name'));

    expect(props.onClick).toHaveBeenCalledWith(props.schemas[0].schema);
  });
});

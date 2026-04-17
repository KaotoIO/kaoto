import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SchemaFileList } from './SchemaFileList';

describe('SchemaFileList', () => {
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    mockOnRemove.mockClear();
  });

  it('should render nothing when no files are provided', () => {
    const { container } = render(<SchemaFileList existingFiles={[]} pendingUploads={[]} onRemove={mockOnRemove} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render existing files without remove button', () => {
    const existingFiles = ['path/to/schema1.xsd', 'path/to/schema2.xsd'];
    render(<SchemaFileList existingFiles={existingFiles} pendingUploads={[]} onRemove={mockOnRemove} />);

    expect(screen.getByTestId('existing-schema-item-schema1.xsd')).toBeInTheDocument();
    expect(screen.getByTestId('existing-schema-item-schema2.xsd')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render pending uploads with remove buttons', () => {
    const pendingUploads = ['path/to/pending1.xsd', 'path/to/pending2.xsd'];
    render(<SchemaFileList existingFiles={[]} pendingUploads={pendingUploads} onRemove={mockOnRemove} />);

    expect(screen.getByTestId('uploaded-schema-item-pending1.xsd')).toBeInTheDocument();
    expect(screen.getByTestId('uploaded-schema-item-pending2.xsd')).toBeInTheDocument();
    expect(screen.getByTestId('remove-schema-item-pending1.xsd')).toBeInTheDocument();
    expect(screen.getByTestId('remove-schema-item-pending2.xsd')).toBeInTheDocument();
  });

  it('should render both existing files and pending uploads', () => {
    const existingFiles = ['path/to/existing.xsd'];
    const pendingUploads = ['path/to/pending.xsd'];
    render(<SchemaFileList existingFiles={existingFiles} pendingUploads={pendingUploads} onRemove={mockOnRemove} />);

    expect(screen.getByTestId('existing-schema-item-existing.xsd')).toBeInTheDocument();
    expect(screen.getByTestId('uploaded-schema-item-pending.xsd')).toBeInTheDocument();
    expect(screen.getByTestId('remove-schema-item-pending.xsd')).toBeInTheDocument();
  });

  it('should call onRemove with correct file path when remove button is clicked', async () => {
    const user = userEvent.setup();
    const pendingUploads = ['path/to/pending.xsd'];
    render(<SchemaFileList existingFiles={[]} pendingUploads={pendingUploads} onRemove={mockOnRemove} />);

    const removeButton = screen.getByTestId('remove-schema-item-pending.xsd');
    await user.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledTimes(1);
    expect(mockOnRemove).toHaveBeenCalledWith('path/to/pending.xsd');
  });

  it('should display only filename without path', () => {
    const existingFiles = ['path/to/deeply/nested/schema.xsd'];
    render(<SchemaFileList existingFiles={existingFiles} pendingUploads={[]} onRemove={mockOnRemove} />);

    expect(screen.getByText('schema.xsd')).toBeInTheDocument();
    expect(screen.queryByText('path/to/deeply/nested/schema.xsd')).not.toBeInTheDocument();
  });

  it('should render DataList with correct accessibility attributes', () => {
    const existingFiles = ['schema.xsd'];
    render(<SchemaFileList existingFiles={existingFiles} pendingUploads={[]} onRemove={mockOnRemove} />);

    const dataList = screen.getByRole('list', { name: 'Document schema files' });
    expect(dataList).toBeInTheDocument();
    expect(dataList).toHaveAttribute('data-testid', 'uploaded-schema-list');
  });

  it('should set correct aria-label for remove buttons', () => {
    const pendingUploads = ['test-schema.xsd'];
    render(<SchemaFileList existingFiles={[]} pendingUploads={pendingUploads} onRemove={mockOnRemove} />);

    const removeButton = screen.getByTestId('remove-schema-item-test-schema.xsd');
    expect(removeButton).toHaveAttribute('aria-label', 'Remove test-schema.xsd');
  });

  it('should handle multiple pending uploads with individual remove handlers', async () => {
    const user = userEvent.setup();
    const pendingUploads = ['schema1.xsd', 'schema2.xsd', 'schema3.xsd'];
    render(<SchemaFileList existingFiles={[]} pendingUploads={pendingUploads} onRemove={mockOnRemove} />);

    await user.click(screen.getByTestId('remove-schema-item-schema2.xsd'));
    expect(mockOnRemove).toHaveBeenCalledWith('schema2.xsd');

    mockOnRemove.mockClear();

    await user.click(screen.getByTestId('remove-schema-item-schema1.xsd'));
    expect(mockOnRemove).toHaveBeenCalledWith('schema1.xsd');
  });

  it('should render files in the order provided', () => {
    const existingFiles = ['a.xsd', 'b.xsd'];
    const pendingUploads = ['c.xsd', 'd.xsd'];
    render(<SchemaFileList existingFiles={existingFiles} pendingUploads={pendingUploads} onRemove={mockOnRemove} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('a.xsd');
    expect(items[1]).toHaveTextContent('b.xsd');
    expect(items[2]).toHaveTextContent('c.xsd');
    expect(items[3]).toHaveTextContent('d.xsd');
  });
});

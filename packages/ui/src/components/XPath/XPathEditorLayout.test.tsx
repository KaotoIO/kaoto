import { act, fireEvent, render, screen } from '@testing-library/react';

import { BODY_DOCUMENT_ID, IExpressionHolder, MappingItem, MappingTree, ValueSelector } from '../../models/datamapper';
import { DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { XPathEditorLayout } from './XPathEditorLayout';

// Shared test setup
globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

const createTestMapping = () => {
  const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
  const mapping: IExpressionHolder & MappingItem = new ValueSelector(tree);
  mapping.expression = '/to/some/field';
  return mapping;
};

const setupComponent = (mapping: IExpressionHolder & MappingItem, onUpdate: jest.Mock) => {
  return render(
    <DataMapperProvider>
      <MappingLinksProvider>
        <XPathEditorLayout mapping={mapping} onUpdate={onUpdate} />
      </MappingLinksProvider>
    </DataMapperProvider>,
  );
};

describe('XPathEditorLayout - Search Field', () => {
  const mapping = createTestMapping();
  const onUpdate = jest.fn();
  const setup = () => setupComponent(mapping, onUpdate);

  it('renders the search field', () => {
    setup();

    const tab = screen.getByTestId('xpath-editor-tab-function');
    act(() => {
      fireEvent.click(tab);
    });

    const searchInput = screen.getByTestId('functions-menu-search-input');
    expect(searchInput).toBeInTheDocument();
  });

  it('allows typing in the search field', async () => {
    setup();

    const tab = screen.getByTestId('xpath-editor-tab-function');
    act(() => {
      fireEvent.click(tab);
    });

    const searchInput = screen.getByTestId('functions-menu-search-input').querySelector('input');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput!, { target: { value: 'test' } });

    expect(searchInput!.value).toBe('test');
  });

  it('filters function list based on search input', async () => {
    setup();

    const tab = screen.getByTestId('xpath-editor-tab-function');
    act(() => {
      fireEvent.click(tab);
    });

    const searchInput = screen.getByTestId('functions-menu-search-input').querySelector('input');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput!, { target: { value: 'substring' } });

    expect(screen.getByText('Substring')).toBeInTheDocument();
    expect(screen.getByText('Substring Before')).toBeInTheDocument();
    expect(screen.getByText('Substring After')).toBeInTheDocument();
    expect(screen.queryByText('Translate')).not.toBeInTheDocument();
  });
});

describe('XPathEditorLayout - Collapsible MenuGroups', () => {
  const mapping = createTestMapping();
  const onUpdate = jest.fn();
  const setup = () => setupComponent(mapping, onUpdate);

  beforeEach(() => {
    // Switch to the Function tab before each test
    setup();
    const tab = screen.getByTestId('xpath-editor-tab-function');
    act(() => {
      fireEvent.click(tab);
    });
  });

  it('renders function groups with toggle buttons', () => {
    // Check that group toggle buttons exist
    expect(screen.getByTestId('function-group-toggle-String')).toBeInTheDocument();
    expect(screen.getByTestId('function-group-toggle-Numeric')).toBeInTheDocument();
    expect(screen.getByTestId('function-group-toggle-Boolean')).toBeInTheDocument();
  });

  it('groups are initially expanded and show functions', () => {
    // String group should be expanded and show its functions
    const stringToggle = screen.getByTestId('function-group-toggle-String');
    expect(stringToggle).toBeInTheDocument();

    // Check that some functions from String group are visible
    expect(screen.getByText('String Length')).toBeInTheDocument();
    expect(screen.getByText('Concatenate')).toBeInTheDocument();
  });

  it('collapses a group when toggle button is clicked', () => {
    // String group functions should be visible initially
    expect(screen.getByText('String Length')).toBeInTheDocument();
    expect(screen.getByText('Concatenate')).toBeInTheDocument();

    // Click the String group toggle to collapse it
    const stringToggle = screen.getByTestId('function-group-toggle-String');
    act(() => {
      fireEvent.click(stringToggle);
    });

    // Functions should not be visible after collapse
    expect(screen.queryByText('String Length')).not.toBeInTheDocument();
    expect(screen.queryByText('Concatenate')).not.toBeInTheDocument();
  });

  it('expands a collapsed group when toggle button is clicked again', () => {
    const stringToggle = screen.getByTestId('function-group-toggle-String');

    // Collapse the group first
    act(() => {
      fireEvent.click(stringToggle);
    });
    expect(screen.queryByText('String Length')).not.toBeInTheDocument();

    // Expand the group again
    act(() => {
      fireEvent.click(stringToggle);
    });
    expect(screen.getByText('String Length')).toBeInTheDocument();
    expect(screen.getByText('Concatenate')).toBeInTheDocument();
  });

  it('allows collapsing groups while searching', () => {
    const searchInput = screen.getByTestId('functions-menu-search-input').querySelector('input');
    const stringToggle = screen.getByTestId('function-group-toggle-String');

    // Enter search text
    fireEvent.change(searchInput!, { target: { value: 'concat' } });

    // Verify function is visible initially
    expect(screen.getByText('Concatenate')).toBeInTheDocument();

    // Collapse the group while search is active
    act(() => {
      fireEvent.click(stringToggle);
    });

    // Function should not be visible after collapse, even with search text
    expect(screen.queryByText('Concatenate')).not.toBeInTheDocument();

    // Expand again
    act(() => {
      fireEvent.click(stringToggle);
    });

    // Function should be visible again
    expect(screen.getByText('Concatenate')).toBeInTheDocument();
  });
});

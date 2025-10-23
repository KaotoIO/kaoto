import { act, render, screen, fireEvent } from '@testing-library/react';
import { XPathEditorLayout } from './XPathEditorLayout';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { BODY_DOCUMENT_ID, ExpressionItem, MappingTree, ValueSelector } from '../../models/datamapper';
import { DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';

describe('XPathEditorLayout - Search Field', () => {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
  const mapping: ExpressionItem = new ValueSelector(tree);
  mapping.expression = '/to/some/field';
  const onUpdate = jest.fn();
  const setup = () => {
    return render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <XPathEditorLayout mapping={mapping} onUpdate={onUpdate} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
  };

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

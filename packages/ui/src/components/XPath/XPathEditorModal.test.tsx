import { act, fireEvent, render, screen } from '@testing-library/react';

import { BODY_DOCUMENT_ID, ExpressionItem, MappingTree, ValueSelector } from '../../models/datamapper';
import { DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { XPathEditorModal } from './XPathEditorModal';

describe('XPathEditorModal', () => {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
  const mapping: ExpressionItem = new ValueSelector(tree);
  mapping.expression = '/to/some/field';
  const onClose = jest.fn();
  const onUpdate = jest.fn();

  const setup = () => {
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <XPathEditorModal isOpen mapping={mapping} onClose={onClose} onUpdate={onUpdate} title="XPath Editor" />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
  };

  it('should render', async () => {
    await act(async () => {
      setup();
    });

    const xpathEditor = screen.getByTestId('xpath-editor');
    expect(xpathEditor).toBeInTheDocument();

    /* TODO ATM it doesn't render the expression content in Jest
    const expression = await screen.findByText('/to/some/field');
     */
  });

  it('should show popover when hint button is clicked', async () => {
    await act(async () => {
      setup();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('xpath-editor-hint'));
    });

    expect(
      screen.getByText(
        'Grab a field from the left panel and drag it into the editor on the right to create mappings. To apply functions, open the Functions tab on the left and drag them into the right panel as well. You can also type directly in the right-side editor to create mappings manually.',
      ),
    ).toBeInTheDocument();
  });
});

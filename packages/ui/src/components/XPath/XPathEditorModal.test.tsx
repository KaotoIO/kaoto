import { XPathEditorModal } from './XPathEditorModal';
import { render, screen } from '@testing-library/react';
import { BODY_DOCUMENT_ID, ExpressionItem, MappingTree, ValueSelector } from '../../models/datamapper';
import { DocumentType } from '../../models/datamapper/path';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';

describe('XPathEditorModal', () => {
  it('should render', async () => {
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const mapping: ExpressionItem = new ValueSelector(tree);
    mapping.expression = '/to/some/field';
    const onClose = jest.fn();
    const onUpdate = jest.fn();

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <XPathEditorModal
            isOpen={true}
            mapping={mapping}
            onClose={onClose}
            onUpdate={onUpdate}
            title={'XPath Editor'}
          />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    const xpathEditor = screen.getByTestId('xpath-editor');
    expect(xpathEditor).toBeInTheDocument();

    /* TODO ATM it doesn't render the expression content in Jest
    const expression = await screen.findByText('/to/some/field');
     */
  });
});

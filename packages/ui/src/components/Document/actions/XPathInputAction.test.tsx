import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MockInstance } from 'vitest';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType, IDocument } from '../../../models/datamapper/document';
import { MappingTree, ValueOfSelector, ValueSelector } from '../../../models/datamapper/mapping';
import {
  ISourceDocumentContext,
  TargetDocumentNodeData,
  TargetRenderIndex,
} from '../../../models/datamapper/visualization';
import { XmlSchemaDocument } from '../../../services/document/xml-schema/xml-schema-document.model';
import { TargetRenderService } from '../../../services/visualization/target-render.service';
import { useDocumentTreeStore } from '../../../store/document-tree.store';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { XPathInputAction } from './XPathInputAction';

describe('XPathInputAction', () => {
  let tree: MappingTree;
  let mapping: ValueSelector;
  let doc: XmlSchemaDocument;
  let docData: TargetDocumentNodeData;

  beforeEach(() => {
    doc = TestUtil.createTargetOrderDoc();
    tree = new MappingTree(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mapping = new ValueOfSelector(tree);
    docData = new TargetDocumentNodeData(doc, tree);
    // Reset store state before each test
    useDocumentTreeStore.getState().clearXPathInputFocusRequest();
  });

  it('should update xpath', () => {
    const onUpdateMock = vi.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={onUpdateMock} />);
    expect(mapping.expression).toBeFalsy();
    const input = screen.getByTestId('transformation-xpath-input');
    fireEvent.change(input, { target: { value: '/ShipOrder' } });
    expect(mapping.expression).toBe('/ShipOrder');
    expect(onUpdateMock.mock.calls).toHaveLength(1);
  });

  it('should show error popover button if xpath has a parse error', async () => {
    mapping.expression = '{{';
    const onUpdateMock = vi.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={onUpdateMock} />);
    const btn = await screen.findByTestId('xpath-input-error-btn');
    expect(btn).toBeInTheDocument();
  });

  it('should stop event propagation on handleXPathChange', async () => {
    const onUpdateMock = vi.fn();
    const wrapper = render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={onUpdateMock} />);
    const input = wrapper.getByTestId('transformation-xpath-input');

    fireEvent.change(input, { target: { value: '/ShipOrder' } });

    // Verify the handler was called and mapping was updated
    await waitFor(() => {
      expect(onUpdateMock).toHaveBeenCalled();
      expect(mapping.expression).toBe('/ShipOrder');
    });
  });

  it('should focus input when store indicates focus is needed for mapping node path', async () => {
    mapping.expression = '';

    // Request focus using the tree's nodePath (which is what nodeData.mapping.nodePath refers to)
    useDocumentTreeStore.getState().requestXPathInputFocus(tree.nodePath.toString());

    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');

    expect(input).toHaveFocus();
    expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBeNull();
  });

  it('should NOT focus input when store does not indicate focus', async () => {
    mapping.expression = 'existing/xpath';

    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');

    expect(input).not.toHaveFocus();
  });

  it('should only focus when store flag is set', async () => {
    mapping.expression = '';

    useDocumentTreeStore.getState().requestXPathInputFocus(tree.nodePath.toString());

    const { rerender } = render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');
    expect(input).toHaveFocus();

    input.blur();
    expect(input).not.toHaveFocus();

    rerender(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} />);

    expect(input).not.toHaveFocus();
  });

  it('should not focus when expression changes without store flag', async () => {
    mapping.expression = '';

    useDocumentTreeStore.getState().requestXPathInputFocus(tree.nodePath.toString());

    const { rerender } = render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} />);

    const input = await screen.findByTestId('transformation-xpath-input');
    expect(input).toHaveFocus();

    input.blur();

    mapping.expression = 'new/path';
    rerender(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} />);

    expect(input).not.toHaveFocus();
  });

  it('should call onCommit on blur, not on every keystroke', () => {
    const onCommitMock = vi.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} onCommit={onCommitMock} />);
    const input = screen.getByTestId('transformation-xpath-input');

    fireEvent.change(input, { target: { value: '/ShipOrder' } });
    expect(onCommitMock).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(onCommitMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a control outside its row', 'Elsewhere', true],
    ['a control in its row', 'In the row', false],
  ])('should tell onCommit whether a blur to %s leaves the row', (_label, focusTargetName, isFocusLeavingRow) => {
    const onCommitMock = vi.fn();
    render(
      <>
        <div role="treeitem" aria-selected={false}>
          <XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} onCommit={onCommitMock} />
          <button type="button">In the row</button>
        </div>
        <button type="button">Elsewhere</button>
      </>,
    );
    const input = screen.getByTestId('transformation-xpath-input');

    fireEvent.change(input, { target: { value: '/ShipOrder' } });
    fireEvent.blur(input, { relatedTarget: screen.getByRole('button', { name: focusTargetName }) });

    expect(onCommitMock).toHaveBeenCalledExactlyOnceWith(isFocusLeavingRow);
  });

  it('should report a blur that moves focus nowhere as leaving the row', () => {
    const onCommitMock = vi.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} onCommit={onCommitMock} />);
    const input = screen.getByTestId('transformation-xpath-input');

    fireEvent.change(input, { target: { value: '/ShipOrder' } });
    fireEvent.blur(input);

    expect(onCommitMock).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('should not fail on blur when no onCommit is supplied', () => {
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} />);
    expect(() => fireEvent.blur(screen.getByTestId('transformation-xpath-input'))).not.toThrow();
  });

  it('should call onCommit on Enter, not on other keys', () => {
    const onCommitMock = vi.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} onCommit={onCommitMock} />);
    const input = screen.getByTestId('transformation-xpath-input');

    fireEvent.change(input, { target: { value: '/ShipOrder' } });
    fireEvent.keyDown(input, { key: 'a' });
    expect(onCommitMock).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommitMock).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('should not call onCommit on an Enter that confirms an IME composition', () => {
    const onCommitMock = vi.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} onCommit={onCommitMock} />);
    const input = screen.getByTestId('transformation-xpath-input');

    fireEvent.change(input, { target: { value: '/ShipOrder' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onCommitMock).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommitMock).toHaveBeenCalledTimes(1);
  });

  it('should commit once for an Enter followed by a blur, and again for a blur after a further change', () => {
    const onCommitMock = vi.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} onCommit={onCommitMock} />);
    const input = screen.getByTestId('transformation-xpath-input');

    fireEvent.change(input, { target: { value: '/ShipOrder' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    expect(onCommitMock).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: '/ShipOrder/OrderPerson' } });
    fireEvent.blur(input);
    expect(onCommitMock).toHaveBeenCalledTimes(2);
  });

  it('should commit a typed value again after the expression was changed and committed elsewhere', () => {
    const onCommitMock = vi.fn();
    render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} onCommit={onCommitMock} />);
    const input = screen.getByTestId('transformation-xpath-input');

    fireEvent.change(input, { target: { value: '/ShipOrder' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommitMock).toHaveBeenCalledTimes(1);

    mapping.expression = '/ShipOrder/OrderPerson';
    fireEvent.change(input, { target: { value: '/ShipOrder' } });
    fireEvent.blur(input);
    expect(onCommitMock).toHaveBeenCalledTimes(2);
  });

  describe('focus restoration after a structural rebuild', () => {
    let previousRenderIndex: TargetRenderIndex;
    let rebuiltRenderIndex: TargetRenderIndex;
    let hasFocusSpy: MockInstance<typeof document.hasFocus>;

    const xPathInput = (renderIndex: TargetRenderIndex) => (
      <XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} renderIndex={renderIndex} />
    );

    const xPathInputNextToOtherControl = (renderIndex: TargetRenderIndex) => (
      <>
        <button type="button">Other control</button>
        {xPathInput(renderIndex)}
      </>
    );

    const requestFocusRestore = () => {
      useDocumentTreeStore.getState().requestXPathInputFocus(tree.nodePath.toString(), previousRenderIndex.generation);
    };

    const expectNoFocusRequest = () => {
      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBeNull();
      expect(useDocumentTreeStore.getState().xPathInputFocusRestoreAfter).toBeNull();
    };

    beforeEach(() => {
      const sourceContext: ISourceDocumentContext = {
        sourceParameterMap: new Map<string, IDocument>(),
        sourceBody: TestUtil.createSourceOrderDoc(),
      };
      previousRenderIndex = TargetRenderService.buildIndex(tree, sourceContext);
      rebuiltRenderIndex = TargetRenderService.buildIndex(tree, sourceContext);
      hasFocusSpy = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    });

    afterEach(() => {
      hasFocusSpy.mockRestore();
    });

    it('should wait while the row still comes from the render index the request was made against', () => {
      requestFocusRestore();

      render(xPathInput(previousRenderIndex));

      expect(screen.getByTestId('transformation-xpath-input')).not.toHaveFocus();
      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(tree.nodePath.toString());
      expect(useDocumentTreeStore.getState().xPathInputFocusRestoreAfter).toBe(previousRenderIndex.generation);
    });

    it('should not take a focus restore request without a render index to tell the rebuilt row by', () => {
      requestFocusRestore();

      render(<XPathInputAction nodeData={docData} mapping={mapping} onUpdate={vi.fn()} />);

      expect(screen.getByTestId('transformation-xpath-input')).not.toHaveFocus();
      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(tree.nodePath.toString());
    });

    it('should focus the rebuilt row when focus was lost, and clear the request', () => {
      requestFocusRestore();
      const { rerender } = render(xPathInput(previousRenderIndex));
      expect(document.activeElement).toBe(document.body);

      rerender(xPathInput(rebuiltRenderIndex));

      expect(screen.getByTestId('transformation-xpath-input')).toHaveFocus();
      expectNoFocusRequest();
    });

    it('should leave focus on another control, and clear the request', () => {
      requestFocusRestore();
      const { rerender } = render(xPathInputNextToOtherControl(previousRenderIndex));
      const otherControl = screen.getByRole('button', { name: 'Other control' });
      otherControl.focus();

      rerender(xPathInputNextToOtherControl(rebuiltRenderIndex));

      expect(otherControl).toHaveFocus();
      expectNoFocusRequest();
    });

    it('should not take focus while the page does not have it, and clear the request', () => {
      hasFocusSpy.mockReturnValue(false);
      requestFocusRestore();
      const { rerender } = render(xPathInput(previousRenderIndex));

      rerender(xPathInput(rebuiltRenderIndex));

      expect(screen.getByTestId('transformation-xpath-input')).not.toHaveFocus();
      expectNoFocusRequest();
    });

    it('should focus right away on a plain request, even taking focus from another control', () => {
      render(xPathInputNextToOtherControl(previousRenderIndex));
      screen.getByRole('button', { name: 'Other control' }).focus();

      act(() => {
        useDocumentTreeStore.getState().requestXPathInputFocus(tree.nodePath.toString());
      });

      expect(screen.getByTestId('transformation-xpath-input')).toHaveFocus();
      expectNoFocusRequest();
    });
  });
});

import { ExpressionInputAction } from './ExpressionInputAction';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MappingTree, ValueSelector } from '../../../models/mapping';
import { BODY_DOCUMENT_ID } from '../../../models/document';
import { DocumentType } from '../../../models/path';

describe('ExpressionInputAction', () => {
  it('should update expression', () => {
    const tree = new MappingTree(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const mapping = new ValueSelector(tree);
    const onUpdateMock = jest.fn();
    render(<ExpressionInputAction mapping={mapping} onUpdate={onUpdateMock} />);
    expect(mapping.expression).toBeFalsy();
    const input = screen.getByTestId('transformation-expression-input');
    act(() => {
      fireEvent.change(input, { target: { value: '/ShipOrder' } });
    });
    expect(mapping.expression).toEqual('/ShipOrder');
    expect(onUpdateMock.mock.calls.length).toEqual(1);
  });
});

import { DocumentService } from './document.service';
import { TestUtil } from '../test/test-util';

describe('DocumentService', () => {
  const sourceDoc = TestUtil.createSourceOrderDoc();
  const targetDoc = TestUtil.createTargetOrderDoc();

  describe('getFieldStack()', () => {
    it('', () => {
      const stack = DocumentService.getFieldStack(sourceDoc.fields[0].fields[1]);
      expect(stack.length).toEqual(1);
      expect(stack[0].name).toEqual('ShipOrder');
      const stackWithSelf = DocumentService.getFieldStack(sourceDoc.fields[0].fields[1], true);
      expect(stackWithSelf.length).toEqual(2);
      expect(stackWithSelf[0].name).toEqual('OrderPerson');
    });
  });

  describe('hasField()', () => {
    it('', () => {
      expect(DocumentService.hasField(sourceDoc, sourceDoc.fields[0].fields[0])).toBeTruthy();
      expect(DocumentService.hasField(sourceDoc, targetDoc.fields[0].fields[0])).toBeFalsy();
    });
  });

  describe('getFieldFromPathExpression()', () => {
    it('', () => {
      const pathExpression = '/ShipOrder/ShipTo';
      const field = DocumentService.getFieldFromPathExpression(sourceDoc, pathExpression);
      expect(field?.name).toEqual('ShipTo');
    });
  });

  describe('getFieldFromPathSegments()', () => {
    it('', () => {
      const pathSegments = ['ShipOrder', 'ShipTo'];
      const field = DocumentService.getFieldFromPathSegments(sourceDoc, pathSegments);
      expect(field?.name).toEqual('ShipTo');
    });
  });
});

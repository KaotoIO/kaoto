import { OnException } from '@kaoto/camel-catalog/types';

import { CamelOnExceptionVisualEntity } from './camel-on-exception-visual-entity';

describe('CamelOnExceptionVisualEntity', () => {
  const ONEXCEPTION_ID_REGEXP = /^onException-[a-zA-Z0-9]{4}$/;

  describe('isApplicable', () => {
    it.each([
      [true, { onException: { id: 'onExceptionId' } }],
      [false, { from: { id: 'from-1234', steps: [] } }],
      [false, { onException: { id: 'onExceptionId' }, anotherProperty: true }],
    ])('should return %s for %s', (result, definition) => {
      expect(CamelOnExceptionVisualEntity.isApplicable(definition)).toEqual(result);
    });
  });

  describe('function Object() { [native code] }', () => {
    it('should set id to onExceptionDef.onException.id if it is defined', () => {
      const onExceptionDef: { onException: OnException } = { onException: { id: 'onExceptionId' } };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);

      expect(entity.id).toEqual('onExceptionId');
      expect(onExceptionDef.onException.id).toEqual('onExceptionId');
    });

    it('should set id to generated id if onExceptionDef.onException.id is not defined', () => {
      const onExceptionDef = { onException: {} as OnException };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);

      expect(entity.id).toMatch(ONEXCEPTION_ID_REGEXP);
      expect(onExceptionDef.onException.id).toEqual(entity.id);
    });
  });

  describe('getNodeInteraction', () => {
    it.each([
      'route',
      'from',
      'to',
      'log',
      'onException',
      'onCompletion',
      'intercept',
      'interceptFrom',
      'interceptSendToEndpoint',
    ])(`should return the correct interaction for the '%s' processor`, (processorName) => {
      const onExceptionDef = { onException: {} as OnException };
      const entity = new CamelOnExceptionVisualEntity(onExceptionDef);

      const result = entity.getNodeInteraction({ processorName });
      expect(result).toMatchSnapshot();
    });
  });
});

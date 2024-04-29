import { CamelComponentDefaultService } from './camel-component-default.service';
import { DefinedComponent } from '../../../camel-catalog-index';
import { DoCatch } from '@kaoto/camel-catalog/types';

describe('CamelComponentDefaultService', () => {
  describe('getDefaultNodeDefinitionValue', () => {
    it('should return the default choice clause', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const choiceDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'choice',
      } as DefinedComponent) as any;
      expect(choiceDefault).toBeDefined();
      expect(choiceDefault.choice.when[0].expression.simple.expression).toEqual('${header.foo} == 1');
      expect(choiceDefault.choice.when[0].steps[0].log).toBeDefined();
    });

    it('should return the default when clause', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const whenDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'when',
      } as DefinedComponent) as any;
      expect(whenDefault).toBeDefined();
      expect(whenDefault.expression.simple.expression).toEqual('${header.foo} == 1');
      expect(whenDefault.steps[0].log).toBeDefined();
    });

    it('should return the default value for a doTry processor', () => {
      const doTryDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'doTry',
      } as DefinedComponent);
      expect(doTryDefault).toBeDefined();
      expect(doTryDefault.doTry?.doCatch).toHaveLength(1);
      expect(doTryDefault.doTry?.doCatch?.[0].steps).toHaveLength(0);
      expect(doTryDefault.doTry?.doCatch?.[0].exception).toHaveLength(1);
    });

    it('should return the default value for a doCatch processor', () => {
      const doCatchDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'doCatch',
      } as DefinedComponent) as DoCatch;
      expect(doCatchDefault).toBeDefined();
      expect(doCatchDefault.id).toBeDefined();
      expect(doCatchDefault.exception).toHaveLength(1);
    });
  });
});

import { CamelComponentDefaultService } from './camel-component-default.service';
import { DefinedComponent } from '../../../camel-catalog-index';

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
  });
});

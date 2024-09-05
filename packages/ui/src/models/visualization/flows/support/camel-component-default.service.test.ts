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

    it('should return the default value for a log processor', () => {
      const logDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'log',
      } as DefinedComponent) as any;
      expect(logDefault.log).toBeDefined();
      expect(logDefault.log.id as string).toMatch(/^log-/);
      expect(logDefault.log.message).toEqual('${body}');
    });

    it('should return the default value for a log component', () => {
      const logDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'component',
        name: 'log',
      } as DefinedComponent) as any;
      expect(logDefault.to).toBeDefined();
      expect(logDefault.to.id as string).toMatch(/^to-/);
      expect(logDefault.to.uri).toEqual('log:InfoLogger');
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

    it('should return the default value for a setHeader processor', () => {
      const setHeaderDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'setHeader',
      } as DefinedComponent);
      expect(setHeaderDefault.setHeader).toBeDefined();
      expect((setHeaderDefault.setHeader!.id as string).startsWith('setHeader-')).toBeTruthy();
      expect(setHeaderDefault.setHeader!.name).toBeUndefined();
      expect((setHeaderDefault.setHeader!.expression as any).simple).toEqual({});
    });

    it('should return the default value for a setProperty processor', () => {
      const setPropertyDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'setProperty',
      } as DefinedComponent);
      expect(setPropertyDefault.setProperty).toBeDefined();
      expect((setPropertyDefault.setProperty!.id as string).startsWith('setProperty-')).toBeTruthy();
      expect(setPropertyDefault.setProperty!.name).toBeUndefined();
      expect((setPropertyDefault.setProperty!.expression as any).simple).toEqual({});
    });

    it('should return the default value for a setVariable processor', () => {
      const setVariableDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'setVariable',
      } as DefinedComponent);
      expect(setVariableDefault.setVariable).toBeDefined();
      expect((setVariableDefault.setVariable!.id as string).startsWith('setVariable-')).toBeTruthy();
      expect(setVariableDefault.setVariable!.name).toBeUndefined();
      expect((setVariableDefault.setVariable!.expression as any).simple).toEqual({});
    });

    it('should return the default value for a setBody processor', () => {
      const setBodyDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'setBody',
      } as DefinedComponent);
      expect(setBodyDefault.setBody).toBeDefined();
      expect((setBodyDefault.setBody!.id as string).startsWith('setBody-')).toBeTruthy();
      expect((setBodyDefault.setBody!.expression as any).simple).toEqual({});
    });

    it('should return the default value for a filter processor', () => {
      const filterDefault = CamelComponentDefaultService.getDefaultNodeDefinitionValue({
        type: 'processor',
        name: 'filter',
      } as DefinedComponent);
      expect(filterDefault.filter).toBeDefined();
      expect((filterDefault.filter!.id as string).startsWith('filter-')).toBeTruthy();
      expect((filterDefault.filter!.expression as any).simple).toEqual({});
      expect(filterDefault.filter!.steps).toBeUndefined();
    });
  });
});

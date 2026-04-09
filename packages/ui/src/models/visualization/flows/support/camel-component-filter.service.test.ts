import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import {
  componentCronTile,
  componentDirectTile,
  componentKubernetesSecretsTile,
  componentSlackTile,
  kameletBeerSourceTile,
  kameletSinkTile,
  kameletSourceTile,
  kameletSSHSinkTile,
  kameletStringTemplateActionTile,
  processorCircuitBreakerTile,
  processorDoCatchTile,
  processorDoFinallyTile,
  processorInterceptTile,
  processorOnFallbackTile,
  processorOtherwiseTile,
  processorTile,
  processorWhenTile,
  tiles,
} from '../../../../stubs';
import { EntityType } from '../../../entities';
import { PlaceholderType } from '../../../placeholder.constants';
import { AddStepMode } from '../../base-visual-entity';
import { CamelComponentFilterService } from './camel-component-filter.service';

describe('CamelComponentFilterService', () => {
  describe('getCamelCompatibleComponents', () => {
    it('should not provide ProducerOnly components', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.ReplaceStep, {
        name: 'from',
        path: 'route.from',
        processorName: 'from' as keyof ProcessorDefinition,
        label: 'timer',
        isPlaceholder: false,
        isGroup: true,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletBeerSourceTile,
        componentSlackTile,
        componentCronTile,
        componentDirectTile,
      ]);
    });

    it('should not provide consumerOnly components', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.ReplaceStep, {
        name: 'log',
        path: 'route.from.steps.2.to',
        processorName: 'to',
        label: 'log',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
        componentDirectTile,
      ]);
    });

    describe('circuitBreaker', () => {
      it('should offer applicable processors when requesting special children', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
          AddStepMode.InsertSpecialChildStep,
          {
            name: 'circuitBreaker',
            path: 'route.from.steps.0.circuitBreaker',
            processorName: 'circuitBreaker',
            label: 'Circuit Breaker',
            isPlaceholder: false,
            isGroup: true,
            iconUrl: '',
            title: '',
            description: '',
          },
          {},
        );

        expect(tiles.filter(filterFn)).toEqual([processorOnFallbackTile]);
      });

      it('should NOT offer already defined processors when requesting special children', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
          AddStepMode.InsertSpecialChildStep,
          {
            name: 'circuitBreaker',
            path: 'route.from.steps.0.circuitBreaker',
            processorName: 'circuitBreaker',
            label: 'Circuit Breaker',
            isPlaceholder: false,
            isGroup: true,
            iconUrl: '',
            title: '',
            description: '',
          },
          { onFallback: {} },
        );

        expect(tiles.filter(filterFn)).toEqual([]);
      });
    });

    describe('choice', () => {
      it('should offer applicable processors when requesting special children', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
          AddStepMode.InsertSpecialChildStep,
          {
            name: 'choice',
            path: 'route.from.steps.0.choice',
            processorName: 'choice',
            label: 'Choice',
            isPlaceholder: false,
            isGroup: true,
            iconUrl: '',
            title: '',
            description: '',
          },
          {},
        );

        expect(tiles.filter(filterFn)).toEqual([processorWhenTile, processorOtherwiseTile]);
      });

      it('should NOT offer already defined processors when requesting special children', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
          AddStepMode.InsertSpecialChildStep,
          {
            name: 'choice',
            path: 'route.from.steps.0.choice',
            processorName: 'choice',
            label: 'Choice',
            isPlaceholder: false,
            isGroup: true,
            iconUrl: '',
            title: '',
            description: '',
          },
          { otherwise: {} },
        );

        expect(tiles.filter(filterFn)).toEqual([processorWhenTile]);
      });
    });

    describe('doTry', () => {
      it('should offer applicable processors when requesting special children', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
          AddStepMode.InsertSpecialChildStep,
          {
            name: 'doTry',
            path: 'route.from.steps.0.doTry',
            processorName: 'doTry',
            label: 'Do Try',
            isPlaceholder: false,
            isGroup: true,
            iconUrl: '',
            title: '',
            description: '',
          },
          {},
        );

        expect(tiles.filter(filterFn)).toEqual([processorDoCatchTile, processorDoFinallyTile]);
      });

      it('should NOT offer doFinally when already defined', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
          AddStepMode.InsertSpecialChildStep,
          {
            name: 'doTry',
            path: 'route.from.steps.0.doTry',
            processorName: 'doTry',
            label: 'Do Try',
            isPlaceholder: false,
            isGroup: true,
            iconUrl: '',
            title: '',
            description: '',
          },
          { doFinally: {} },
        );

        // doFinally should be filtered out
        const result = tiles.filter(filterFn);
        expect(result.some((t) => t.name === 'doFinally')).toBe(false);
        expect(result).toEqual([processorDoCatchTile]);
      });
    });

    it('should return empty filter for unknown processor in special children mode', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        {
          name: 'unknownProcessor',
          path: 'route.from.steps.0.unknownProcessor',
          processorName: 'log' as keyof ProcessorDefinition,
          label: 'Unknown',
          isPlaceholder: false,
          isGroup: true,
          iconUrl: '',
          title: '',
          description: '',
        },
        {},
      );

      // Should filter out everything
      expect(tiles.filter(filterFn)).toEqual([]);
    });

    it('should offer applicable processors when requesting routeConfiguration special children', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        {
          name: EntityType.RouteConfiguration,
          path: 'routeConfiguration',
          processorName: 'routeConfiguration' as keyof ProcessorDefinition,
          label: 'RouteConfiguration',
          isPlaceholder: false,
          isGroup: true,
          iconUrl: '',
          title: '',
          description: '',
        },
        {},
      );

      expect(tiles.filter(filterFn)).toEqual([processorInterceptTile]);
    });

    describe('rest', () => {
      it('should only offer direct component when replacing REST verb placeholder', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.ReplaceStep, {
          name: PlaceholderType.Placeholder,
          path: 'rest.get.0.to.placeholder',
          processorName: 'get' as keyof ProcessorDefinition,
          isPlaceholder: true,
          isGroup: false,
          iconUrl: '',
          title: '',
          description: '',
        });

        expect(tiles.filter(filterFn)).toEqual([componentDirectTile]);
      });

      it.each(['get', 'post', 'put', 'delete', 'patch', 'head'])(
        'should only offer direct component for %s verb placeholder',
        (verb) => {
          const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.ReplaceStep, {
            name: PlaceholderType.Placeholder,
            path: `rest.${verb}.0.to.placeholder`,
            processorName: verb as keyof ProcessorDefinition,
            isPlaceholder: true,
            isGroup: false,
            iconUrl: '',
            title: '',
            description: '',
          });

          expect(tiles.filter(filterFn)).toEqual([componentDirectTile]);
        },
      );
    });

    it('scenario for a new step before an existing step', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.PrependStep, {
        name: 'to',
        path: 'route.from.steps.0.to',
        processorName: 'to',
        label: 'timer',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
        componentDirectTile,
      ]);
    });

    it('scenario for a new step after an existing step', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.AppendStep, {
        name: 'to',
        path: 'route.from.steps.1.to',
        processorName: 'to',
        label: 'timer',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
        componentDirectTile,
      ]);
    });
  });

  describe('getKameletCompatibleComponents', () => {
    it('should not provide ProducerOnly components', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.ReplaceStep, {
        name: 'from',
        path: 'template.from',
        processorName: 'from' as keyof ProcessorDefinition,
        label: 'timer',
        isPlaceholder: false,
        isGroup: true,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSourceTile,
        kameletBeerSourceTile,
        componentSlackTile,
        componentCronTile,
        componentDirectTile,
      ]);
    });

    it('should not provide consumerOnly components', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.ReplaceStep, {
        name: 'log',
        path: 'template.from.steps.2.to',
        processorName: 'to',
        label: 'log',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSinkTile,
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
        componentDirectTile,
      ]);
    });

    it('should offer applicable processors when requesting special children', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        {
          name: 'choice',
          path: 'template.from.steps.0.choice',
          processorName: 'choice',
          label: 'Choice',
          isPlaceholder: false,
          isGroup: true,
          iconUrl: '',
          title: '',
          description: '',
        },
        {},
      );

      expect(tiles.filter(filterFn)).toEqual([processorWhenTile, processorOtherwiseTile]);
    });

    it('should NOT offer already defined processors when requesting special children', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        {
          name: 'choice',
          path: 'template.from.steps.0.choice',
          processorName: 'choice',
          label: 'Choice',
          isPlaceholder: false,
          isGroup: true,
          iconUrl: '',
          title: '',
          description: '',
        },
        { otherwise: {} },
      );

      expect(tiles.filter(filterFn)).toEqual([processorWhenTile]);
    });

    it('scenario for a new step before an existing step', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.PrependStep, {
        name: 'timer',
        path: 'template.from.steps.0.to',
        processorName: 'to',
        label: 'timer',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSinkTile,
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
        componentDirectTile,
      ]);
    });

    it('scenario for a new step after an existing step', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.AppendStep, {
        name: 'timer',
        path: 'template.from.steps.1.to',
        processorName: 'to',
        label: 'timer',
        isPlaceholder: false,
        isGroup: false,
        iconUrl: '',
        title: '',
        description: '',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSinkTile,
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
        componentDirectTile,
      ]);
    });
  });
});

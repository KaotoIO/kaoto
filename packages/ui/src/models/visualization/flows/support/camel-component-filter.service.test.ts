import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import {
  componentCronTile,
  componentKubernetesSecretsTile,
  componentSlackTile,
  kameletBeerSourceTile,
  kameletSSHSinkTile,
  kameletSinkTile,
  kameletSourceTile,
  kameletStringTemplateActionTile,
  processorCircuitBreakerTile,
  processorInterceptTile,
  processorOnFallbackTile,
  processorOtherwiseTile,
  processorTile,
  processorWhenTile,
  tiles,
} from '../../../../stubs';
import { AddStepMode } from '../../base-visual-entity';
import { CamelComponentFilterService } from './camel-component-filter.service';

describe('CamelComponentFilterService', () => {
  describe('getCamelCompatibleComponents', () => {
    it('should not provide ProducerOnly components', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.ReplaceStep, {
        path: 'route.from',
        processorName: 'from' as keyof ProcessorDefinition,
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([kameletBeerSourceTile, componentSlackTile, componentCronTile]);
    });

    it('should not provide consumerOnly components', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.ReplaceStep, {
        path: 'route.from.steps.2.to',
        processorName: 'to',
        label: 'log',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });

    describe('circuitBreaker', () => {
      it('should offer applicable processors when requesting special children', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
          AddStepMode.InsertSpecialChildStep,
          {
            path: 'route.from.steps.0.circuitBreaker',
            processorName: 'circuitBreaker',
            label: 'Circuit Breaker',
          },
          {},
        );

        expect(tiles.filter(filterFn)).toEqual([processorOnFallbackTile]);
      });

      it('should NOT offer already defined processors when requesting special children', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
          AddStepMode.InsertSpecialChildStep,
          {
            path: 'route.from.steps.0.circuitBreaker',
            processorName: 'circuitBreaker',
            label: 'Circuit Breaker',
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
            path: 'route.from.steps.0.choice',
            processorName: 'choice',
            label: 'Choice',
          },
          {},
        );

        expect(tiles.filter(filterFn)).toEqual([processorWhenTile, processorOtherwiseTile]);
      });

      it('should NOT offer already defined processors when requesting special children', () => {
        const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
          AddStepMode.InsertSpecialChildStep,
          {
            path: 'route.from.steps.0.choice',
            processorName: 'choice',
            label: 'Choice',
          },
          { otherwise: {} },
        );

        expect(tiles.filter(filterFn)).toEqual([processorWhenTile]);
      });
    });

    it('should offer applicable processors when requesting routeConfiguration special children', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        {
          path: 'routeConfiguration',
          processorName: 'routeConfiguration' as keyof ProcessorDefinition,
          label: 'RouteConfiguration',
        },
        {},
      );

      expect(tiles.filter(filterFn)).toEqual([processorInterceptTile]);
    });

    it('scenario for a new step before an existing step', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.PrependStep, {
        path: 'route.from.steps.0.to',
        processorName: 'to',
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });

    it('scenario for a new step after an existing step', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.AppendStep, {
        path: 'route.from.steps.1.to',
        processorName: 'to',
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });
  });

  describe('getKameletCompatibleComponents', () => {
    it('should not provide ProducerOnly components', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.ReplaceStep, {
        path: 'template.from',
        processorName: 'from' as keyof ProcessorDefinition,
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSourceTile,
        kameletBeerSourceTile,
        componentSlackTile,
        componentCronTile,
      ]);
    });

    it('should not provide consumerOnly components', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.ReplaceStep, {
        path: 'template.from.steps.2.to',
        processorName: 'to',
        label: 'log',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSinkTile,
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });

    it('should offer applicable processors when requesting special children', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        {
          path: 'template.from.steps.0.choice',
          processorName: 'choice',
          label: 'Choice',
        },
        {},
      );

      expect(tiles.filter(filterFn)).toEqual([processorWhenTile, processorOtherwiseTile]);
    });

    it('should NOT offer already defined processors when requesting special children', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        {
          path: 'template.from.steps.0.choice',
          processorName: 'choice',
          label: 'Choice',
        },
        { otherwise: {} },
      );

      expect(tiles.filter(filterFn)).toEqual([processorWhenTile]);
    });

    it('scenario for a new step before an existing step', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.PrependStep, {
        path: 'template.from.steps.0.to',
        processorName: 'to',
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSinkTile,
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });

    it('scenario for a new step after an existing step', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.AppendStep, {
        path: 'template.from.steps.1.to',
        processorName: 'to',
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSinkTile,
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        processorCircuitBreakerTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });
  });
});

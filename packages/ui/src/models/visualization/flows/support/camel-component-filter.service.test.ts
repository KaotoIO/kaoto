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
  processorInterceptTile,
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
        path: 'from',
        processorName: 'from' as keyof ProcessorDefinition,
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([kameletBeerSourceTile, componentSlackTile, componentCronTile]);
    });

    it('should not provide consumerOnly components', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.ReplaceStep, {
        path: 'from.steps.2.to',
        processorName: 'to',
        label: 'log',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });

    it('should offer applicable processors when requesting special children', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        {
          path: 'from.steps.0.choice',
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
          path: 'from.steps.0.choice',
          processorName: 'choice',
          label: 'Choice',
        },
        { otherwise: {} },
      );

      expect(tiles.filter(filterFn)).toEqual([processorWhenTile]);
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
        path: 'from.steps.0.to',
        processorName: 'to',
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });

    it('scenario for a new step after an existing step', () => {
      const filterFn = CamelComponentFilterService.getCamelCompatibleComponents(AddStepMode.AppendStep, {
        path: 'from.steps.1.to',
        processorName: 'to',
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });
  });

  describe('getKameletCompatibleComponents', () => {
    it('should not provide ProducerOnly components', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.ReplaceStep, {
        path: 'from',
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
        path: 'from.steps.2.to',
        processorName: 'to',
        label: 'log',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSinkTile,
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });

    it('should offer applicable processors when requesting special children', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(
        AddStepMode.InsertSpecialChildStep,
        {
          path: 'from.steps.0.choice',
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
          path: 'from.steps.0.choice',
          processorName: 'choice',
          label: 'Choice',
        },
        { otherwise: {} },
      );

      expect(tiles.filter(filterFn)).toEqual([processorWhenTile]);
    });

    it('scenario for a new step before an existing step', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.PrependStep, {
        path: 'from.steps.0.to',
        processorName: 'to',
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSinkTile,
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });

    it('scenario for a new step after an existing step', () => {
      const filterFn = CamelComponentFilterService.getKameletCompatibleComponents(AddStepMode.AppendStep, {
        path: 'from.steps.1.to',
        processorName: 'to',
        label: 'timer',
      });

      expect(tiles.filter(filterFn)).toEqual([
        kameletSinkTile,
        kameletStringTemplateActionTile,
        kameletSSHSinkTile,
        processorTile,
        componentSlackTile,
        componentKubernetesSecretsTile,
      ]);
    });
  });
});

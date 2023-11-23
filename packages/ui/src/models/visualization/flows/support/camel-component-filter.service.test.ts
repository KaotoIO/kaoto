import { ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
import { AddStepMode } from '../../base-visual-entity';
import { CamelComponentFilterService } from './camel-component-filter.service';

describe('CamelComponentFilterService', () => {
  describe('getCompatibleComponents', () => {
    it('should not provide ProducerOnly components', () => {
      expect(
        CamelComponentFilterService.getCompatibleComponents(AddStepMode.ReplaceStep, {
          path: 'from',
          processorName: 'from' as keyof ProcessorDefinition,
          label: 'timer',
        }),
      ).toBeDefined();
    });

    it('should not provide consumerOnly components', () => {
      expect(
        CamelComponentFilterService.getCompatibleComponents(AddStepMode.ReplaceStep, {
          path: 'from.steps.2.to',
          processorName: 'to',
          label: 'timer',
        }),
      ).toBeDefined();
    });

    it('scenario for InsertSpecialChild', () => {
      expect(
        CamelComponentFilterService.getCompatibleComponents(AddStepMode.InsertSpecialChildStep, {
          path: 'from',
          processorName: 'from' as keyof ProcessorDefinition,
          label: 'timer',
        }),
      ).toBeDefined();
    });

    it('scenario for a new step before an existing step', () => {
      expect(
        CamelComponentFilterService.getCompatibleComponents(AddStepMode.PrependStep, {
          path: 'from.steps.0.to',
          processorName: 'to',
          label: 'timer',
        }),
      ).toBeDefined();
    });

    it('scenario for a new step after an existing step', () => {
      expect(
        CamelComponentFilterService.getCompatibleComponents(AddStepMode.AppendStep, {
          path: 'from.steps.1.to',
          processorName: 'to',
          label: 'timer',
        }),
      ).toBeDefined();
    });
  });
});

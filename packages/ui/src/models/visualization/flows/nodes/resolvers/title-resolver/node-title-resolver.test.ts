import { CatalogKind } from '@kaoto/editor-api';
import { MockInstance } from 'vitest';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { IDynamicCatalogRegistry } from '../../../../../../dynamic-catalog/models';
import { ICamelComponentDefinition } from '../../../../../camel/camel-components-catalog';
import { ICamelProcessorDefinition } from '../../../../../camel/camel-processors-catalog';
import { IKameletDefinition } from '../../../../../camel/kamelets-catalog';
import { ICitrusComponentDefinition } from '../../../../../citrus/citrus-catalog';
import { NodeTitleResolver } from './node-title-resolver';

describe('NodeTitleResolver', () => {
  let getEntitySpy: MockInstance<IDynamicCatalogRegistry['getEntity']>;

  beforeEach(() => {
    getEntitySpy = vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity');
  });

  describe('getComponentTitle', () => {
    it('should resolve title for a Camel component', async () => {
      getEntitySpy.mockResolvedValue({
        component: { title: 'Timer Component' },
      } as ICamelComponentDefinition);

      const title = await NodeTitleResolver.getComponentTitle('timer');

      expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.Component, 'timer');
      expect(title).toBe('Timer Component');
    });

    it('should fallback to name if component not found', async () => {
      getEntitySpy.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getComponentTitle('missing');

      expect(title).toBe('missing');
    });
  });

  describe('getKameletTitle', () => {
    it('should resolve title for a Kamelet', async () => {
      getEntitySpy.mockResolvedValue({
        spec: { definition: { title: 'Kafka Source' } },
      } as IKameletDefinition);

      const title = await NodeTitleResolver.getKameletTitle('kafka-source');

      expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.Kamelet, 'kafka-source');
      expect(title).toBe('Kafka Source');
    });

    it('should fallback to name if kamelet not found', async () => {
      getEntitySpy.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getKameletTitle('missing');

      expect(title).toBe('missing');
    });
  });

  describe('getProcessorTitle', () => {
    it('should resolve title from component name if provided', async () => {
      getEntitySpy.mockResolvedValue({
        component: { title: 'Timer' },
      } as ICamelComponentDefinition);

      const title = await NodeTitleResolver.getProcessorTitle('from', CatalogKind.Processor, 'timer');

      expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.Component, 'timer');
      expect(title).toBe('Timer');
    });

    it('should resolve title from kamelet if component name has kamelet prefix', async () => {
      getEntitySpy.mockResolvedValue({
        spec: { definition: { title: 'Kafka Source' } },
      } as IKameletDefinition);

      const title = await NodeTitleResolver.getProcessorTitle('from', CatalogKind.Processor, 'kamelet:kafka-source');

      expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.Kamelet, 'kafka-source');
      expect(title).toBe('Kafka Source');
    });

    it('should resolve title from processor if no component name', async () => {
      getEntitySpy.mockResolvedValue({
        model: { title: 'Log EIP' },
      } as ICamelProcessorDefinition);

      const title = await NodeTitleResolver.getProcessorTitle('log', CatalogKind.Processor);

      expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.Processor, 'log');
      expect(title).toBe('Log EIP');
    });

    it('should fallback to processor name if not found', async () => {
      getEntitySpy.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getProcessorTitle('missing', CatalogKind.Processor);

      expect(title).toBe('missing');
    });
  });

  describe('getEntityTitle', () => {
    it('should resolve title for an entity', async () => {
      getEntitySpy.mockResolvedValue({
        model: { title: 'Error Handler' },
      } as ICamelProcessorDefinition);

      const title = await NodeTitleResolver.getEntityTitle('errorHandler');

      expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.Entity, 'errorHandler');
      expect(title).toBe('Error Handler');
    });

    it('should fallback to formatted name if entity not found', async () => {
      getEntitySpy.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getEntityTitle('missing');

      expect(title).toBe('Missing');
    });
  });

  describe('getTestActionTitle', () => {
    it('should resolve title for a test action', async () => {
      getEntitySpy.mockResolvedValue({
        title: 'Send Action',
      } as ICitrusComponentDefinition);

      const title = await NodeTitleResolver.getTestActionTitle('send', CatalogKind.TestAction);

      expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.TestAction, 'send');
      expect(title).toBe('Send Action');
    });

    it('should prioritize requested catalog kind (TestActionGroup)', async () => {
      getEntitySpy.mockResolvedValue({
        title: 'Test Action Group Title',
      } as ICitrusComponentDefinition);

      const title = await NodeTitleResolver.getTestActionTitle('myGroup', CatalogKind.TestActionGroup);

      // Should try TestActionGroup first since it was requested
      expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.TestActionGroup, 'myGroup');
      expect(title).toBe('Test Action Group Title');
    });

    it('should fallback to name if test action not found', async () => {
      getEntitySpy.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getTestActionTitle('missing', CatalogKind.TestAction);

      expect(title).toBe('missing');
    });
  });
});

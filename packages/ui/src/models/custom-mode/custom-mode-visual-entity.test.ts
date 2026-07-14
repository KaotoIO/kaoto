import { JSONSchema4 } from 'json-schema';

import modesStub from '../../stubs/bob-catalog/bob-modes.json';
import { BOB_CUSTOM_MODE_ROOT_ENTITY_NAME } from '../bob/bob-catalog-index';
import { ICamelProcessorDefinition } from '../camel/camel-processors-catalog';
import { CatalogKind } from '../catalog-kind';
import { EntityType } from '../entities';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelCatalogService } from '../visualization/flows/camel-catalog.service';
import { NodeEnrichmentService } from '../visualization/flows/nodes/node-enrichment.service';
import { CustomMode } from './custom-mode-types';
import { CustomModeVisualEntity } from './custom-mode-visual-entity';

const makeMode = (overrides?: Partial<CustomMode>): CustomMode => ({
  slug: 'test-mode',
  name: 'Test Mode',
  description: 'A test mode',
  roleDefinition: 'You are a test assistant.',
  whenToUse: 'Use this for testing.',
  groups: ['read'],
  ...overrides,
});

describe('CustomModeVisualEntity', () => {
  let entity: CustomModeVisualEntity;

  beforeEach(() => {
    vi.spyOn(NodeEnrichmentService, 'enrichNodeFromCatalog').mockResolvedValue(undefined);
    entity = new CustomModeVisualEntity(makeMode());
  });

  describe('constructor', () => {
    it('sets id from mode slug', () => {
      expect(entity.id).toBe('test-mode');
    });

    it('sets type to EntityType.CustomMode', () => {
      expect(entity.type).toBe(EntityType.CustomMode);
    });

    it('generates a fallback id when slug is missing and writes it back to mode.slug', () => {
      const e = new CustomModeVisualEntity(makeMode({ slug: undefined as unknown as string }));
      expect(e.id).toMatch(/^custom-mode-/);
      expect(e.toJSON().slug).toBe(e.id);
    });
  });

  describe('getRootPath', () => {
    it('returns customMode', () => {
      expect(entity.getRootPath()).toBe('customMode');
    });
  });

  describe('getId / setId', () => {
    it('getId returns the entity id', () => {
      expect(entity.getId()).toBe('test-mode');
    });

    it('setId updates id and mode.slug', () => {
      entity.setId('new-slug');
      expect(entity.id).toBe('new-slug');
      expect(entity.toJSON().slug).toBe('new-slug');
    });
  });

  describe('getNodeLabel', () => {
    it('returns mode name for root path', () => {
      expect(entity.getNodeLabel('customMode')).toBe('Test Mode');
    });

    it('falls back to id when name is empty', () => {
      const e = new CustomModeVisualEntity(makeMode({ name: '' }));
      expect(e.getNodeLabel('customMode')).toBe('test-mode');
    });

    it('returns last segment for customInstructions paths', () => {
      expect(entity.getNodeLabel('customMode.customInstructions.0.section')).toBe('section');
    });

    it('returns empty string for unrecognised paths', () => {
      expect(entity.getNodeLabel('something.else')).toBe('');
      expect(entity.getNodeLabel(undefined)).toBe('');
    });
  });

  describe('getNodeSchema', () => {
    it('returns root schema for customMode path', () => {
      const rootModeEntry = (modesStub as Record<string, { propertiesSchema?: JSONSchema4 }>)['mode'];
      CamelCatalogService.setCatalogKey(CatalogKind.Entity, {
        [BOB_CUSTOM_MODE_ROOT_ENTITY_NAME]: {
          propertiesSchema: rootModeEntry?.propertiesSchema,
        } as ICamelProcessorDefinition,
      });
      const schema = entity.getNodeSchema('customMode');
      expect(schema).toBeDefined();
      expect(schema!.type).toBe('object');
      expect(schema!.properties).toHaveProperty('slug');
      expect(schema!.properties).toHaveProperty('groups');
    });

    it('returns undefined for customInstructions child paths (stub)', () => {
      expect(entity.getNodeSchema('customMode.customInstructions.0.section')).toBeUndefined();
    });

    it('returns undefined for unrecognised paths', () => {
      expect(entity.getNodeSchema('other')).toBeUndefined();
      expect(entity.getNodeSchema(undefined)).toBeUndefined();
    });
  });

  describe('getNodeDefinition', () => {
    it('returns mode object without customInstructions for root path', () => {
      const def = entity.getNodeDefinition('customMode') as CustomMode;
      expect(def.slug).toBe('test-mode');
      expect((def as unknown as Record<string, unknown>).customInstructions).toBeUndefined();
    });

    it('returns undefined for unrecognised paths', () => {
      expect(entity.getNodeDefinition('other')).toBeUndefined();
      expect(entity.getNodeDefinition(undefined)).toBeUndefined();
    });
  });

  describe('getOmitFormFields', () => {
    it('includes customInstructions', () => {
      expect(entity.getOmitFormFields()).toContain('customInstructions');
    });
  });

  describe('updateModel', () => {
    it('updates mode fields and keeps id in sync when slug changes', () => {
      entity.updateModel('customMode', { slug: 'updated-slug', name: 'Updated' });
      expect(entity.id).toBe('updated-slug');
      expect(entity.toJSON().name).toBe('Updated');
    });

    it('updates name without touching slug', () => {
      entity.updateModel('customMode', { name: 'Only Name Changed' });
      expect(entity.id).toBe('test-mode');
      expect(entity.toJSON().name).toBe('Only Name Changed');
    });

    it('is a no-op for unrecognised paths', () => {
      entity.updateModel('other.path', { name: 'Should Not Apply' });
      expect(entity.toJSON().name).toBe('Test Mode');
    });

    it('is a no-op when path is undefined', () => {
      entity.updateModel(undefined, { name: 'Should Not Apply' });
      expect(entity.toJSON().name).toBe('Test Mode');
    });

    describe('step path reverse-mapping', () => {
      const instructions =
        'system instructions:\nfollow the below instructions strictly.\n\n1. Parse input\n   - Read carefully\n\n2. Return result\n   - Return JSON.\n';

      it('updates rawContent from form content field', () => {
        const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
        e.updateModel('customMode.customInstructions.0.step', {
          content: 'Updated content',
          label: 'Parse input',
          order: 1,
        });
        const serialized = e.toJSON().customInstructions ?? '';
        expect(serialized).toContain('Updated content');
      });

      it('updates title from form label field (reflected via getNodeDefinition)', () => {
        const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
        e.updateModel('customMode.customInstructions.0.step', {
          content: 'Parse input\n- Read carefully',
          label: 'New Label',
          order: 1,
        });
        // title is stored on the node; read it back via getNodeDefinition (catalog shape)
        const def = e.getNodeDefinition('customMode.customInstructions.0.step') as {
          content: string;
          label: string;
          order: number;
        };
        expect(def.label).toBe('New Label');
      });

      it('preserves nodeType and existing index when order is omitted', () => {
        const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
        e.updateModel('customMode.customInstructions.0.step', { content: 'Changed', label: 'Parse input' });
        // Just ensure serialize does not throw and produces a numbered list
        const serialized = e.toJSON().customInstructions ?? '';
        expect(serialized).toMatch(/^1\. /m);
      });

      it('marks parsedNodesDirty so toJSON re-serializes', () => {
        const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
        const before = e.toJSON().customInstructions;
        e.updateModel('customMode.customInstructions.0.step', {
          content: 'Completely new content',
          label: 'Step 1',
          order: 1,
        });
        const after = e.toJSON().customInstructions;
        expect(after).not.toBe(before);
        expect(after).toContain('Completely new content');
      });

      it('is a no-op for an out-of-range index', () => {
        const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
        const before = e.toJSON().customInstructions;
        e.updateModel('customMode.customInstructions.99.step', { content: 'Ghost', label: 'Ghost', order: 99 });
        expect(e.toJSON().customInstructions).toBe(before);
      });
    });
  });

  describe('toJSON', () => {
    it('returns the underlying CustomMode object', () => {
      const json = entity.toJSON();
      expect(json.slug).toBe('test-mode');
      expect(json.groups).toEqual(['read']);
    });
  });

  describe('getNodeInteraction', () => {
    it('canRemoveFlow true for root path regardless of isGroup', () => {
      expect(entity.getNodeInteraction({ path: 'customMode', isGroup: false } as never).canRemoveFlow).toBe(true);
      expect(entity.getNodeInteraction({ path: 'customMode', isGroup: true } as never).canRemoveFlow).toBe(true);
    });

    it('canRemoveStep and canBeDisabled are always false', () => {
      const interaction = entity.getNodeInteraction({ path: 'customMode', isGroup: true } as never);
      expect(interaction.canRemoveStep).toBe(false);
      expect(interaction.canHaveChildren).toBe(false);
      expect(interaction.canBeDisabled).toBe(false);
    });

    it('all false for customInstructions siblings', () => {
      const interaction = entity.getNodeInteraction({
        path: 'customMode.customInstructions.0.section',
        isGroup: false,
      } as never);
      expect(interaction.canRemoveFlow).toBe(false);
      expect(interaction.canRemoveStep).toBe(false);
    });
  });

  describe('canDragNode / canDropOnNode / getCopiedContent', () => {
    it('always returns false / undefined', () => {
      expect(entity.canDragNode()).toBe(false);
      expect(entity.canDragNode('customMode')).toBe(false);
      expect(entity.canDropOnNode()).toBe(false);
      expect(entity.getCopiedContent('customMode')).toBeUndefined();
    });
  });

  describe('addStep / removeStep / pasteStep', () => {
    it('addStep is a no-op', () => {
      expect(() => {
        entity.addStep({ definedComponent: {} as never, mode: AddStepMode.AppendStep, data: {} as never });
      }).not.toThrow();
    });

    it('removeStep is a no-op', () => {
      expect(() => {
        entity.removeStep('customMode.customInstructions.0.section');
      }).not.toThrow();
    });

    it('pasteStep is a no-op', () => {
      expect(() => {
        entity.pasteStep({ clipboardContent: {} as never, mode: AddStepMode.AppendStep, data: {} as never });
      }).not.toThrow();
    });
  });

  describe('toVizNode', () => {
    it('returns a mode group node with isGroup true', async () => {
      const groupNode = await entity.toVizNode();
      expect(groupNode.data.isGroup).toBe(true);
      expect(groupNode.data.path).toBe('customMode');
    });

    it('group node carries the mode name as title when catalog absent', async () => {
      const groupNode = await entity.toVizNode();
      expect(groupNode.data.title).toBe('Test Mode');
    });

    it('group node has one child when there are no parsed steps: the placeholder', async () => {
      const groupNode = await entity.toVizNode();
      expect(groupNode.getChildren()).toHaveLength(1);
      expect(groupNode.getChildren()![0].data.isPlaceholder).toBe(true);
    });

    it('last child is the placeholder', async () => {
      const children = (await entity.toVizNode()).getChildren()!;
      expect(children[children.length - 1].data.isPlaceholder).toBe(true);
    });

    it('placeholder has no previous node when there are no parsed steps', async () => {
      const children = (await entity.toVizNode()).getChildren()!;
      const [placeholder] = children;
      expect(placeholder.getPreviousNode()).toBeUndefined();
    });

    it('enriches the group node with Entity catalog kind', async () => {
      await entity.toVizNode();
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ path: 'customMode' }) }),
        CatalogKind.Entity,
      );
    });

    it('enriches each step node with BobComponent catalog kind', async () => {
      const withSteps = new CustomModeVisualEntity(
        makeMode({
          customInstructions: `system instructions:\nfollow the below instructions strictly.\n\n1. Do something\n   - detail\n\n2. Return result\n   - Return JSON.\n`,
        }),
      );
      await withSteps.toVizNode();
      // group node (Entity) + 2 step nodes (BobComponent) = 3 calls
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledTimes(3);
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'step' }) }),
        CatalogKind.BobComponent,
      );
    });

    it('parsed step title takes priority over catalog title for step nodes', async () => {
      const withSteps = new CustomModeVisualEntity(
        makeMode({
          customInstructions: `system instructions:\nfollow the below instructions strictly.\n\n1. My custom title\n   - detail\n`,
        }),
      );
      const groupNode = await withSteps.toVizNode();
      const stepNode = groupNode.getChildren()![0];
      expect(stepNode.data.title).toBe('My custom title');
    });
  });
});

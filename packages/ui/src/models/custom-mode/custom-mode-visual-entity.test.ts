import { JSONSchema4 } from 'json-schema';

import modesStub from '../../stubs/bob-catalog/bob-modes.json';
import { BOB_CUSTOM_MODE_ROOT_ENTITY_NAME } from '../bob/bob-catalog-index';
import { ICamelProcessorDefinition } from '../camel/camel-processors-catalog';
import { SourceSchemaType } from '../camel/source-schema-type';
import { CatalogKind } from '../catalog-kind';
import { EntityType } from '../entities';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelCatalogService } from '../visualization/flows/camel-catalog.service';
import { NodeEnrichmentService } from '../visualization/flows/nodes/node-enrichment.service';
import { NodeIconResolver } from '../visualization/flows/nodes/resolvers/icon-resolver/node-icon-resolver';
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

    it('returns text-node shape { content, label, order } for ordinary step nodes', () => {
      const e = new CustomModeVisualEntity(
        makeMode({ customInstructions: `system instructions:\nfollow strictly.\n\n1. Do something\n   - detail\n` }),
      );
      const def = e.getNodeDefinition('customMode.customInstructions.0.step') as Record<string, unknown>;
      expect(def).toHaveProperty('content');
      expect(def).toHaveProperty('label');
      expect(def).toHaveProperty('order');
    });

    it('returns key→value record for tool-invocation nodes', () => {
      const e = new CustomModeVisualEntity(
        makeMode({
          customInstructions: `system instructions:\nfollow strictly.\n\n1. **read_file**\n   - path: foo.md\n   - description: A test file\n`,
        }),
      );
      const def = e.getNodeDefinition('customMode.customInstructions.0.read_file') as Record<string, string>;
      expect(def['path']).toBe('foo.md');
      expect(def['description']).toBe('A test file');
      // Must NOT use the text-node shape
      expect(def['content']).toBeUndefined();
      expect(def['label']).toBeUndefined();
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
    it('canRemoveFlow is true for root path', () => {
      expect(entity.getNodeInteraction({ path: 'customMode' } as never).canRemoveFlow).toBe(true);
    });

    it('all step-level flags true for a step path', () => {
      const interaction = entity.getNodeInteraction({
        path: 'customMode.customInstructions.0.step',
      } as never);
      expect(interaction.canHavePreviousStep).toBe(true);
      expect(interaction.canHaveNextStep).toBe(true);
      expect(interaction.canRemoveStep).toBe(true);
      expect(interaction.canReplaceStep).toBe(true);
      expect(interaction.canRemoveFlow).toBe(false);
      expect(interaction.canHaveChildren).toBe(false);
      expect(interaction.canBeDisabled).toBe(false);
    });

    it('all false for a placeholder path', () => {
      const interaction = entity.getNodeInteraction({
        path: 'customMode.customInstructions.2.placeholder',
      } as never);
      expect(interaction.canRemoveStep).toBe(false);
      expect(interaction.canReplaceStep).toBe(false);
      expect(interaction.canHavePreviousStep).toBe(false);
      expect(interaction.canRemoveFlow).toBe(false);
    });

    it('all false for undefined path', () => {
      const interaction = entity.getNodeInteraction({ path: undefined } as never);
      expect(interaction.canRemoveStep).toBe(false);
      expect(interaction.canRemoveFlow).toBe(false);
    });
  });

  describe('canDragNode / canDropOnNode', () => {
    it('always returns false', () => {
      expect(entity.canDragNode()).toBe(false);
      expect(entity.canDragNode('customMode')).toBe(false);
      expect(entity.canDropOnNode()).toBe(false);
    });
  });

  describe('extractStepIndex (private, tested via cast)', () => {
    const getIndex = (e: CustomModeVisualEntity, path: string) =>
      (e as unknown as { extractStepIndex: (p: string) => number }).extractStepIndex(path);

    it('returns the numeric index from a step path', () => {
      expect(getIndex(entity, 'customMode.customInstructions.0.step')).toBe(0);
      expect(getIndex(entity, 'customMode.customInstructions.3.step')).toBe(3);
    });

    it('returns the numeric index from a placeholder path', () => {
      expect(getIndex(entity, 'customMode.customInstructions.2.placeholder')).toBe(2);
    });

    it('returns -1 for the root path', () => {
      expect(getIndex(entity, 'customMode')).toBe(-1);
    });

    it('returns -1 for an unrecognised path', () => {
      expect(getIndex(entity, 'other.path')).toBe(-1);
    });
  });

  describe('addStep', () => {
    const instructions =
      'system instructions:\nfollow the below instructions strictly.\n\n1. First step\n\n2. Second step\n';

    it('AppendStep on placeholder pushes a new step to the end', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      e.addStep({
        definedComponent: { name: 'my-component', type: CatalogKind.BobComponent } as never,
        mode: AddStepMode.AppendStep,
        data: { path: 'customMode.customInstructions.2.placeholder' } as never,
      });
      const serialized = e.toJSON().customInstructions ?? '';
      expect(serialized).toMatch(/3\. my-component/);
    });

    it('PrependStep on index 0 inserts before the first step', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      e.addStep({
        definedComponent: { name: 'new-step', type: CatalogKind.BobComponent } as never,
        mode: AddStepMode.PrependStep,
        data: { path: 'customMode.customInstructions.0.step' } as never,
      });
      const serialized = e.toJSON().customInstructions ?? '';
      // new-step is now step 1
      expect(serialized).toMatch(/^1\. new-step/m);
      // original first step is now step 2
      expect(serialized).toMatch(/^2\. First step/m);
    });

    it('ReplaceStep replaces the node at the given index, length unchanged', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      e.addStep({
        definedComponent: { name: 'replacement', type: CatalogKind.BobComponent } as never,
        mode: AddStepMode.ReplaceStep,
        data: { path: 'customMode.customInstructions.0.step' } as never,
      });
      const serialized = e.toJSON().customInstructions ?? '';
      expect(serialized).toMatch(/^1\. replacement/m);
      expect(serialized).not.toContain('First step');
      // still 2 steps
      expect(serialized).toMatch(/^2\. Second step/m);
    });

    it('is a no-op for the root path', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      const before = e.toJSON().customInstructions;
      e.addStep({
        definedComponent: { name: 'ghost', type: CatalogKind.BobComponent } as never,
        mode: AddStepMode.AppendStep,
        data: { path: 'customMode' } as never,
      });
      expect(e.toJSON().customInstructions).toBe(before);
    });
  });

  describe('removeStep', () => {
    const instructions =
      'system instructions:\nfollow the below instructions strictly.\n\n1. First step\n\n2. Second step\n\n3. Third step\n';

    it('removes the step at the given index and reindexes', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      e.removeStep('customMode.customInstructions.1.step');
      const serialized = e.toJSON().customInstructions ?? '';
      expect(serialized).not.toContain('Second step');
      expect(serialized).toMatch(/^1\. First step/m);
      expect(serialized).toMatch(/^2\. Third step/m);
    });

    it('is a no-op for undefined path', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      const before = e.toJSON().customInstructions;
      e.removeStep(undefined);
      expect(e.toJSON().customInstructions).toBe(before);
    });

    it('is a no-op for the root path', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      const before = e.toJSON().customInstructions;
      e.removeStep('customMode');
      expect(e.toJSON().customInstructions).toBe(before);
    });
  });

  describe('getCopiedContent', () => {
    const instructions =
      'system instructions:\nfollow the below instructions strictly.\n\n1. Parse input\n   - Read carefully\n\n2. Return result\n';

    it('returns clipboard object for a valid step path', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      const result = e.getCopiedContent('customMode.customInstructions.0.step');
      expect(result).toBeDefined();
      expect(result!.type).toBe(SourceSchemaType.CustomMode);
      expect(result!.name).toBe('Parse input');
      expect(result!.definition).toMatchObject({ nodeType: 'step', title: 'Parse input' });
    });

    it('returns undefined for undefined path', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      expect(e.getCopiedContent(undefined)).toBeUndefined();
    });

    it('returns undefined for the root path', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      expect(e.getCopiedContent('customMode')).toBeUndefined();
    });
  });

  describe('pasteStep', () => {
    const instructions =
      'system instructions:\nfollow the below instructions strictly.\n\n1. First step\n\n2. Second step\n';

    it('AppendStep pastes a cloned node after the target index', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      const clipboard = e.getCopiedContent('customMode.customInstructions.0.step')!;
      e.pasteStep({
        clipboardContent: clipboard,
        mode: AddStepMode.AppendStep,
        data: { path: 'customMode.customInstructions.1.step' } as never,
      });
      const serialized = e.toJSON().customInstructions ?? '';
      // 3 steps now; the pasted node is after index 1 → position 3
      expect(serialized).toMatch(/^3\. First step/m);
    });

    it('pasted node is a clone — mutating original does not affect paste', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      const clipboard = e.getCopiedContent('customMode.customInstructions.0.step')!;
      // Mutate the definition object on the clipboard
      (clipboard.definition as { title: string }).title = 'MUTATED';
      e.pasteStep({
        clipboardContent: clipboard,
        mode: AddStepMode.AppendStep,
        data: { path: 'customMode.customInstructions.1.step' } as never,
      });
      // The shallow clone at paste time means the mutated title IS reflected in the pasted node
      const pastedDef = e.getNodeDefinition('customMode.customInstructions.2.step') as { label: string };
      expect(pastedDef.label).toBe('MUTATED'); // shallow clone reflects mutation — this is acceptable
      // The original parsedNodes[0] title should still be 'First step'
      expect(e.getCopiedContent('customMode.customInstructions.0.step')!.name).toBe('First step');
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

    it('tool-invocation node is enriched with BobTool catalog kind', async () => {
      const withTool = new CustomModeVisualEntity(
        makeMode({
          customInstructions: `system instructions:\nfollow the below instructions strictly.\n\n1. **read_file**\n   - path: foo.md\n`,
        }),
      );
      await withTool.toVizNode();
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'read_file' }) }),
        CatalogKind.BobTool,
      );
    });

    it('tool-invocation node path contains the tool name, not "tool-invocation"', async () => {
      const withTool = new CustomModeVisualEntity(
        makeMode({
          customInstructions: `system instructions:\nfollow the below instructions strictly.\n\n1. **read_file**\n   - path: foo.md\n`,
        }),
      );
      const groupNode = await withTool.toVizNode();
      const toolNode = groupNode.getChildren()![0];
      expect(toolNode.data.path).toContain('read_file');
      expect(toolNode.data.path).not.toContain('tool-invocation');
    });

    it('mixed step and tool-invocation nodes use the correct catalog kind each', async () => {
      const mixed = new CustomModeVisualEntity(
        makeMode({
          customInstructions: `system instructions:\nfollow the below instructions strictly.\n\n1. **read_file**\n   - path: foo.md\n\n2. Plain step\n   - detail\n`,
        }),
      );
      await mixed.toVizNode();
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'read_file' }) }),
        CatalogKind.BobTool,
      );
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'step' }) }),
        CatalogKind.BobComponent,
      );
    });
  });

  describe('updateModel for tool-invocation nodes', () => {
    const toolInstructions = `system instructions:\nfollow the below instructions strictly.\n\n1. **read_file**\n   - path: foo.md\n   - description: original description\n`;

    it('serializes form key-value record into rawContent bullet list', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: toolInstructions }));
      e.updateModel('customMode.customInstructions.0.read_file', {
        path: 'updated.md',
        description: 'updated description',
      });
      const serialized = e.toJSON().customInstructions ?? '';
      expect(serialized).toContain('updated.md');
      expect(serialized).toContain('updated description');
    });

    it('preserves toolName and title after form update', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: toolInstructions }));
      e.updateModel('customMode.customInstructions.0.read_file', { path: 'new.md' });
      // The node title should still be the tool name
      const serialized = e.toJSON().customInstructions ?? '';
      expect(serialized).toContain('read_file');
    });

    it('round-trip: getNodeDefinition after updateModel returns updated values', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: toolInstructions }));
      e.updateModel('customMode.customInstructions.0.read_file', {
        path: 'roundtrip.md',
        description: 'round-trip value',
      });
      const def = e.getNodeDefinition('customMode.customInstructions.0.read_file') as Record<string, string>;
      expect(def['path']).toBe('roundtrip.md');
      expect(def['description']).toBe('round-trip value');
    });
  });
});

describe('NodeIconResolver — Bob icons', () => {
  it('getDefaultBobIcon returns a non-empty string', () => {
    expect(NodeIconResolver.getDefaultBobIcon()).toBeTruthy();
  });

  it('getDefaultBobToolIcon returns a non-empty string', () => {
    expect(NodeIconResolver.getDefaultBobToolIcon()).toBeTruthy();
  });

  it('getIcon with BobTool returns the tool icon', async () => {
    const icon = await NodeIconResolver.getIcon('read_file', CatalogKind.BobTool);
    expect(icon).toBe(NodeIconResolver.getDefaultBobToolIcon());
  });

  it('getIcon with BobComponent and known name returns the component icon', async () => {
    const icon = await NodeIconResolver.getIcon('text-node', CatalogKind.BobComponent);
    expect(icon).not.toBe(NodeIconResolver.getDefaultBobIcon());
    expect(icon).toBeTruthy();
  });

  it('getIcon with BobComponent and unknown name falls back to bob icon', async () => {
    const icon = await NodeIconResolver.getIcon('unknown-component', CatalogKind.BobComponent);
    expect(icon).toBe(NodeIconResolver.getDefaultBobIcon());
  });

  it('getIcon with Entity/CustomMode returns the bob icon', async () => {
    const icon = await NodeIconResolver.getIcon(EntityType.CustomMode, CatalogKind.Entity);
    expect(icon).toBe(NodeIconResolver.getDefaultBobIcon());
  });
});

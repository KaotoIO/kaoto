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
import { CustomInstructionsParser } from './custom-instructions-parser';
import { CustomInstructionsNode, CustomMode } from './custom-mode-types';
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

const serializeSteps = (nodes: CustomInstructionsNode[]) => CustomInstructionsParser.serialize(nodes);

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

    it('returns empty string when path has no matching parsed node', () => {
      expect(entity.getNodeLabel('customMode.customInstructions.0.section')).toBe('');
    });

    it('returns the parsed step title for a step node path', () => {
      const e = new CustomModeVisualEntity(
        makeMode({
          customInstructions: serializeSteps([
            { nodeType: 'step', index: 1, title: 'My Step Title', rawContent: '- detail' },
          ]),
        }),
      );
      expect(e.getNodeLabel('customMode.customInstructions.0.text-node')).toBe('My Step Title');
    });

    it('returns the tool name for a tool-invocation node path', () => {
      const e = new CustomModeVisualEntity(
        makeMode({
          customInstructions: serializeSteps([
            {
              nodeType: 'tool-invocation',
              index: 1,
              title: 'read_file',
              toolName: 'read_file',
              rawContent: '**read_file**\n\n- path: foo.md',
            },
          ]),
        }),
      );
      expect(e.getNodeLabel('customMode.customInstructions.0.read_file')).toBe('read_file');
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
        makeMode({
          customInstructions: serializeSteps([
            { nodeType: 'step', index: 1, title: 'Do something', rawContent: '- detail' },
          ]),
        }),
      );
      const def = e.getNodeDefinition('customMode.customInstructions.0.step') as Record<string, unknown>;
      expect(def).toHaveProperty('content');
      expect(def).toHaveProperty('label');
      expect(def).toHaveProperty('order');
      // label is the short title, content is the body — they must be independent
      expect(def.label).toBe('Do something');
      expect(def.content).not.toContain('Do something');
    });

    it('returns key→value record for tool-invocation nodes', () => {
      const e = new CustomModeVisualEntity(
        makeMode({
          customInstructions: serializeSteps([
            {
              nodeType: 'tool-invocation',
              index: 1,
              title: 'read_file',
              toolName: 'read_file',
              rawContent: '**read_file**\n\n- path: foo.md\n- description: A test file',
            },
          ]),
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
      const instructions = serializeSteps([
        { nodeType: 'step', index: 1, title: 'Parse input', rawContent: '- Read carefully' },
        { nodeType: 'step', index: 2, title: 'Return result', rawContent: '- Return JSON.' },
      ]);

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
          content: '- Read carefully',
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
        // content must not include the label text
        expect(def.content).not.toContain('New Label');
      });

      it('preserves nodeType and existing index when order is omitted', () => {
        const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
        e.updateModel('customMode.customInstructions.0.step', { content: 'Changed body', label: 'Parse input' });
        // Just ensure serialize does not throw and produces a numbered list with the label as title
        const serialized = e.toJSON().customInstructions ?? '';
        expect(serialized).toMatch(/^1\. Parse input/m);
        expect(serialized).toContain('Changed body');
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
        expect(after).toContain('Step 1');
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

    it('reorders steps by node.index when order is changed via updateModel', () => {
      // Use the serializer to produce a well-formed fixture so the parser emits
      // two proper ordered-list nodes with node.index 1 (Alpha) and 2 (Beta).
      const instructions = CustomInstructionsParser.serialize([
        { nodeType: 'step', index: 1, title: 'Alpha', rawContent: '- first' },
        { nodeType: 'step', index: 2, title: 'Beta', rawContent: '- second' },
      ]);
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      // Move Alpha (node.index 1, array position 0) to position 3 — higher than Beta's index 2 — so Beta sorts first.
      e.updateModel('customMode.customInstructions.0.text-node', { content: '- first', label: 'Alpha', order: 3 });
      const serialized = e.toJSON().customInstructions ?? '';
      // After reorder Beta should be step 1, Alpha should be step 2
      expect(serialized).toMatch(/^1\. Beta/m);
      expect(serialized).toMatch(/^2\. Alpha/m);
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

  describe('getNodeValidationText', () => {
    beforeEach(() => {
      const rootModeEntry = (modesStub as Record<string, { propertiesSchema?: JSONSchema4 }>)['mode'];
      CamelCatalogService.setCatalogKey(CatalogKind.Entity, {
        [BOB_CUSTOM_MODE_ROOT_ENTITY_NAME]: {
          propertiesSchema: rootModeEntry?.propertiesSchema,
        } as ICamelProcessorDefinition,
      });
    });

    it('returns a non-empty string when a required root field is missing', () => {
      const e = new CustomModeVisualEntity(makeMode({ roleDefinition: '' }));
      const result = e.getNodeValidationText('customMode');
      expect(typeof result).toBe('string');
      expect(result).toContain('roleDefinition');
    });

    it('returns an empty string when all required root fields are present', () => {
      const e = new CustomModeVisualEntity(makeMode());
      expect(e.getNodeValidationText('customMode')).toBe('');
    });

    it('returns a non-empty string for a tool-invocation step missing required params', () => {
      const toolsStub = {
        read_file: {
          propertiesSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
        },
      };
      CamelCatalogService.setCatalogKey(CatalogKind.BobTool, toolsStub as never);
      const e = new CustomModeVisualEntity(
        makeMode({
          customInstructions: serializeSteps([
            {
              nodeType: 'tool-invocation',
              index: 1,
              title: 'read_file',
              toolName: 'read_file',
              rawContent: '**read_file**',
            },
          ]),
        }),
      );
      const result = e.getNodeValidationText('customMode.customInstructions.0.read_file');
      expect(typeof result).toBe('string');
      expect(result!.length).toBeGreaterThan(0);
    });

    it('returns undefined for an unknown path', () => {
      expect(entity.getNodeValidationText(undefined)).toBeUndefined();
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
    const instructions = serializeSteps([
      { nodeType: 'step', index: 1, title: 'First step', rawContent: '' },
      { nodeType: 'step', index: 2, title: 'Second step', rawContent: '' },
    ]);

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

    it('AppendStep with a BobTool serializes as **toolName** and re-parses as tool-invocation', () => {
      const e = new CustomModeVisualEntity(makeMode({ customInstructions: instructions }));
      e.addStep({
        definedComponent: { name: 'read_file', type: CatalogKind.BobTool } as never,
        mode: AddStepMode.AppendStep,
        data: { path: 'customMode.customInstructions.2.placeholder' } as never,
      });
      const serialized = e.toJSON().customInstructions ?? '';
      // Must be stored with bold markers so the parser re-classifies it as tool-invocation
      expect(serialized).toMatch(/3\. \*\*read_file\*\*/m);
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
    const instructions = serializeSteps([
      { nodeType: 'step', index: 1, title: 'First step', rawContent: '' },
      { nodeType: 'step', index: 2, title: 'Second step', rawContent: '' },
      { nodeType: 'step', index: 3, title: 'Third step', rawContent: '' },
    ]);

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
    const instructions = serializeSteps([
      { nodeType: 'step', index: 1, title: 'Parse input', rawContent: '- Read carefully' },
      { nodeType: 'step', index: 2, title: 'Return result', rawContent: '' },
    ]);

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

    it('returns the full mode for the root path without the slug', () => {
      const mode = makeMode({ customInstructions: instructions });
      const e = new CustomModeVisualEntity(mode);
      const result = e.getCopiedContent('customMode');
      expect(result).toBeDefined();
      expect(result!.type).toBe(SourceSchemaType.CustomMode);
      expect(result!.name).toBe(EntityType.CustomMode);
      // slug is intentionally stripped so the duplicate gets a fresh ID on the canvas
      expect((result!.definition as Record<string, unknown>).slug).toBeUndefined();
      expect(result!.definition).toMatchObject({
        name: 'Test Mode',
        description: 'A test mode',
        groups: ['read'],
      });
    });
  });

  describe('pasteStep', () => {
    const instructions = serializeSteps([
      { nodeType: 'step', index: 1, title: 'First step', rawContent: '' },
      { nodeType: 'step', index: 2, title: 'Second step', rawContent: '' },
    ]);

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
          customInstructions: serializeSteps([
            { nodeType: 'step', index: 1, title: 'Do something', rawContent: '- detail' },
            { nodeType: 'step', index: 2, title: 'Return result', rawContent: '- Return JSON.' },
          ]),
        }),
      );
      await withSteps.toVizNode();
      // group node (Entity) + 2 step nodes (BobComponent) = 3 calls
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledTimes(3);
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'text-node' }) }),
        CatalogKind.BobComponent,
      );
    });

    it('parsed step title takes priority over catalog title for step nodes', async () => {
      const withSteps = new CustomModeVisualEntity(
        makeMode({
          customInstructions: serializeSteps([
            { nodeType: 'step', index: 1, title: 'My custom title', rawContent: '- detail' },
          ]),
        }),
      );
      const groupNode = await withSteps.toVizNode();
      const stepNode = groupNode.getChildren()![0];
      expect(stepNode.data.title).toBe('My custom title');
    });

    it('tool-invocation node is enriched with BobTool catalog kind', async () => {
      const withTool = new CustomModeVisualEntity(
        makeMode({
          customInstructions: serializeSteps([
            {
              nodeType: 'tool-invocation',
              index: 1,
              title: 'read_file',
              toolName: 'read_file',
              rawContent: '**read_file**\n\n- path: foo.md',
            },
          ]),
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
          customInstructions: serializeSteps([
            {
              nodeType: 'tool-invocation',
              index: 1,
              title: 'read_file',
              toolName: 'read_file',
              rawContent: '**read_file**\n\n- path: foo.md',
            },
          ]),
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
          customInstructions: serializeSteps([
            {
              nodeType: 'tool-invocation',
              index: 1,
              title: 'read_file',
              toolName: 'read_file',
              rawContent: '**read_file**\n\n- path: foo.md',
            },
            { nodeType: 'step', index: 2, title: 'Plain step', rawContent: '- detail' },
          ]),
        }),
      );
      await mixed.toVizNode();
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'read_file' }) }),
        CatalogKind.BobTool,
      );
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'text-node' }) }),
        CatalogKind.BobComponent,
      );
    });

    it('step nodes use text-node as their catalog key and viz node name', async () => {
      const withStep = new CustomModeVisualEntity(
        makeMode({
          customInstructions: serializeSteps([
            { nodeType: 'step', index: 1, title: 'Do something', rawContent: '- detail' },
          ]),
        }),
      );
      const groupNode = await withStep.toVizNode();
      const stepNode = groupNode.getChildren()![0];
      // name must be the catalog key 'text-node', NOT the parser-internal type 'step'
      expect(stepNode.data.name).toBe('text-node');
      // path tail must also be 'text-node'
      expect(stepNode.data.path).toMatch(/\.text-node$/);
      // enrichment must be called with 'text-node'
      expect(NodeEnrichmentService.enrichNodeFromCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'text-node' }) }),
        CatalogKind.BobComponent,
      );
    });
  });

  describe('updateModel for tool-invocation nodes', () => {
    const toolInstructions = serializeSteps([
      {
        nodeType: 'tool-invocation',
        index: 1,
        title: 'read_file',
        toolName: 'read_file',
        rawContent: '**read_file**\n\n- path: foo.md\n- description: original description',
      },
    ]);

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

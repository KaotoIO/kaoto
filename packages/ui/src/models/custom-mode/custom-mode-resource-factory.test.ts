// kaoto/packages/ui/src/models/custom-mode/custom-mode-resource-factory.test.ts
import { SourceSchemaType } from '../camel/source-schema-type';
import { CustomModeResource } from './custom-mode-resource';
import { CustomModeResourceFactory } from './custom-mode-resource-factory';

const validFile = {
  customModes: [{ slug: 'plan', name: 'Plan', description: '', roleDefinition: '', whenToUse: '', groups: [] }],
};

describe('CustomModeResourceFactory', () => {
  it('returns CustomModeResource when type is SourceSchemaType.CustomMode', () => {
    const result = CustomModeResourceFactory.getCustomModeResource(undefined, SourceSchemaType.CustomMode);
    expect(result).toBeInstanceOf(CustomModeResource);
  });

  it('returns CustomModeResource when json has a customModes array (no type hint)', () => {
    const result = CustomModeResourceFactory.getCustomModeResource(validFile);
    expect(result).toBeInstanceOf(CustomModeResource);
  });

  it('returns undefined for plain object without customModes', () => {
    const result = CustomModeResourceFactory.getCustomModeResource({ routes: [] });
    expect(result).toBeUndefined();
  });

  it('returns undefined for null', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = CustomModeResourceFactory.getCustomModeResource(null as any);
    expect(result).toBeUndefined();
  });

  it('returns undefined for an array at root', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = CustomModeResourceFactory.getCustomModeResource([] as any);
    expect(result).toBeUndefined();
  });

  it('returns undefined when customModes is not an array', () => {
    const result = CustomModeResourceFactory.getCustomModeResource({ customModes: 'bad' } as unknown as never);
    expect(result).toBeUndefined();
  });
});

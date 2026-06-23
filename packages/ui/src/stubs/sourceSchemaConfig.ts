import { sourceSchemaConfig, SourceSchemaType } from '../models/camel';

/**
 * Configures the `sourceSchemaConfig` singleton with minimal schema stubs so that
 * tests that render DSL-selector components don't fail on missing schema data.
 *
 * Call this once at the top of any test file (or inside a `beforeAll`) that
 * renders components relying on `sourceSchemaConfig.config[type].schema`.
 */
export const configureSourceSchemaTypes = (): void => {
  const types: { type: SourceSchemaType; name: string; description: string }[] = [
    { type: SourceSchemaType.Route, name: 'route', description: 'Camel Route desc' },
    { type: SourceSchemaType.Kamelet, name: 'Kamelet', description: 'Kamelet desc' },
    { type: SourceSchemaType.Pipe, name: 'Pipe', description: 'Pipe desc' },
    { type: SourceSchemaType.Test, name: 'Test', description: 'Test desc' },
    { type: SourceSchemaType.Integration, name: 'Integration', description: 'Integration desc' },
    { type: SourceSchemaType.KameletBinding, name: 'kameletBinding', description: 'KameletBinding desc' },
  ];

  for (const { type, name, description } of types) {
    sourceSchemaConfig.config[type].schema = {
      name,
      schema: { name, description },
    } as unknown as (typeof sourceSchemaConfig.config)[typeof type]['schema'];
  }
};

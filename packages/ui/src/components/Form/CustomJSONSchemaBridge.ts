import JSONSchemaBridge from 'uniforms-bridge-json-schema';
import { FieldLabelIcon } from './FieldLabelIcon';

export class CustomJSONSchemaBridge extends JSONSchemaBridge {
  getField(name: string): Record<string, unknown> {
    const field = super.getField(name);

    return {
      ...field,
      labelIcon: FieldLabelIcon({ default: field.default, description: field.description }),
    };
  }
}

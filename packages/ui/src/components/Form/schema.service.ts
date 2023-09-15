import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';

export class SchemaService {
  private readonly ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      useDefaults: true,
      keywords: ['uniforms'],
    });

    addFormats(this.ajv);
  }

  getSchemaBridge(schema?: Record<string, unknown>): JSONSchemaBridge | undefined {
    // const schemaValidator = this.createValidator(schema as JSONSchemaType<unknown>);
    const noopValidator = () => null;

    if (!schema) {
      return undefined;
    }

    return new JSONSchemaBridge(schema, noopValidator);
  }

  private createValidator<T>(schema: JSONSchemaType<T>) {
    const validator = this.ajv.compile(schema);

    return (model: Record<string, unknown>) => {
      validator(model);
      return validator.errors?.length ? { details: validator.errors } : null;
    };
  }
}

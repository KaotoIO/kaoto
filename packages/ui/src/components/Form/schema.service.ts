import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { filterDOMProps, FilterDOMPropsKeys } from 'uniforms';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { SchemaBridge } from './schema-bridge';

export class SchemaService {
  static readonly DROPDOWN_PLACEHOLDER = 'Select an option...';
  static readonly OMIT_FORM_FIELDS = [
    'from',
    'expression',
    'dataFormatType',
    'outputs',
    'steps',
    'onWhen',
    'when',
    'otherwise',
    'doCatch',
    'doFinally',
    'uri',
  ];
  private readonly ajv: Ajv;
  private readonly FILTER_DOM_PROPS = ['$comment', 'additionalProperties'];

  constructor() {
    this.ajv = new Ajv({
      strict: false,
      allErrors: true,
      useDefaults: true,
      keywords: ['uniforms', 'isRequired'],
    });

    addFormats(this.ajv);
  }

  getSchemaBridge(schema?: unknown): SchemaBridge | undefined {
    if (!schema) return undefined;

    // uniforms passes it down to the React elements as an attribute, causes a warning
    this.FILTER_DOM_PROPS.forEach((prop) => filterDOMProps.register(prop as FilterDOMPropsKeys));

    const schemaValidator = this.createValidator(schema);

    return new SchemaBridge({ schema, validator: schemaValidator });
  }

  private createValidator(schema: KaotoSchemaDefinition['schema']) {
    let validator: ValidateFunction | undefined;

    try {
      validator = this.ajv.compile(schema);
    } catch (error) {
      console.error('Could not compile schema', error);
    }

    return (model: Record<string, unknown>) => {
      validator?.(model);
      return validator?.errors?.length ? { details: validator.errors } : null;
    };
  }
}

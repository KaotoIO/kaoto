import { JSONSchema4 } from 'json-schema';
import { joinName } from 'uniforms';
import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';
import { resolveRefIfNeeded } from '../../utils';
import { memoize } from 'lodash';

export class SchemaBridge extends JSONSchemaBridge {
  /**
   * Regular expression to match the dot number or dot dollar sign in the field name
   * for example: `$.` or `.0` or `.1` or `.2` etc.
   */
  static DOT_NUMBEROR_OR_DOLLAR_REGEXP = /\.\d+|\.\$/;

  constructor(options: ConstructorParameters<typeof JSONSchemaBridge>[0]) {
    super(options);
    this.getField = memoize(this.getField.bind(this));
  }

  getField(name: string): Record<string, unknown> {
    /** Process schemas in the parent class */
    const originalField = super.getField(name);
    SchemaBridge.DOT_NUMBEROR_OR_DOLLAR_REGEXP.lastIndex = 0;
    if (SchemaBridge.DOT_NUMBEROR_OR_DOLLAR_REGEXP.test(name)) {
      return originalField;
    }

    const fieldNames = joinName(null, name);
    const field = fieldNames.reduce((definition, next, index, array) => {
      const prevName = joinName(array.slice(0, index));

      if (definition.type === 'object') {
        definition = definition.properties[joinName.unescape(next)];

        /** Enhance schemas with the definitions if available in the oneOf property */
        if (Object.keys(definition).length === 0 && Array.isArray(this._compiledSchema[prevName].oneOf)) {
          let oneOfDefinition = this._compiledSchema[prevName].oneOf.find((oneOf: JSONSchema4) => {
            return Array.isArray(oneOf.required) && oneOf.required[0] === next;
          }).properties[next];

          oneOfDefinition = resolveRefIfNeeded(oneOfDefinition, this.schema);
          Object.assign(definition, oneOfDefinition);
        } else if (definition.$ref) {
          /** Resolve $ref if needed */
          Object.assign(definition, resolveRefIfNeeded(definition, this.schema));
        }
      }

      return definition;
    }, this.schema);

    /** At this point, the super._compiledSchemas is populated, so we can return the enhanced field */
    return field;
  }
}

import Ajv from 'ajv-draft-04';
import { JSONSchema4 } from 'json-schema';
import { UnknownObject, joinName } from 'uniforms';
import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';
import { isDefined } from '../../utils';

/**
 * Copied from JSONSchemaBridge
 * @see related issue: https://github.com/vazco/uniforms/issues/1307
 */
function resolveRef(reference: string, schema: UnknownObject) {
  return reference
    .split('/')
    .filter((part) => part && part !== '#')
    .reduce((definition, next) => definition[next] as UnknownObject, schema);
}

function resolveRefIfNeeded(partial: UnknownObject, schema: UnknownObject): UnknownObject {
  if (!('$ref' in partial)) {
    return partial;
  }

  const { $ref, ...partialWithoutRef } = partial;
  return resolveRefIfNeeded(
    // @ts-expect-error The `partial` and `schema` should be typed more precisely.
    Object.assign({}, partialWithoutRef, resolveRef($ref, schema)),
    schema,
  );
}

export class SchemaBridge extends JSONSchemaBridge {
  getField(name: string): Record<string, unknown> {
    /** Process schemas in the parent class */
    super.getField(name);

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
        }
      }

      return definition;
    }, this.schema);

    /** At this point, the super._compiledSchemas is populated, so we can return the enhanced field */
    return field;
  }

  getAppliedSchemaIndex(model: unknown, name: string) {
    const schema = this._compiledSchema[name];

    return (schema.oneOf as Array<JSONSchema4>).findIndex((oneOf) => {
      if (!isDefined(oneOf.properties)) return false;

      Object.keys(oneOf.properties).forEach((key) => {
        oneOf.properties![key] = this._compiledSchema[joinName(name, key)];
      });

      const ajv = new Ajv({ strict: false, keywords: ['uniforms', 'isRequired'], useDefaults: true });
      oneOf.definitions = this.schema.definitions;
      const validate = ajv.compile(oneOf);
      validate(model);

      const errors = validate.errors?.filter((error) => error.keyword !== 'type') ?? [];

      return errors.length === 0;
    });
  }
}

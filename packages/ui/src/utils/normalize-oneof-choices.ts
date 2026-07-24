import cloneDeep from 'lodash/cloneDeep';

export function normalizeOneOfChoices(schemaRaw: any, parentProperties?: any) {
  if (!schemaRaw || typeof schemaRaw !== 'object') {
    return schemaRaw;
  }

  const schema = parentProperties === undefined ? cloneDeep(schemaRaw) : schemaRaw;

  let currentProperties = parentProperties;
  if (schema.properties) {
    currentProperties = schema.properties;
  }

  if (Array.isArray(schema.oneOf)) {
    schema.oneOf.forEach((choice: any) => {
      if (typeof choice === 'object' && choice !== null) {
        if (!choice.type && !choice.$ref) {
          // If it has 'required' or 'properties', or 'not', assume it's an object
          if (choice.required || choice.properties || choice.not) {
            if (!choice.not) {
              choice.type = 'object';
            }
            // If it has 'required' but no 'properties', copy from parent
            if (choice.required && !choice.properties && currentProperties) {
              choice.properties = Object.create(null);
              for (const req of choice.required) {
                if (Object.prototype.hasOwnProperty.call(currentProperties, req)) {
                  choice.properties[req] = currentProperties[req];
                  if (!choice.title && currentProperties[req].title) {
                    choice.title = currentProperties[req].title;
                  }
                }
              }
              // If title is still missing and there's exactly one required property, use the required property name as title
              if (!choice.title && choice.required.length === 1) {
                choice.title = choice.required[0];
              }
            }
          }
        }
      }
    });
  }

  // Recursively process children
  for (const key of Object.keys(schema)) {
    // We do not pass down `currentProperties` unconditionally because 
    // properties of parent are only valid for that specific level.
    // However, properties of schema.properties.x are for the next level.
    if (key === 'properties') {
      Object.keys(schema.properties).forEach((prop) => {
        schema.properties[prop] = normalizeOneOfChoices(schema.properties[prop], undefined);
      });
    } else if (key === 'oneOf' || key === 'anyOf' || key === 'allOf') {
      if (Array.isArray(schema[key])) {
        schema[key] = schema[key].map((item: any) => normalizeOneOfChoices(item, currentProperties));
      }
    } else if (typeof schema[key] === 'object' && schema[key] !== null) {
      // Don't pass parent properties into completely different structures like 'items' etc.
      // unless it's inside anyOf/oneOf/allOf.
      schema[key] = normalizeOneOfChoices(schema[key], undefined);
    }
  }

  return schema;
}

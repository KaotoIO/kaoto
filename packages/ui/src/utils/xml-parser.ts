import { JSONSchema4 } from 'json-schema';
import schema from './schema.json';

const expressionsSchemas: { [key: string]: string } = {
  constant: '#/items/definitions/org.apache.camel.model.language.ConstantExpression',
  simple: '#/items/definitions/org.apache.camel.model.language.SimpleExpression',
  xpath: '#/items/definitions/org.apache.camel.model.language.XPathExpression',
  jsonpath: '#/items/definitions/org.apache.camel.model.language.JsonPathExpression',
  header: '#/items/definitions/org.apache.camel.model.language.HeaderExpression',
  body: '#/items/definitions/org.apache.camel.model.language.BodyExpression',
  property: '#/items/definitions/org.apache.camel.model.language.PropertyExpression',
  exchangeProperty: '#/items/definitions/org.apache.camel.model.language.ExchangePropertyExpression',
  groovy: '#/items/definitions/org.apache.camel.model.language.GroovyExpression',
  mvel: '#/items/definitions/org.apache.camel.model.language.MvelExpression',
  ognl: '#/items/definitions/org.apache.camel.model.language.OgnlExpression',
  spel: '#/items/definitions/org.apache.camel.model.language.SpELExpression',
  sql: '#/items/definitions/org.apache.camel.model.language.SqlExpression',
  tokenize: '#/items/definitions/org.apache.camel.model.language.TokenizeExpression',
  ref: '#/items/definitions/org.apache.camel.model.language.RefExpression',
  method: '#/items/definitions/org.apache.camel.model.language.MethodCallExpression',
  datasonnet: '#/items/definitions/org.apache.camel.model.language.DatasonnetExpression',
  csimple: '#/items/definitions/org.apache.camel.model.language.CSimpleExpression',
};

const expressionKeys = Object.keys(expressionsSchemas);

export function isXML(code: string): boolean {
  const trimmedCode = code.trim();
  return trimmedCode.startsWith('<') && trimmedCode.endsWith('>');
}

export function parseXML(xml: string): any {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'application/xml');
  const routes = Array.from(xmlDoc.getElementsByTagName('route')).map(transformRoute);
  return routes;
}

//=================
// Helper functions
//=================
function getAttributesFromSchema(element: Element, schema: JSONSchema4): any {
  const attributes: { [key: string]: string } = {};
  const properties = extractProperties(schema);

  Object.keys(properties).forEach((key) => {
    if (element.hasAttribute(key)) {
      attributes[key] = element.getAttribute(key) as string;
    }
  });
  //
  // // Handle oneOf, anyOf, allOf
  // if (schema.oneOf) {
  //   schema.oneOf.forEach((subSchema) => {
  //     const subAttributes = getAttributesFromSchema(element, subSchema);
  //     Object.assign(attributes, subAttributes);
  //   });
  // }
  //
  // if (schema.anyOf) {
  //   schema.anyOf.forEach((subSchema) => {
  //     const subAttributes = getAttributesFromSchema(element, subSchema);
  //     Object.assign(attributes, subAttributes);
  //   });
  // }
  //
  // if (schema.allOf) {
  //   schema.allOf.forEach((subSchema) => {
  //     const subAttributes = getAttributesFromSchema(element, subSchema);
  //     Object.assign(attributes, subAttributes);
  //   });
  // }
  return attributes;
}

function dereferenceSchema(dSchema: JSONSchema4): JSONSchema4 {
  const definitions: Record<string, JSONSchema4> = schema.items!.definitions as unknown as Record<string, JSONSchema4>;
  if (dSchema.$ref) {
    const refPath = dSchema.$ref.replace(/^#\/items\/definitions\//, '');
    return definitions[refPath];
  }
  return dSchema;
}

function dereferenceSchemaByRef(ref: string): JSONSchema4 {
  const definitions: Record<string, JSONSchema4> = schema.items!.definitions as unknown as Record<string, JSONSchema4>;
  const refPath = ref.replace(/^#\/items\/definitions\//, '');
  return definitions[refPath];
}

function extractProperties(schema: JSONSchema4): Record<string, any> {
  if (schema.properties) {
    return schema.properties;
  }
  if (schema.oneOf || schema.anyOf) {
    const combinedSchemas = schema.oneOf || schema.anyOf || [];
    for (const subSchema of combinedSchemas) {
      if (subSchema.properties) {
        return subSchema.properties;
      }
    }
  }
  return {};
}

function transformRoute(routeElement: Element): any {
  const routeSchema = schema.items!.definitions['org.apache.camel.model.RouteDefinition'] as JSONSchema4;

  const fromElement: Element = routeElement.getElementsByTagName('from')[0];
  const from = transformFrom(fromElement);
  return {
    ...getAttributesFromSchema(routeElement, routeSchema),
    from: from,
  };
}

function transformFrom(fromElement: Element): any {
  const fromSchema = schema.items.definitions['org.apache.camel.model.FromDefinition'] as JSONSchema4;

  return {
    ...getAttributesFromSchema(fromElement, fromSchema),
    steps: transformSteps(fromElement.parentElement!),
  };
}

function transformSteps(parentElement: Element): any[] {
  const allowedSteps: {
    [key: string]: any;
  } = schema.items!.definitions['org.apache.camel.model.ProcessorDefinition'].properties;

  return Array.from(parentElement.children)
    .filter((child) => {
      const tagNameLower = child.tagName.toLowerCase();
      const stepKey = Object.keys(allowedSteps).find((key) => key.toLowerCase() === tagNameLower);
      return stepKey && !['doCatch', 'doFinally'].includes(stepKey); // Filter out elements not needed
    })
    .map((child) => {
      let stepSchema = allowedSteps[child.tagName!]; // `!` asserts that stepKey is not null/undefined

      // Dereference the schema if it's a reference
      if (stepSchema.$ref) {
        stepSchema = dereferenceSchema(stepSchema);
      }

      const step: any = {};
      step[child.tagName] = transformElement(child, stepSchema);
      return step;
    });
}

function transformElement(element: Element, elementSchema?: JSONSchema4): any {
  if (!elementSchema) {
    // Handle primitive type
    return element.textContent;
  }

  const tagNameLower = element.tagName ? element.tagName : (element as unknown as string);
  if (tagNameLower === 'doTry') {
    return transformDoTry(element, elementSchema);
  } else if (['unmarshal', 'marshal'].includes(tagNameLower)) {
    return transformWithDataformat(element);
  } else if (tagNameLower === 'choice') {
    return transformChoice(element, elementSchema);
  } else if (['unmarshal', 'marshal'].includes(tagNameLower)) {
    return transformWithDataformat(element);
  }

  const step = { ...getAttributesFromSchema(element, elementSchema) };
  console.log('step', step);

  // If the schema has an 'expression' property, process the expression
  if (elementSchema.properties?.expression) {
    const expressionElement = Array.from(element.children).find((child) =>
      expressionKeys.includes(child.tagName.toLowerCase()),
    );

    if (expressionElement) {
      step['expression'] = transformExpression(expressionElement);
    }
  }

  // find property in the schema that is type of array
  if (elementSchema.properties?.steps) {
    step['steps'] = transformSteps(element); // Call transformSteps on the element
  }

  return step;
}

function transformDoTry(doTryElement: Element, doTrySchema: JSONSchema4): any {
  const doCatchArray: any[] = [];
  let doFinallyElement = null;

  Array.from(doTryElement.children).forEach((child) => {
    const tagNameLower = child.tagName;

    // Check if the element is a doCatch
    if (child.tagName === 'doCatch') {
      console.log('doCatch', child);
      doCatchArray.push(transformDoCatch(child));
    }
    // Check if the element is a doFinally
    else if (tagNameLower === 'doFinally') {
      doFinallyElement = transformDoFinally(child);
    }
  });

  return {
    ...getAttributesFromSchema(doTryElement, doTrySchema),
    steps: transformSteps(doTryElement), // All other steps except doCatch and doFinally
    doCatch: doCatchArray, // Processed doCatch elements
    doFinally: doFinallyElement, // Processed doFinally element if present
  };
}

function transformDoCatch(doCatchElement: Element): any {
  const doCatchSchema = schema.items!.definitions['org.apache.camel.model.CatchDefinition'] as JSONSchema4;

  // Process exceptions
  const exceptionElements = Array.from(doCatchElement.getElementsByTagName('exception'));
  const exceptions = exceptionElements.map((exceptionElement) => exceptionElement.textContent);

  // Process the onWhen element if present
  const onWhenElement = doCatchElement.getElementsByTagName('onWhen')[0];
  const onWhen = onWhenElement ? transformOnWhen(onWhenElement) : null;

  return {
    ...getAttributesFromSchema(doCatchElement, doCatchSchema),
    exception: exceptions, // Capture the exceptions
    onWhen: onWhen, // Capture onWhen if available
    steps: transformSteps(doCatchElement), // Process steps inside doCatch
  };
}

function transformDoFinally(doFinallyElement: Element): any {
  const doFinallySchema = schema.items!.definitions['org.apache.camel.model.FinallyDefinition'] as JSONSchema4;
  return {
    ...getAttributesFromSchema(doFinallyElement, doFinallySchema),
    steps: transformSteps(doFinallyElement), // Process the steps inside doFinally
  };
}

function transformOnWhen(onWhenElement: Element): any {
  const onWhenSchema = schema.items!.definitions['org.apache.camel.model.WhenDefinition'] as JSONSchema4;
  const expressionElement = Array.from(onWhenElement.children).find((child) => {
    return expressionKeys.includes(child.tagName.toLowerCase()); // Check if it's an expression
  });

  return {
    ...getAttributesFromSchema(onWhenElement, onWhenSchema),
    expression: expressionElement ? transformExpression(expressionElement) : null, // Transform expression if available
  };
}

function transformExpression(expressionElement: Element): any {
  const expressionType = expressionElement.tagName;
  const expressionSchema = dereferenceSchemaByRef(expressionsSchemas[expressionType]);
  const expressionAttributes = getAttributesFromSchema(expressionElement, expressionSchema);

  return { [expressionType]: { expression: expressionElement.textContent, ...expressionAttributes } };
}

function transformChoice(choiceElement: Element, choiceSchema: JSONSchema4): any {
  const whenElements = Array.from(choiceElement.getElementsByTagName('when'));
  const otherwiseElement = choiceElement.getElementsByTagName('otherwise')[0];

  return {
    ...getAttributesFromSchema(choiceElement, choiceSchema),
    when: whenElements.map(transformWhen),
    otherwise: otherwiseElement ? transformOtherwise(otherwiseElement) : null,
  };
}

function transformOtherwise(otherwiseElement: Element): any {
  const otherwiseSchema = schema.items!.definitions['org.apache.camel.model.OtherwiseDefinition']
    .properties as unknown as JSONSchema4;
  return {
    ...getAttributesFromSchema(otherwiseElement, otherwiseSchema),
    steps: transformSteps(otherwiseElement),
  };
}

function transformWhen(whenElement: Element): any {
  const whenSchema: JSONSchema4 = schema.items!.definitions['org.apache.camel.model.WhenDefinition']
    .properties as unknown as JSONSchema4;
  const expressionElement = Array.from(whenElement.children).find((child) => {
    return expressionKeys.includes(child.tagName.toLowerCase()); // Check if it's an expression
  });

  return {
    ...getAttributesFromSchema(whenElement, whenSchema),
    expression: expressionElement ? transformExpression(expressionElement) : null, // Call transformExpression
    steps: transformSteps(whenElement), // Continue transforming steps if any
  };
}

function transformWithDataformat(unmarshalElement: Element): any {
  const dataFormatElement = unmarshalElement.children[0];

  if (!dataFormatElement) return {};

  // Check if there's a definition for this specific data format (e.g., json, xml, etc.)
  const dataFormatKey = `org.apache.camel.model.dataformat.${capitalize(dataFormatElement.tagName)}DataFormat`;
  const dataFormatSchema = (schema.items!.definitions as unknown as Record<string, JSONSchema4>)[dataFormatKey];

  if (!dataFormatSchema) {
    console.warn(`Data format ${dataFormatElement.tagName} is not defined in schema.`);
    return {};
  }

  return {
    [dataFormatElement.tagName]: {
      ...getAttributesFromSchema(dataFormatElement, dataFormatSchema),
    },
  };
}

// Helper function to capitalize the first letter (e.g., 'json' -> 'Json')
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

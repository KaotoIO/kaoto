import { EnumField } from '@kaoto/forms';

import { KaotoSchemaDefinition } from '../../../../../models/kaoto-schema';
import { PrefixedBeanField, UnprefixedBeanField } from './BeanField/BeanField';
import { customFieldsFactoryfactory } from './custom-fields-factory';
import { ExpressionField } from './ExpressionField/ExpressionField';
import { MediaTypeField } from './MediaTypeField/MediaTypeField';

describe('customFieldsFactoryfactory', () => {
  it('returns EnumField for enums regardless of the schema type', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'object', enum: ['option 1', 'option 2', 'option 3'] };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(EnumField);
  });

  it('returns PrefixedBeanField for string type with format starting with "bean:"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'bean:myBean' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(PrefixedBeanField);
  });

  it('returns UnprefixedBeanField for string type with title "Ref"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'Ref' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(UnprefixedBeanField);
  });

  it('returns ExpressionField for format "expression"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'expression' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(ExpressionField);
  });

  it('returns ExpressionField for format "expressionProperty"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'expressionProperty' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(ExpressionField);
  });

  it('returns MediaTypeField for title "Consumes"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'Consumes' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(MediaTypeField);
  });

  it('returns MediaTypeField for title "Produces"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'Produces' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(MediaTypeField);
  });

  it('returns undefined for string type with unrelated format', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'text' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('returns undefined for string type with title "Ref" but non-string type', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'number', title: 'Ref' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('returns undefined for string type with case-sensitive title mismatch', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'ref' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('prioritizes bean format over Ref title when both are present', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'bean:myBean', title: 'Ref' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(PrefixedBeanField);
  });

  it('returns undefined for non-string type', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'number', format: 'bean:myBean' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('returns undefined if format is missing', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('returns undefined if schema is empty', () => {
    const result = customFieldsFactoryfactory({});
    expect(result).toBeUndefined();
  });
});

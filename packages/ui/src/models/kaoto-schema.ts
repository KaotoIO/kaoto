import { JSONSchema4 } from 'json-schema';

export interface KaotoSchemaDefinition {
  name: string;
  version: string;
  tags: string[];
  uri: string;
  schema: JSONSchema4;
}

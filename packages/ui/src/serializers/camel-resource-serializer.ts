import { CamelResource } from '../models/camel';
import { CamelYamlDsl, Integration, Kamelet, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';

export enum SerializerType {
  XML = 'XML',
  YAML = 'YAML',
}

export type Metadata = { [key: string]: unknown };

export interface CamelResourceSerializer {
  parse: (code: string) => CamelYamlDsl | Integration | Kamelet | KameletBinding | Pipe | undefined;
  serialize: (resource: CamelResource) => string;
  getComments: () => string[];
  setComments: (comments: string[]) => void;
  setMetadata: (metadata: Metadata) => void;
  getMetadata: () => Metadata;
  getType(): SerializerType;
}

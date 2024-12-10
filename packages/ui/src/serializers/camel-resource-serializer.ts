import { CamelResource } from '../models/camel';

export interface CamelResourceSerializer {
  parse: (code: string) => unknown;
  serialize: (resource: CamelResource) => string;
}

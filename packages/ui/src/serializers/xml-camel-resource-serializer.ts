import { CamelResource } from '../models/camel';
import { CamelResourceSerializer } from './camel-resource-serializer';

export class XmlCamelResourceSerializer implements CamelResourceSerializer {
  static isApplicable(_code: unknown): boolean {
    return false;
  }

  parse(_code: unknown): unknown {
    //TODO implement
    return {};
  }

  serialize(_resource: CamelResource): string {
    //TODO implement
    return '';
  }
}

import { CamelResource } from '../models/camel';
import { CamelResourceSerializer } from './camel-resource-serializer';
import { CamelYamlDsl, Integration, Kamelet, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';

export class XmlCamelResourceSerializer implements CamelResourceSerializer {
  static isApplicable(_code: unknown): boolean {
    return false;
  }

  parse(_code: string): CamelYamlDsl | Integration | Kamelet | KameletBinding | Pipe {
    //TODO implement
    return {};
  }

  serialize(_resource: CamelResource): string {
    //TODO implement
    return '';
  }

  getComments(): string[] {
    return [];
  }

  setComments(_comments: string[]): void {
    //TODO implement
  }
}

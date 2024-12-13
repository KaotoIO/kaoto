import { CamelResource } from '../models/camel';
import { parse, stringify } from 'yaml';
import { CamelResourceSerializer } from './camel-resource-serializer';
import { CamelYamlDsl, Integration, Kamelet, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';

export class YamlCamelResourceSerializer implements CamelResourceSerializer {
  /**
   * Regular expression to match commented lines, regardless of indentation
   * Given the following examples, the regular expression should match the comments:
   * ```
   * # This is a comment
   *     # This is an indented comment
   *# This is an indented comment
   * ```
   * The regular expression should match the first three lines
   */
  static readonly COMMENTED_LINES_REGEXP = /^\s*#.*$/;
  comments: string[] = [];

  static isApplicable(_code: unknown): boolean {
    //TODO
    // return !isXML(code);

    return true;
  }

  parse(code: string): CamelYamlDsl | Integration | Kamelet | KameletBinding | Pipe {
    if (!code || typeof code !== 'string') return [];

    this.comments = this.parseComments(code);
    const json = parse(code);
    return json;
  }

  serialize(resource: CamelResource): string {
    let code = stringify(resource, { sortMapEntries: resource.sortFn, schema: 'yaml-1.1' }) || '';
    if (this.comments.length > 0) {
      const comments = this.comments.join('\n');
      code = comments + '\n' + code;
    }
    return code;
  }

  getComments(): string[] {
    return this.comments;
  }

  setComments(comments: string[]): void {
    this.comments = comments;
  }

  private parseComments(code: string): string[] {
    const lines = code.split('\n');
    const comments: string[] = [];
    for (const line of lines) {
      if (line.trim() === '' || YamlCamelResourceSerializer.COMMENTED_LINES_REGEXP.test(line)) {
        comments.push(line);
      } else {
        break;
      }
    }
    return comments;
  }
}

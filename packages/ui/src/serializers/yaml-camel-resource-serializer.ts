import { CamelYamlDsl, Integration, Kamelet, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';
import { parse, stringify } from 'yaml';

import { CamelResource, CamelResourceSerializer, Metadata, SerializerType } from '../models/camel/camel-resource';
import { Test } from '../models/citrus/entities/Test';
import { isXML } from './xml/kaoto-xml-parser';

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
  metadata: Metadata = {};

  static isApplicable(code: unknown): boolean {
    return !isXML(code);
  }

  parse(code: string): CamelYamlDsl | Integration | Kamelet | KameletBinding | Pipe | Test {
    if (!code || typeof code !== 'string') return [];

    this.comments = this.parseComments(code);
    const json = parse(code);
    return json;
  }

  serialize(resource: CamelResource): string {
    let code = stringify(resource.toJSON(), { schema: 'yaml-1.1' }) || '';
    if (this.comments.length > 0) {
      code = this.insertComments(code);
    }
    return code;
  }

  getType(): SerializerType {
    return SerializerType.YAML;
  }

  getComments(): string[] {
    return this.comments;
  }

  setComments(comments: string[]): void {
    this.comments = comments;
  }

  setMetadata(metadata: Metadata): void {
    this.metadata = metadata;
  }

  getMetadata(): Metadata {
    return this.metadata;
  }

  private parseComments(code: string): string[] {
    const lines = code.split('\n');
    const comments: string[] = [];
    for (const line of lines) {
      if (line.trim() === '' || YamlCamelResourceSerializer.COMMENTED_LINES_REGEXP.test(line)) {
        comments.push(line.replace(/^\s*#*/, ''));
      } else {
        break;
      }
    }
    return comments;
  }

  private insertComments(xml: string): string {
    const commentsString = this.comments
      .flatMap((comment) => comment.split('\n').map((line) => (line.trim() === '' ? '' : `#${line}`)))
      .join('\n');
    return commentsString + '\n' + xml;
  }
}

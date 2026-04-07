import { BaseEntity } from './entities';
import { BaseVisualEntity } from './visualization/base-visual-entity';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export class ParsedTable {
  headingLevel: HeadingLevel = 'h1';
  title: string = '';
  description: string = '';
  headers: ReadonlyArray<string> = [];
  data: string[][] = [];

  constructor(init?: Partial<ParsedTable>) {
    Object.assign(this, init);
  }

  static unsupported(entity: BaseEntity) {
    return new ParsedTable({
      title: entity.id,
      description: 'This entity is not yet supported for documentation export.',
      headers: ['JSON dump'],
      data: [[JSON.stringify(entity.toJSON())]],
    });
  }
}

export class ParsedStep {
  id: string = '';
  name: string = '';
  uri: string = '';
  description: string = '';
  parameters: Record<string, string> = {};

  constructor(init?: Partial<ParsedStep>) {
    Object.assign(this, init);
  }
}

export class DocumentationEntity {
  entity?: BaseEntity | BaseVisualEntity;
  label: string = '';
  isVisible: boolean = true;
  isVisualEntity: boolean = false;

  constructor(init?: Partial<DocumentationEntity>) {
    Object.assign(this, init);
  }
}

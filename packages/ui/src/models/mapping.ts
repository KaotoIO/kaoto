import { IField } from './document';
import { generateRandomId } from '../util';
import { DocumentType, NodePath, Path } from './path';
import { Types } from './types';

export type MappingParentType = MappingTree | MappingItem;

export class MappingTree {
  constructor(documentType: DocumentType, documentId: string) {
    this.path = NodePath.fromDocument(documentType, documentId);
  }
  children: MappingItem[] = [];
  path: NodePath;
  contextPath?: Path;
}

export abstract class MappingItem {
  constructor(
    public parent: MappingParentType,
    public name: string,
    public id: string,
  ) {}
  children: MappingItem[] = [];
  get path(): NodePath {
    return NodePath.childOf(this.parent.path, this.id);
  }
  get contextPath(): Path | undefined {
    return this.parent.contextPath;
  }
}

export class FieldItem extends MappingItem {
  constructor(
    public parent: MappingParentType,
    public field: IField,
  ) {
    super(parent, 'field-' + field.name, field.id);
  }
}

export abstract class ConditionItem extends MappingItem {
  constructor(
    public parent: MappingParentType,
    public name: string,
  ) {
    super(parent, name, generateRandomId(name, 4));
  }
  readonly isCondition = true;
}

export abstract class ExpressionItem extends ConditionItem {
  constructor(
    public parent: MappingParentType,
    public name: string,
  ) {
    super(parent, name);
  }
  expression = '';
}

export class IfItem extends ExpressionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'if');
  }
}

export class ChooseItem extends ConditionItem {
  constructor(
    public parent: MappingParentType,
    public field?: IField,
  ) {
    super(parent, 'choose');
  }
  get when() {
    return this.children.filter((c) => c instanceof WhenItem) as WhenItem[];
  }
  get otherwise() {
    return this.children.find((c) => c instanceof OtherwiseItem) as OtherwiseItem;
  }
}

export class WhenItem extends ExpressionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'when');
  }
}

export class OtherwiseItem extends ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'otherwise');
  }
}

export class ForEachItem extends ExpressionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'for-each');
  }
  get contextPath() {
    return new Path(this.expression, this.parent.contextPath);
  }
  sortItems: SortItem[] = [];
}

export class SortItem {
  expression: string = '';
  order: 'ascending' | 'descending' = 'ascending';
}

export class ValueSelector extends ExpressionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'value');
  }
}

export interface IFunctionDefinition {
  name: string;
  displayName: string;
  description: string;
  returnType: Types;
  returnCollection?: boolean;
  arguments: IFunctionArgumentDefinition[];
}

export interface IFunctionArgumentDefinition {
  name: string;
  type: Types;
  displayName: string;
  description: string;
  minOccurs: number;
  maxOccurs: number;
}

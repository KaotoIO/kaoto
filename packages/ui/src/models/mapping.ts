import { DocumentType, IField } from './document';
import { generateRandomId } from '../util';
import { NodePath } from './path';
import { Types } from './types';

export type MappingParentType = MappingTree | MappingItem;

export class MappingTree {
  constructor(documentType: DocumentType, documentId: string) {
    this.path = NodePath.fromDocument(documentType, documentId);
  }
  children: MappingItem[] = [];
  path: NodePath;
}

export abstract class MappingItem {
  constructor(
    public parent: MappingParentType,
    public name: string,
  ) {
    this.id = generateRandomId(this.name);
    this.path = NodePath.childOf(parent.path, this.id);
  }
  id: string;
  children: MappingItem[] = [];
  path: NodePath;
}

export class FieldItem extends MappingItem {
  constructor(
    public parent: MappingParentType,
    public field: IField,
  ) {
    super(parent, 'field');
  }
}

export interface ExpressionItem {
  expression: string;
}

export interface ConditionItem {
  isCondition: true;
}

export class IfItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'if');
  }
  isCondition = true as const;
  expression = '';
}

export class ChooseItem extends MappingItem implements ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'choose');
  }
  isCondition = true as const;
  get when() {
    return this.children.filter((c) => c instanceof WhenItem) as WhenItem[];
  }
  get otherwise() {
    return this.children.find((c) => c instanceof OtherwiseItem) as OtherwiseItem;
  }
}

export class WhenItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'when');
  }
  isCondition = true as const;
  expression = '';
}

export class OtherwiseItem extends MappingItem implements ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'otherwise');
  }
  isCondition = true as const;
}

export class ForEachItem extends MappingItem implements ExpressionItem, ConditionItem {
  constructor(
    public parent: MappingParentType,
    field: IField,
  ) {
    super(parent, 'for-each');
    this.children.push(new FieldItem(this, field));
  }
  isCondition = true as const;
  expression = '';
  sortItems: SortItem[] = [];
}

export class SortItem {
  expression: string = '';
  order: 'ascending' | 'descending' = 'ascending';
}

export class ValueSelector extends MappingItem implements ExpressionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'value');
  }
  expression = '';
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

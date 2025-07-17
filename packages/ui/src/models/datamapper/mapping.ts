import { DocumentDefinitionType, DocumentType, IField } from './document';
import { NodePath } from './nodepath';
import { Types } from './types';
import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { PathExpression } from './xpath';
import { XPathService } from '../../services/xpath/xpath.service';

export type MappingParentType = MappingTree | MappingItem;

export class MappingTree {
  constructor(
    documentType: DocumentType,
    documentId: string,
    public documentDefinitionType: DocumentDefinitionType = DocumentDefinitionType.XML_SCHEMA,
  ) {
    this.nodePath = NodePath.fromDocument(documentType, documentId);
  }
  children: MappingItem[] = [];
  nodePath: NodePath;
  contextPath?: PathExpression;
  namespaceMap: { [prefix: string]: string } = {};
}

export abstract class MappingItem {
  constructor(
    public parent: MappingParentType,
    public name: string,
    public id: string,
  ) {
    this.mappingTree = parent instanceof MappingTree ? parent : parent.mappingTree;
  }
  mappingTree: MappingTree;
  children: MappingItem[] = [];
  get nodePath(): NodePath {
    return NodePath.childOf(this.parent.nodePath, this.id);
  }
  get contextPath(): PathExpression | undefined {
    return this.parent.contextPath;
  }
  protected abstract doClone(): MappingItem;
  clone(): MappingItem {
    const cloned = this.doClone();
    cloned.children = this.children.map((c) => c.clone());
    return cloned;
  }
}

export class FieldItem extends MappingItem {
  constructor(
    public parent: MappingParentType,
    public field: IField,
  ) {
    const name = field.id;
    super(parent, name, getCamelRandomId(name, 4));
  }
  doClone() {
    return new FieldItem(this.parent, this.field);
  }
}

export abstract class ConditionItem extends MappingItem {
  constructor(
    public parent: MappingParentType,
    public name: string,
  ) {
    super(parent, name, getCamelRandomId(name, 4));
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
  clone() {
    const cloned = super.clone() as ExpressionItem;
    cloned.expression = this.expression;
    return cloned;
  }
}

export class IfItem extends ExpressionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'if');
  }
  doClone() {
    return new IfItem(this.parent);
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
  doClone() {
    return new ChooseItem(this.parent, this.field);
  }
}

export class WhenItem extends ExpressionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'when');
  }
  doClone() {
    return new WhenItem(this.parent);
  }
}

export class OtherwiseItem extends ConditionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'otherwise');
  }
  doClone() {
    return new OtherwiseItem(this.parent);
  }
}

export class ForEachItem extends ExpressionItem {
  constructor(public parent: MappingParentType) {
    super(parent, 'for-each');
  }

  get contextPath() {
    const answer = XPathService.extractFieldPaths(this.expression)[0];
    if (answer) {
      answer.contextPath = this.parent.contextPath;
      return answer;
    }
    return this.parent.contextPath;
  }

  sortItems: SortItem[] = [];

  doClone() {
    const cloned = new ForEachItem(this.parent);
    cloned.sortItems = this.sortItems.map((sort) => {
      return {
        expression: sort.expression,
        order: sort.order,
      } as SortItem;
    });
    return cloned;
  }
}

export class SortItem {
  expression: string = '';
  order: 'ascending' | 'descending' = 'ascending';
}

export enum ValueType {
  VALUE = 'value',
  CONTAINER = 'container',
  ATTRIBUTE = 'attribute',
}

export class ValueSelector extends ExpressionItem {
  constructor(
    public parent: MappingParentType,
    public valueType: ValueType = ValueType.VALUE,
  ) {
    super(parent, 'value');
  }
  doClone() {
    return new ValueSelector(this.parent, this.valueType);
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

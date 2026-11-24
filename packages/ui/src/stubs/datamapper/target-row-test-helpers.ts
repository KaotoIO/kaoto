import { IField } from '../../models/datamapper/document';
import { CopyOfSelector, FieldItem, IfItem, MappingParentType } from '../../models/datamapper/mapping';
import {
  AddMappingNodeData,
  CopyOfFieldNodeData,
  FieldItemNodeData,
  MappingNodeData,
  NodeData,
} from '../../models/datamapper/visualization';

/**
 * One label per target row, so row order can be asserted as a list: a field row by its title, an "Add" row as
 * `+<title>`, a standalone copy-of as `copy(<select>)`, and any other instruction row by its title.
 * @param nodes - the rows to label
 */
export const rowLabels = (nodes: NodeData[]): string[] =>
  nodes.map((node) => {
    if (node instanceof AddMappingNodeData) return `+${node.title}`;
    if (node instanceof FieldItemNodeData || node instanceof CopyOfFieldNodeData) return node.title;
    if (node instanceof MappingNodeData && node.mapping instanceof CopyOfSelector) {
      return `copy(${node.mapping.expression})`;
    }
    return node.title;
  });

/**
 * The row titled `title` among `rows`; fails the test when there is none.
 * @param rows - the rows to search
 * @param title - the row title
 */
export const findRow = (rows: NodeData[], title: string): NodeData => {
  const row = rows.find((node) => node.title === title);
  if (!row) throw new Error(`no row titled ${title}`);
  return row;
};

/**
 * Appends a `xsl:copy-of` with `expression` to `parent`.
 * @param parent - the item or tree the copy-of is added to
 * @param expression - its `select`
 */
export const appendCopyOf = (parent: MappingParentType, expression: string): CopyOfSelector => {
  const copyOf = new CopyOfSelector(parent);
  copyOf.expression = expression;
  parent.children.push(copyOf);
  return copyOf;
};

/**
 * Appends a field item for `field` to `parent`.
 * @param parent - the item or tree the field item is added to
 * @param field - the target field it writes
 */
export const appendFieldItem = (parent: MappingParentType, field: IField): FieldItem => {
  const fieldItem = new FieldItem(parent, field);
  parent.children.push(fieldItem);
  return fieldItem;
};

/**
 * Appends an `xsl:if` with the test `true()` to `parent`, so it is never a see-through guard.
 * @param parent - the item or tree the `if` is added to
 */
export const appendIf = (parent: MappingParentType): IfItem => {
  const ifItem = new IfItem(parent);
  ifItem.expression = 'true()';
  parent.children.push(ifItem);
  return ifItem;
};

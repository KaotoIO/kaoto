import './ContainerMapping.stories.scss';

import { ChevronDown, ChevronRight } from '@carbon/icons-react';
import { BaseNode, Types } from '@kaoto/kaoto/testing';
import { ActionListGroup, ActionListItem, Button, Icon, Label, TextInput, Tooltip } from '@patternfly/react-core';
import { EllipsisVIcon, TimesIcon } from '@patternfly/react-icons';
import { Meta, StoryFn } from '@storybook/react';
import { FunctionComponent } from 'react';

const FULL_W = 960;
const FULL_SOURCE_X = 280;
const FULL_TARGET_X = 480;
const SMALL_W = 340;
const SMALL_SOURCE_X = 130;
const SMALL_TARGET_X = 210;
const ROW_H = 32;

type MappingLineType = 'copy-of' | 'complete' | 'partial' | 'regular' | 'out-of-view';

interface LineSpec {
  y1: number;
  y2: number;
  type: MappingLineType;
  selected?: boolean;
}

interface FieldSpec {
  name: string;
  depth?: number;
  collection?: boolean;
  variant?: 'for-each';
  expression?: string;
  iconType?: Types;
  expandable?: boolean;
  expanded?: boolean;
  target?: boolean;
}

function bezierD(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`;
}

function rowY(index: number): number {
  return index * ROW_H + ROW_H / 2;
}

interface DmLineProps extends LineSpec {
  sourceX: number;
  targetX: number;
}

const DmLine: FunctionComponent<DmLineProps> = ({ y1, y2, type, selected = false, sourceX, targetX }) => {
  const suffix = selected ? '-selected' : '';
  if (type === 'copy-of') {
    return (
      <>
        <circle cx={sourceX} cy={y1} r={4} className={`dm-link-dot dm-link-dot--${type}${suffix}`} />
        <path d={bezierD(sourceX, y1 - 1.5, targetX, y2 - 1.5)} className={`dm-link dm-link--${type}${suffix}`} />
        <path d={bezierD(sourceX, y1 + 1.5, targetX, y2 + 1.5)} className={`dm-link dm-link--${type}${suffix}`} />
        <circle cx={targetX} cy={y2} r={4} className={`dm-link-dot dm-link-dot--${type}${suffix}`} />
      </>
    );
  }
  return (
    <>
      <circle cx={sourceX} cy={y1} r={4} className={`dm-link-dot dm-link-dot--${type}${suffix}`} />
      <path d={bezierD(sourceX, y1, targetX, y2)} className={`dm-link dm-link--${type}${suffix}`} />
      <circle cx={targetX} cy={y2} r={4} className={`dm-link-dot dm-link-dot--${type}${suffix}`} />
    </>
  );
};

const TargetActions: FunctionComponent<{ showDelete?: boolean }> = ({ showDelete = false }) => (
  <ActionListGroup className="node__target__actions">
    <ActionListItem>
      <Tooltip content="Condition menu">
        <Button variant="plain" icon={<EllipsisVIcon />} />
      </Tooltip>
    </ActionListItem>
    {showDelete && (
      <ActionListItem>
        <Tooltip content="Delete">
          <Button variant="plain" icon={<TimesIcon />} />
        </Tooltip>
      </ActionListItem>
    )}
  </ActionListGroup>
);

const FieldRow: FunctionComponent<FieldSpec> = ({
  name,
  depth = 0,
  collection = false,
  variant,
  expression,
  iconType,
  expandable = false,
  expanded = false,
  target = false,
}) => {
  if (variant === 'for-each') {
    return (
      <div
        style={{
          height: ROW_H,
          display: 'flex',
          alignItems: 'center',
          marginLeft: `calc(${depth} * 0.85rem)`,
          borderBottom: '1px solid #d2d2d2',
          boxSizing: 'border-box',
        }}
      >
        <Icon style={{ cursor: 'pointer', marginRight: '0.25rem' }}>
          {expanded ? <ChevronDown /> : <ChevronRight />}
        </Icon>
        <Label isCompact color="grey">
          for-each
        </Label>
        {expression && (
          <div style={{ width: '200px', flexShrink: 0, marginLeft: '0.5rem' }}>
            <TextInput value={expression} aria-label="XPath expression" style={{ height: '1.75rem' }} />
          </div>
        )}
        <span style={{ flex: 1 }} />
        <TargetActions showDelete />
      </div>
    );
  }

  return (
    <div
      style={{
        height: ROW_H,
        borderBottom: '1px solid #d2d2d2',
        boxSizing: 'border-box',
      }}
    >
      <BaseNode
        isExpandable={expandable}
        isExpanded={expanded}
        isDraggable={false}
        iconType={iconType}
        isCollectionField={collection}
        isSource={!target}
        title={<span className="node__spacer">{name}</span>}
        rank={depth}
      >
        {expression && (
          <div style={{ width: '200px', flexShrink: 0, marginLeft: '0.5rem' }}>
            <TextInput value={expression} aria-label="XPath expression" style={{ height: '1.75rem' }} />
          </div>
        )}
        {target && (
          <>
            <span style={{ flex: 1 }} />
            <TargetActions showDelete={!!expression} />
          </>
        )}
      </BaseNode>
    </div>
  );
};

interface MappingDemoProps {
  label?: string;
  description?: string;
  sourceFields: FieldSpec[];
  targetFields: FieldSpec[];
  lines: LineSpec[];
  width?: number;
  sourceX?: number;
  targetX?: number;
}

const MappingDemo: FunctionComponent<MappingDemoProps> = ({
  label,
  description,
  sourceFields,
  targetFields,
  lines,
  width = FULL_W,
  sourceX = FULL_SOURCE_X,
  targetX = FULL_TARGET_X,
}) => {
  const height = Math.max(sourceFields.length, targetFields.length) * ROW_H;
  return (
    <div style={{ marginBottom: 24 }}>
      {(label || description) && (
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          {label && <strong style={{ fontSize: 13 }}>{label}</strong>}
          {description && <span style={{ color: '#6a6e73', fontSize: 12 }}>{description}</span>}
        </div>
      )}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width,
          height,
          border: '1px solid #d2d2d2',
          borderRadius: 4,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: sourceX, flexShrink: 0 }}>
          {sourceFields.map((f) => (
            <FieldRow key={`src-${f.name}-${f.depth}`} {...f} />
          ))}
        </div>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {lines.map((l) => (
            <DmLine key={`line-${l.y1}-${l.y2}-${l.type}`} {...l} sourceX={sourceX} targetX={targetX} />
          ))}
        </svg>
        <div style={{ width: width - targetX, flexShrink: 0, marginLeft: 'auto' }}>
          {targetFields.map((f) => (
            <FieldRow key={`tgt-${f.name}-${f.depth}`} {...f} target />
          ))}
        </div>
      </div>
    </div>
  );
};

interface SmallMappingDemoProps {
  label: string;
  type: MappingLineType;
  selected: boolean;
}

const SmallMappingDemo: FunctionComponent<SmallMappingDemoProps> = ({ label, type, selected }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
    <div style={{ width: 200, fontSize: 12, color: '#3c3f42' }}>{label}</div>
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: SMALL_W,
        border: '1px solid #d2d2d2',
        borderRadius: 4,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: SMALL_SOURCE_X, flexShrink: 0 }}>
        <FieldRow
          name="source"
          iconType={type === 'regular' || type === 'out-of-view' ? Types.String : Types.Container}
          expandable={type !== 'regular' && type !== 'out-of-view'}
        />
      </div>
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <DmLine
          y1={ROW_H / 2}
          y2={ROW_H / 2}
          type={type}
          selected={selected}
          sourceX={SMALL_SOURCE_X}
          targetX={SMALL_TARGET_X}
        />
      </svg>
      <div style={{ width: SMALL_W - SMALL_TARGET_X, flexShrink: 0, marginLeft: 'auto' }}>
        <FieldRow
          name="target"
          iconType={type === 'regular' || type === 'out-of-view' ? Types.String : Types.Container}
          expandable={type !== 'regular' && type !== 'out-of-view'}
          target
        />
      </div>
    </div>
  </div>
);

const PERSON_NSA: FieldSpec[] = [
  { name: 'Person  (ns:a)', iconType: Types.Container, expandable: true, expanded: true },
  { name: 'name', depth: 1, iconType: Types.String },
  { name: 'age', depth: 1, iconType: Types.Integer },
  { name: 'email', depth: 1, iconType: Types.String },
];

const PERSON_NSB: FieldSpec[] = [
  { name: 'Person  (ns:b)', iconType: Types.Container, expandable: true, expanded: true },
  { name: 'name', depth: 1, iconType: Types.String, expression: '/nsa:Person/name' },
  { name: 'age', depth: 1, iconType: Types.Integer, expression: '/nsa:Person/age' },
  { name: 'email', depth: 1, iconType: Types.String, expression: '/nsa:Person/email' },
];

const EMPLOYEE_NSB: FieldSpec[] = [
  { name: 'Employee  (ns:b)', iconType: Types.Container, expandable: true, expanded: true },
  { name: 'name', depth: 1, iconType: Types.String, expression: '/nsa:Person/name' },
  { name: 'age', depth: 1, iconType: Types.Integer, expression: '/nsa:Person/age' },
  { name: 'email', depth: 1, iconType: Types.String, expression: '/nsa:Person/email' },
  { name: 'employeeId', depth: 1, iconType: Types.String },
];

const COLLAPSED_PERSON_NSA: FieldSpec[] = [
  { name: 'Person  (ns:a)', iconType: Types.Container, expandable: true, expanded: false },
];
const COLLAPSED_PERSON_NSB: FieldSpec[] = [
  { name: 'Person  (ns:b)', iconType: Types.Container, expandable: true, expanded: false },
];
const COLLAPSED_EMPLOYEE_NSB: FieldSpec[] = [
  { name: 'Employee  (ns:b)', iconType: Types.Container, expandable: true, expanded: false },
];

const PERSON_NSA_COPYOF: FieldSpec[] = [
  {
    name: 'Person  (ns:a)',
    iconType: Types.Container,
    expandable: true,
    expanded: true,
    expression: '/nsa:Person',
  },
  { name: 'name', depth: 1, iconType: Types.String },
  { name: 'age', depth: 1, iconType: Types.Integer },
  { name: 'email', depth: 1, iconType: Types.String },
];

const ROOT_PERSON_NSA_COPYOF: FieldSpec[] = [
  {
    name: 'Person  (ns:a)',
    iconType: Types.Container,
    expandable: true,
    expanded: true,
    expression: '/nsa:Root/nsa:Person',
  },
  { name: 'name', depth: 1, iconType: Types.String },
  { name: 'age', depth: 1, iconType: Types.Integer },
  { name: 'email', depth: 1, iconType: Types.String },
];

const ITEM_NSA: FieldSpec[] = [
  { name: 'Root  (ns:a)', iconType: Types.Container, expandable: true, expanded: true },
  { name: 'Item  (ns:a)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: true },
  { name: 'title', depth: 2, iconType: Types.String },
  { name: 'price', depth: 2, iconType: Types.Decimal },
];

const ITEM_NSA_COPYOF: FieldSpec[] = [
  { name: 'Root  (ns:a)', iconType: Types.Container, expandable: true, expanded: true },
  {
    name: 'Item  (ns:a)',
    depth: 1,
    iconType: Types.Container,
    collection: true,
    expandable: true,
    expanded: true,
    expression: '/nsa:Root/nsa:Item',
  },
  { name: 'title', depth: 2, iconType: Types.String },
  { name: 'price', depth: 2, iconType: Types.Decimal },
];

const PERSON_COLLECTION_NSA: FieldSpec[] = [
  { name: 'Root  (ns:a)', iconType: Types.Container, expandable: true, expanded: true },
  { name: 'Person  (ns:a)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: true },
  { name: 'name', depth: 2, iconType: Types.String },
  { name: 'age', depth: 2, iconType: Types.Integer },
  { name: 'email', depth: 2, iconType: Types.String },
];

const FOR_EACH_EMPLOYEE_COMPLETE_NSB: FieldSpec[] = [
  { name: 'for-each', variant: 'for-each', expression: '/nsa:Root/nsa:Person', expandable: true, expanded: true },
  { name: 'Employee  (ns:b)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: true },
  { name: 'name', depth: 2, iconType: Types.String, expression: 'name' },
  { name: 'age', depth: 2, iconType: Types.Integer, expression: 'age' },
  { name: 'email', depth: 2, iconType: Types.String, expression: 'email' },
];

const FOR_EACH_EMPLOYEE_NSB: FieldSpec[] = [
  { name: 'for-each', variant: 'for-each', expression: '/nsa:Root/nsa:Person', expandable: true, expanded: true },
  { name: 'Employee  (ns:b)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: true },
  { name: 'name', depth: 2, iconType: Types.String, expression: 'name' },
  { name: 'age', depth: 2, iconType: Types.Integer, expression: 'age' },
  { name: 'email', depth: 2, iconType: Types.String, expression: 'email' },
  { name: 'employeeId', depth: 2, iconType: Types.String },
];

const PERSON_WITH_ADDRESS_NSA: FieldSpec[] = [
  { name: 'Root  (ns:a)', iconType: Types.Container, expandable: true, expanded: true },
  { name: 'Person  (ns:a)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: true },
  { name: 'name', depth: 2, iconType: Types.String },
  { name: 'age', depth: 2, iconType: Types.Integer },
  { name: 'address', depth: 2, iconType: Types.String },
];

const FOR_EACH_EMPLOYEE_WITH_ADDRESS_NSB: FieldSpec[] = [
  { name: 'for-each', variant: 'for-each', expression: '/nsa:Root/nsa:Person', expandable: true, expanded: true },
  { name: 'Employee  (ns:b)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: true },
  { name: 'name', depth: 2, iconType: Types.String, expression: 'name' },
  { name: 'age', depth: 2, iconType: Types.Integer, expression: 'age' },
  { name: 'address  (ns:b)', depth: 2, iconType: Types.Container, expandable: true, expanded: true },
  { name: 'street', depth: 3, iconType: Types.String },
  { name: 'city', depth: 3, iconType: Types.String },
];

const ORDER_NSA: FieldSpec[] = [
  { name: 'Root  (ns:a)', iconType: Types.Container, expandable: true, expanded: true },
  { name: 'Order  (ns:a)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: true },
  { name: 'id', depth: 2, iconType: Types.String },
  { name: 'address  (ns:a)', depth: 2, iconType: Types.Container, expandable: true, expanded: true },
  { name: 'street', depth: 3, iconType: Types.String },
  { name: 'city', depth: 3, iconType: Types.String },
];

const FOR_EACH_SHIPMENT_NSB: FieldSpec[] = [
  { name: 'for-each', variant: 'for-each', expression: '/nsa:Root/nsa:Order', expandable: true, expanded: true },
  { name: 'Shipment  (ns:b)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: true },
  { name: 'trackingId', depth: 2, iconType: Types.String },
  {
    name: 'address  (ns:a)',
    depth: 2,
    iconType: Types.Container,
    expandable: true,
    expanded: true,
    expression: 'nsa:address',
  },
  { name: 'street', depth: 3, iconType: Types.String },
  { name: 'city', depth: 3, iconType: Types.String },
];

const COLLAPSED_PERSON_COLLECTION_NSA: FieldSpec[] = [
  { name: 'Root  (ns:a)', iconType: Types.Container, expandable: true, expanded: true },
  { name: 'Person  (ns:a)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: false },
];
const COLLAPSED_FOR_EACH_PERSON: FieldSpec[] = [
  { name: 'for-each', variant: 'for-each', expression: '/nsa:Root/nsa:Person', expandable: true, expanded: false },
];
const COLLAPSED_FOR_EACH_ORDER: FieldSpec[] = [
  { name: 'for-each', variant: 'for-each', expression: '/nsa:Root/nsa:Order', expandable: true, expanded: false },
];
const COLLAPSED_ORDER_NSA: FieldSpec[] = [
  { name: 'Root  (ns:a)', iconType: Types.Container, expandable: true, expanded: true },
  { name: 'Order  (ns:a)', depth: 1, iconType: Types.Container, collection: true, expandable: true, expanded: false },
];

const ContainerMappingMockup: FunctionComponent = () => null;

export default {
  title: 'UI Mockups/DataMapper/Container Mapping',
  component: ContainerMappingMockup,
  parameters: {
    docs: {
      description: {
        component: `
These stories demonstrate the proposed mapping creation behavior and line styles that result from drag-and-dropping container fields
in the DataMapper. Each scenario shows what the user sees after dropping a source container onto a target container.

**Collapsed vs Expanded**: \`partial\` and \`complete\` line styles only appear at the container row when both sides
are collapsed. When the user expands either side to the leaf level, individual child lines render as \`regular\` —
the container-level distinction disappears and only the mapped vs unmapped children are visible.

| Line type | Style | When it appears |
|---|---|---|
| \`copy-of\` | double line (solid) | DnD produced an exact namespace + structure match, or either side is \`xs:anyType\` |
| \`complete\` | almost-connected | DnD auto-mapped all children (different namespaces), containers collapsed |
| \`regular\` | solid | Any leaf-level field mapping, or containers expanded |
| \`partial\` | short-dash | DnD matched only some children, containers collapsed |
| \`out-of-view\` | dotted (light gray) | Source or target node is scrolled outside the viewport |

## Collection Fields (maxOccurs > 1)

When both source and target are **collection fields**, the mapping behavior depends on FQN (namespace + local name):

- **Same FQN** → \`xsl:copy-of\` — copies all repeating elements as-is
- **Different FQN** → auto \`xsl:for-each\` — iterates over source instances, auto-maps matching children

When only one side is a collection, regular \`value-of\` / \`copy-of\` mapping is created (no for-each).

### Child auto-mapping criteria (within for-each)

| Source child | Target child | Same FQN? | Result |
|---|---|---|---|
| Leaf | Leaf | Name matches | \`value-of\` auto-mapping |
| Container | Container | Yes | \`copy-of\` auto-mapping |
| Container | Container | No | Left unmapped |
| Leaf ↔ Container | — | — | Left unmapped (kind mismatch) |

Simple type differences (e.g., \`xs:string\` → \`xs:int\`) are allowed for leaf-to-leaf. No recursive auto-mapping
into container children for the first iteration.
        `,
      },
    },
  },
} as Meta<typeof ContainerMappingMockup>;

export const PartialChildrenMappings: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>Partial auto-mapping — some children matched</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      When drag and drop is performed between different container fields, and they have one or more same child(ren) but
      not all, it creates mappings for matching child(ren). When it is collapsed, thin line renders between parent
      field(s). When it is expanded to the children, it renders the line for each child mapping.
    </p>
    <MappingDemo
      label="Collapsed"
      description="Thin line signals partial fill — some target children have no source"
      sourceFields={COLLAPSED_PERSON_NSA}
      targetFields={COLLAPSED_EMPLOYEE_NSB}
      lines={[{ y1: rowY(0), y2: rowY(0), type: 'partial' }]}
    />
    <MappingDemo
      label="Expanded"
      description="Individual regular lines — employeeId row has no source mapping"
      sourceFields={PERSON_NSA}
      targetFields={EMPLOYEE_NSB}
      lines={[
        { y1: rowY(1), y2: rowY(1), type: 'regular' },
        { y1: rowY(2), y2: rowY(2), type: 'regular' },
        { y1: rowY(3), y2: rowY(3), type: 'regular' },
      ]}
    />
  </div>
);

export const CompleteChildrenMappings: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>Complete auto-mapping — all children matched</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      When drag and drop is performed between different container fields, and both have exactly same children, It
      creates mappings for each children. When it is collapsed, heavier line renders between parent field(s). When it is
      expanded to the children, it renders the line for each child mapping.
    </p>
    <MappingDemo
      label="Collapsed"
      description="Heavier line signals all children are covered"
      sourceFields={COLLAPSED_PERSON_NSA}
      targetFields={COLLAPSED_PERSON_NSB}
      lines={[{ y1: rowY(0), y2: rowY(0), type: 'complete' }]}
    />
    <MappingDemo
      label="Expanded"
      description="Individual regular lines — partial/complete distinction disappears at leaf level"
      sourceFields={PERSON_NSA}
      targetFields={PERSON_NSB}
      lines={[
        { y1: rowY(1), y2: rowY(1), type: 'regular' },
        { y1: rowY(2), y2: rowY(2), type: 'regular' },
        { y1: rowY(3), y2: rowY(3), type: 'regular' },
      ]}
    />
  </div>
);

export const CopyOf: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>xsl:copy-of — exact namespace + structure match</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      When drag and drop is performed between exactly same fields (both namespace and local name matches),{' '}
      <code>xsl:copy-of</code> mapping is created and mapping line is drawn only between those fields (no line between
      children).
    </p>
    <MappingDemo
      label="(always a single container-level line)"
      sourceFields={PERSON_NSA}
      targetFields={PERSON_NSA_COPYOF}
      lines={[{ y1: rowY(0), y2: rowY(0), type: 'copy-of' }]}
    />
  </div>
);

export const CopyOfAnyType: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>xsl:copy-of — xs:anyType involved</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      When drag and drop is performed from or to <code>xs:anyType</code> field, <code>xsl:copy-of</code> mapping is
      created.
    </p>
    <MappingDemo
      label="Target is xs:anyType"
      description="Target accepts any XML content — copy-of is always safe"
      sourceFields={PERSON_NSA}
      targetFields={[{ name: 'payload  (xs:anyType)', iconType: Types.AnyType, expression: '/nsa:Person/node()' }]}
      lines={[{ y1: rowY(0), y2: rowY(0), type: 'copy-of' }]}
    />
    <MappingDemo
      label="Source is xs:anyType"
      description="Source structure unknown at schema time — copy-of is the only viable option"
      sourceFields={[{ name: 'payload  (xs:anyType)', iconType: Types.AnyType }]}
      targetFields={[
        {
          name: 'Person  (ns:a)',
          iconType: Types.Container,
          expandable: true,
          expanded: true,
          expression: '/payload/node()',
        },
        { name: 'name', depth: 1, iconType: Types.String },
        { name: 'age', depth: 1, iconType: Types.Integer },
        { name: 'email', depth: 1, iconType: Types.String },
      ]}
      lines={[{ y1: rowY(0), y2: rowY(0), type: 'copy-of' }]}
    />
  </div>
);

export const MappingLineStyles: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>Mapping line styles</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>All 5 line types × 2 selection states.</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Unselected</div>
        <SmallMappingDemo label="copy-of" type="copy-of" selected={false} />
        <SmallMappingDemo label="complete container" type="complete" selected={false} />
        <SmallMappingDemo label="regular field" type="regular" selected={false} />
        <SmallMappingDemo label="partial container" type="partial" selected={false} />
        <SmallMappingDemo label="out of view" type="out-of-view" selected={false} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Selected</div>
        <SmallMappingDemo label="copy-of" type="copy-of" selected={true} />
        <SmallMappingDemo label="complete container" type="complete" selected={true} />
        <SmallMappingDemo label="regular field" type="regular" selected={true} />
        <SmallMappingDemo label="partial container" type="partial" selected={true} />
        <SmallMappingDemo label="out of view" type="out-of-view" selected={true} />
      </div>
    </div>
  </div>
);
MappingLineStyles.storyName = 'Mapping line styles';

export const CollectionCopyOf: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>Collection xsl:copy-of — same FQN</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      When both source and target are collection fields (<code>maxOccurs &gt; 1</code>) with the same namespace and
      local name, <code>xsl:copy-of</code> is created. The XPath naturally selects all repeating instances.
    </p>
    <MappingDemo
      label="(always a single container-level line)"
      description="copy-of copies all repeating Item elements"
      sourceFields={ITEM_NSA}
      targetFields={ITEM_NSA_COPYOF}
      lines={[{ y1: rowY(1), y2: rowY(1), type: 'copy-of' }]}
    />
  </div>
);
CollectionCopyOf.storyName = 'Collection: copy-of (same FQN)';

export const CollectionForEachComplete: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>Collection xsl:for-each — complete auto-mapping</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      When both source and target are collection fields with different FQN, <code>xsl:for-each</code> is auto-created to
      iterate over source instances. The for-each node replaces the target field position, with the target element
      instance as its child. Children are auto-mapped where name and kind (leaf vs container) match.
    </p>
    <MappingDemo
      label="Collapsed"
      description="Source collection connects to the for-each node"
      sourceFields={COLLAPSED_PERSON_COLLECTION_NSA}
      targetFields={COLLAPSED_FOR_EACH_PERSON}
      lines={[{ y1: rowY(1), y2: rowY(0), type: 'complete' }]}
    />
    <MappingDemo
      label="Expanded"
      description="Employee is a child of for-each; individual regular lines for each child"
      sourceFields={PERSON_COLLECTION_NSA}
      targetFields={FOR_EACH_EMPLOYEE_COMPLETE_NSB}
      lines={[
        { y1: rowY(1), y2: rowY(0), type: 'regular' },
        { y1: rowY(2), y2: rowY(2), type: 'regular' },
        { y1: rowY(3), y2: rowY(3), type: 'regular' },
        { y1: rowY(4), y2: rowY(4), type: 'regular' },
      ]}
    />
  </div>
);
CollectionForEachComplete.storyName = 'Collection: for-each (complete)';

export const CollectionForEachPartial: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>Collection xsl:for-each — partial auto-mapping</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      When the target has children without a source counterpart (e.g., <code>employeeId</code>), only matching children
      are auto-mapped. The for-each node shows the source XPath expression.
    </p>
    <MappingDemo
      label="Collapsed"
      description="Thin line — employeeId has no source"
      sourceFields={COLLAPSED_PERSON_COLLECTION_NSA}
      targetFields={COLLAPSED_FOR_EACH_PERSON}
      lines={[{ y1: rowY(1), y2: rowY(0), type: 'partial' }]}
    />
    <MappingDemo
      label="Expanded"
      description="employeeId row has no source mapping"
      sourceFields={PERSON_COLLECTION_NSA}
      targetFields={FOR_EACH_EMPLOYEE_NSB}
      lines={[
        { y1: rowY(1), y2: rowY(0), type: 'regular' },
        { y1: rowY(2), y2: rowY(2), type: 'regular' },
        { y1: rowY(3), y2: rowY(3), type: 'regular' },
        { y1: rowY(4), y2: rowY(4), type: 'regular' },
      ]}
    />
  </div>
);
CollectionForEachPartial.storyName = 'Collection: for-each (partial)';

export const CollectionForEachTypeMismatch: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>Collection xsl:for-each — kind mismatch skipped</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      The <code>address</code> field exists in both source and target but with different kinds — source has{' '}
      <code>address</code> as a leaf (<code>xs:string</code>), target has <code>address</code> as a container (with{' '}
      <code>street</code>, <code>city</code> children). Auto-mapping skips this field because leaf-to-container mapping
      is blocked. Only same-kind children (<code>name</code>, <code>age</code>) are auto-mapped.
    </p>
    <MappingDemo
      label="Collapsed"
      description="Partial — address skipped due to kind mismatch"
      sourceFields={COLLAPSED_PERSON_COLLECTION_NSA}
      targetFields={COLLAPSED_FOR_EACH_PERSON}
      lines={[{ y1: rowY(1), y2: rowY(0), type: 'partial' }]}
    />
    <MappingDemo
      label="Expanded"
      description="name and age auto-mapped; address unmapped (leaf vs container)"
      sourceFields={PERSON_WITH_ADDRESS_NSA}
      targetFields={FOR_EACH_EMPLOYEE_WITH_ADDRESS_NSB}
      lines={[
        { y1: rowY(1), y2: rowY(0), type: 'regular' },
        { y1: rowY(2), y2: rowY(2), type: 'regular' },
        { y1: rowY(3), y2: rowY(3), type: 'regular' },
      ]}
    />
  </div>
);
CollectionForEachTypeMismatch.storyName = 'Collection: for-each (kind mismatch)';

export const CollectionForEachContainerChild: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>Collection xsl:for-each — container child with same FQN</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      Within a <code>for-each</code>, when a container child has matching FQN on both sides, it is auto-mapped with{' '}
      <code>copy-of</code>. Container children with different FQN are left unmapped. No recursive descent into
      sub-children for the first iteration.
    </p>
    <MappingDemo
      label="Collapsed"
      description="Partial — only address (container) is auto-mapped via copy-of"
      sourceFields={COLLAPSED_ORDER_NSA}
      targetFields={COLLAPSED_FOR_EACH_ORDER}
      lines={[{ y1: rowY(1), y2: rowY(0), type: 'partial' }]}
    />
    <MappingDemo
      label="Expanded"
      description="copy-of on address (same FQN); id and trackingId unmapped"
      sourceFields={ORDER_NSA}
      targetFields={FOR_EACH_SHIPMENT_NSB}
      lines={[
        { y1: rowY(1), y2: rowY(0), type: 'regular' },
        { y1: rowY(3), y2: rowY(3), type: 'copy-of' },
      ]}
    />
  </div>
);
CollectionForEachContainerChild.storyName = 'Collection: for-each (container child)';

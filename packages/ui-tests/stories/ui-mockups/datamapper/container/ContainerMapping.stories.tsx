import './ContainerMapping.stories.scss';

import { Meta, StoryFn } from '@storybook/react';
import { FunctionComponent } from 'react';

const FULL_W = 700;
const FULL_SOURCE_X = 260;
const FULL_TARGET_X = 440;
const SMALL_W = 340;
const SMALL_SOURCE_X = 130;
const SMALL_TARGET_X = 210;
const ROW_H = 36;

type MappingLineType = 'copy-of' | 'complete' | 'partial' | 'regular';

interface LineSpec {
  y1: number;
  y2: number;
  type: MappingLineType;
  selected?: boolean;
}

interface FieldSpec {
  name: string;
  depth?: number;
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
  return (
    <>
      <circle cx={sourceX} cy={y1} r={4} className={`dm-link-dot dm-link-dot--${type}${suffix}`} />
      <path d={bezierD(sourceX, y1, targetX, y2)} className={`dm-link dm-link--${type}${suffix}`} />
      <circle cx={targetX} cy={y2} r={4} className={`dm-link-dot dm-link-dot--${type}${suffix}`} />
    </>
  );
};

const FieldRow: FunctionComponent<FieldSpec> = ({ name, depth = 0 }) => (
  <div
    style={{
      height: ROW_H,
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 8 + depth * 16,
      gap: 6,
      borderBottom: '1px solid #d2d2d2',
      fontSize: 13,
      fontFamily: 'monospace',
      boxSizing: 'border-box',
    }}
  >
    <span style={{ color: '#6a6e73', fontSize: 10 }}>{depth === 0 ? '▶' : '●'}</span>
    <span>{name}</span>
  </div>
);

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
            <FieldRow key={`tgt-${f.name}-${f.depth}`} {...f} />
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
        <FieldRow name="source" />
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
        <FieldRow name="target" />
      </div>
    </div>
  </div>
);

const PERSON_NSA: FieldSpec[] = [
  { name: 'Person  (ns:a)', depth: 0 },
  { name: 'name', depth: 1 },
  { name: 'age', depth: 1 },
  { name: 'email', depth: 1 },
];

const PERSON_NSB: FieldSpec[] = [
  { name: 'Person  (ns:b)', depth: 0 },
  { name: 'name', depth: 1 },
  { name: 'age', depth: 1 },
  { name: 'email', depth: 1 },
];

const EMPLOYEE_NSB: FieldSpec[] = [
  { name: 'Employee  (ns:b)', depth: 0 },
  { name: 'name', depth: 1 },
  { name: 'age', depth: 1 },
  { name: 'email', depth: 1 },
  { name: 'employeeId', depth: 1 },
];

const COLLAPSED_PERSON_NSA: FieldSpec[] = [{ name: 'Person  (ns:a)', depth: 0 }];
const COLLAPSED_PERSON_NSB: FieldSpec[] = [{ name: 'Person  (ns:b)', depth: 0 }];
const COLLAPSED_EMPLOYEE_NSB: FieldSpec[] = [{ name: 'Employee  (ns:b)', depth: 0 }];

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

| Line type | Weight | When it appears |
|---|---|---|
| \`copy-of\` (5px) | boldest | DnD produced an exact namespace + structure match, or either side is \`xs:anyType\` |
| \`complete\` (4px) | heavy | DnD auto-mapped all children (different namespaces), containers collapsed |
| \`regular\` (3px) | normal | Any leaf-level field mapping, or containers expanded |
| \`partial\` (2px) | thinnest | DnD matched only some children, containers collapsed |
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
      targetFields={PERSON_NSA}
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
      targetFields={[{ name: 'payload  (xs:anyType)', depth: 0 }]}
      lines={[{ y1: rowY(0), y2: rowY(0), type: 'copy-of' }]}
    />
    <MappingDemo
      label="Source is xs:anyType"
      description="Source structure unknown at schema time — copy-of is the only viable option"
      sourceFields={[{ name: 'payload  (xs:anyType)', depth: 0 }]}
      targetFields={PERSON_NSA}
      lines={[{ y1: rowY(0), y2: rowY(0), type: 'copy-of' }]}
    />
  </div>
);

export const SelectionStates: StoryFn<typeof ContainerMappingMockup> = () => (
  <div style={{ padding: 24 }}>
    <h2 style={{ fontSize: 16, marginBottom: 4 }}>Selection States</h2>
    <p style={{ fontSize: 13, color: '#6a6e73', marginBottom: 20 }}>
      All 4 line types × 2 selection states, shown as collapsed container representations.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Unselected</div>
        <SmallMappingDemo label="copy-of" type="copy-of" selected={false} />
        <SmallMappingDemo label="complete container" type="complete" selected={false} />
        <SmallMappingDemo label="regular field" type="regular" selected={false} />
        <SmallMappingDemo label="partial container" type="partial" selected={false} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Selected</div>
        <SmallMappingDemo label="copy-of" type="copy-of" selected={true} />
        <SmallMappingDemo label="complete container" type="complete" selected={true} />
        <SmallMappingDemo label="regular field" type="regular" selected={true} />
        <SmallMappingDemo label="partial container" type="partial" selected={true} />
      </div>
    </div>
  </div>
);

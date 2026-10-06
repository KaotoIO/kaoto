import '../../Custom/Node/CustomNode.scss';
import './OverlayPresentationDemo.scss';

import { ArrowRightIcon, CodeBranchIcon } from '@patternfly/react-icons';
import { FunctionComponent, ReactNode } from 'react';

import amqpIcon from '../../../../assets/components/amqp.svg';
import fileWatchIcon from '../../../../assets/components/file-watch.svg';
import logIcon from '../../../../assets/components/log.svg';
import pdfIcon from '../../../../assets/components/pdf.svg';
import xmppIcon from '../../../../assets/components/xmpp.svg';
import { createVisualizationNode } from '../../../../models';
import { CustomNodeContainer } from '../../Custom/Node/CustomNodeContainer';
import { CustomNodeLabel } from '../../Custom/Node/CustomNodeLabel';
import { OverlayEntry, OverlayTone } from '../overlay-entries';
import { OverlayAnnotation } from '../OverlayAnnotation';
import { EdgeOverlayHighlight, NodeOverlayHighlight } from '../OverlayHighlight';

const tones: OverlayTone[] = ['neutral', 'info', 'success', 'warning', 'error'];
const annotation = (
  id: string,
  target: OverlayEntry['target'],
  text: string,
  value: number,
): Extract<OverlayEntry, { kind: 'annotation' }> => ({
  id,
  target,
  kind: 'annotation',
  text,
  value,
  unit: 'ms',
  tone: 'info',
  interaction: { accessibleLabel: `${id} annotation`, tooltip: 'Fixed demonstration value' },
});
interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
  selected?: boolean;
  warning?: boolean;
  disabled?: boolean;
  decorated?: boolean;
  layout?: 'horizontal' | 'vertical';
  count?: number;
  icon?: string;
  consumer?: boolean;
  highlighted?: boolean;
}

const DemoNode: FunctionComponent<NodeProps> = ({
  id,
  label,
  x,
  y,
  selected,
  warning,
  disabled,
  decorated,
  layout = 'horizontal',
  count = 42,
  icon = logIcon,
  consumer = false,
  highlighted = decorated,
}) => {
  const node = createVisualizationNode(id, {
    name: label,
    path: id,
    title: label,
    description: label,
    iconUrl: icon,
    isPlaceholder: false,
    isGroup: false,
  });
  return (
    <g data-demo-node={id} transform={`translate(${x} ${y})`}>
      {highlighted && <NodeOverlayHighlight bounds={{ x: 15, y: 7.5, width: 60, height: 60 }} emphasis="strong" />}
      <g className="custom-node" data-selected={!!selected} data-warning={!!warning} data-disabled={!!disabled}>
        <CustomNodeContainer
          width={90}
          height={75}
          dataTestId={id}
          vizNode={node}
          isCollapsed={false}
          childCount={0}
          ProcessorIcon={consumer ? CodeBranchIcon : ArrowRightIcon}
          processorDescription="Existing processor badge"
          isDisabled={!!disabled}
        />
        <CustomNodeLabel
          label={label}
          x={-55}
          y={75}
          width={200}
          doesHaveWarnings={warning}
          validationText="Existing validation warning"
        />
      </g>
      {decorated && (
        <foreignObject
          className={`kaoto-overlay-demo__step-annotation kaoto-overlay-demo__step-annotation--${layout}`}
          x={layout === 'vertical' ? 55 : 5}
          y={-28}
          width={80}
          height={24}
        >
          <OverlayAnnotation
            entry={{
              ...annotation(`${id} metric`, { kind: 'node', id }, '', count),
              unit: '',
              interaction: {
                accessibleLabel: `${id} message count`,
                tooltip: 'Messages processed by this step (demo)',
              },
            }}
          />
        </foreignObject>
      )}
    </g>
  );
};

/** Demo-only group shell, matching the editor's nested route/choice presentation. */
const DemoGroup: FunctionComponent<{
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
}> = ({ id, label, x, y, width, height, children }) => (
  <g data-demo-group={id}>
    <rect className="kaoto-overlay-demo__route" x={x} y={y} width={width} height={height} rx={10} />
    <path
      className="kaoto-overlay-demo__group-header"
      d={`M${x + 10} ${y} H${x + width - 10} Q${x + width} ${y} ${x + width} ${y + 10} V${y + 24} H${x} V${y + 10} Q${x} ${y} ${x + 10} ${y}`}
    />
    <text className="kaoto-overlay-demo__group-title" x={x + 12} y={y + 17}>
      {label}
    </text>
    {children}
  </g>
);

/** Fixed geometry only. Does not subscribe to the model, overlay store, or host bridge. */
export const OverlayPresentationDemo: FunctionComponent = () => {
  const annotatedEdge = { startX: 150, endX: 250, y: 357.5 };
  // Explicit demo geometry for the supplied route; no runtime path inference.
  const selectedPaths = [
    { id: 'from-1199-choice-1601', path: `M${annotatedEdge.startX} ${annotatedEdge.y} H${annotatedEdge.endX}` },
    { id: 'when-2399-to-1402', path: 'M250 357.5 H270 V322.5 H350' },
    { id: 'to-1402-choice-exit', path: 'M410 322.5 H660 V357.5 H690' },
    { id: 'choice-1601-to-2430', path: 'M690 357.5 H810' },
  ];
  const unvisitedPaths = [
    { id: 'otherwise-3621-to-3904', path: 'M270 357.5 V557.5 H350' },
    { id: 'to-3904-choice-exit', path: 'M410 557.5 H660 V357.5' },
  ];
  return (
    <section className="kaoto-overlay-demo" aria-label="Overlay presentation gallery">
      <h1>Canvas overlays — presentation gallery</h1>
      <p>
        Fixed data and provisional placement. Existing corner badges, validation labels and selection remain visible.
      </p>
      <p>
        route-1837: file-watch → choice → kamelet:pdf-action → amqp. The otherwise/xmpp branch was not visited.
        Highlights show the message path, not its outcome. Counts are illustrative.
      </p>
      <svg width={1100} height={965} aria-label="route-1837 with nested choice branches and an explicit message path">
        <DemoGroup id="route-1837" label="route-1837" x={10} y={10} width={1060} height={700}>
          <DemoGroup id="choice-1601" label="choice" x={250} y={65} width={440} height={610}>
            <text x={310} y={125}>
              {'${header.foo} == 1'}
            </text>
            <DemoGroup id="when-2399" label="when" x={290} y={230} width={340} height={165} />
            <DemoGroup id="otherwise-3621" label="otherwise" x={290} y={465} width={340} height={165} />
          </DemoGroup>
          <foreignObject x={800} y={45} width={180} height={36}>
            <OverlayAnnotation
              entry={annotation('route-1837', { kind: 'route', id: 'route-1837' }, 'Route total', 12.5)}
            />
          </foreignObject>
          {unvisitedPaths.map(({ id, path }) => (
            <path key={id} data-demo-edge={id} d={path} className="kaoto-overlay-demo__edge" />
          ))}
          {selectedPaths.map(({ id, path }) => (
            <g key={id} data-demo-edge={id}>
              <EdgeOverlayHighlight path={path} emphasis="strong" />
              <path d={path} className="kaoto-overlay-demo__edge" />
            </g>
          ))}
          <DemoNode id="from-1199" label="file-watch" icon={fileWatchIcon} consumer x={75} y={320} decorated />
          <DemoNode id="to-1402" label="kamelet:pdf-action" icon={pdfIcon} x={335} y={285} decorated />
          <DemoNode
            id="to-3904"
            label="xmpp"
            icon={xmppIcon}
            x={335}
            y={520}
            warning
            decorated
            highlighted={false}
            count={0}
          />
          <DemoNode id="to-2430" label="amqp" icon={amqpIcon} x={795} y={320} decorated />
          <foreignObject
            className="kaoto-overlay-demo__edge-annotation"
            x={(annotatedEdge.startX + annotatedEdge.endX) / 2 - 85}
            y={250}
            width={170}
            height={36}
          >
            <OverlayAnnotation
              entry={annotation('edge metric', { kind: 'edge', id: 'from-1199-choice-1601' }, 'Edge duration', 2.75)}
            />
          </foreignObject>
          <path d="M870 357.5 H940" className="kaoto-overlay-demo__edge" />
          <foreignObject x={940} y={340} width={40} height={40}>
            <button
              className="kaoto-overlay-demo__add"
              aria-label="Reference Add step"
              title="Reference editing control"
            >
              +
            </button>
          </foreignObject>
          <text x={120} y={435} textAnchor="middle">
            inbox
          </text>
          <text x={840} y={435} textAnchor="middle">
            outbox
          </text>
        </DemoGroup>
        <rect className="kaoto-overlay-demo__route" x={10} y={735} width={1060} height={220} rx={10} />
        <text className="kaoto-overlay-demo__heading" x={30} y={767}>
          Route B · separate route target
        </text>
        <foreignObject x={650} y={745} width={180} height={36}>
          <OverlayAnnotation
            entry={annotation(
              'route-b',
              { kind: 'route', id: 'route-b' },
              'A long route annotation with full text in its tooltip',
              0,
            )}
          />
        </foreignObject>
        <DemoNode id="route-b-log" label="log" x={65} y={815} />
      </svg>
      <h2>Vertical layout — incoming edges stay clear</h2>
      <svg width={1100} height={240} aria-label="Vertical step annotation placement">
        <defs>
          <marker
            id="overlay-demo-arrow"
            viewBox="0 0 10 10"
            refX={10}
            refY={5}
            markerWidth={8}
            markerHeight={8}
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill="currentColor" />
          </marker>
        </defs>
        <path d="M125 15 V103" className="kaoto-overlay-demo__edge" markerEnd="url(#overlay-demo-arrow)" />
        <path d="M475 15 V103" className="kaoto-overlay-demo__edge" markerEnd="url(#overlay-demo-arrow)" />
        <DemoNode id="vertical-short" label="log" x={80} y={100} decorated disabled layout="vertical" />
        <DemoNode id="vertical-long" label="log" x={430} y={100} decorated disabled layout="vertical" count={123456} />
      </svg>
      <h2>Independent tone and emphasis</h2>
      <div className="kaoto-overlay-demo__samples">
        {tones.map((tone) => (
          <div key={tone}>
            <span>{tone}</span>
            {(['normal', 'strong', 'subdued'] as const).map((emphasis) => (
              <div className="kaoto-overlay-demo__sample" key={emphasis}>
                <OverlayAnnotation
                  entry={{
                    ...annotation(`${tone} ${emphasis}`, { kind: 'node', id: 'sample' }, 'Count', 42),
                    unit: '',
                    tone,
                    emphasis,
                  }}
                />
                <span>{emphasis}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <h2>Translated and scaled SVG containers</h2>
      <svg width={1100} height={320} aria-label="Scaled overlays">
        <text x={30} y={25}>
          0.75×
        </text>
        <text x={400} y={25}>
          1.5×
        </text>
        <g transform="translate(40 85) scale(0.75)">
          <DemoNode id="small" label="small log" x={0} y={0} decorated disabled />
        </g>
        <g transform="translate(410 85) scale(1.5)">
          <DemoNode id="large" label="large log" x={0} y={0} decorated warning />
        </g>
      </svg>
      <p>
        Presentation only. Automatic collision handling, overflow and composition across owners remain separate work.
      </p>
    </section>
  );
};

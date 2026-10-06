import '../../Custom/Node/CustomNode.scss';
import './OverlayPresentationDemo.scss';

import { ArrowRightIcon, CodeBranchIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import logIcon from '../../../../assets/components/log.svg';
import timerIcon from '../../../../assets/components/timer.svg';
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
}) => {
  const node = createVisualizationNode(id, {
    name: label,
    path: id,
    title: label,
    description: label,
    iconUrl: label === 'timer' ? timerIcon : logIcon,
    isPlaceholder: false,
    isGroup: false,
  });
  return (
    <g transform={`translate(${x} ${y})`}>
      {decorated && <NodeOverlayHighlight bounds={{ x: 15, y: 7.5, width: 60, height: 60 }} emphasis="strong" />}
      <g className="custom-node" data-selected={!!selected} data-warning={!!warning} data-disabled={!!disabled}>
        <CustomNodeContainer
          width={90}
          height={75}
          dataTestId={id}
          vizNode={node}
          isCollapsed={false}
          childCount={0}
          ProcessorIcon={label === 'timer' ? CodeBranchIcon : ArrowRightIcon}
          processorDescription="Existing processor badge"
          isDisabled={!!disabled}
        />
        <CustomNodeLabel
          label={label}
          x={-30}
          y={75}
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

/** Fixed geometry only. Does not subscribe to the model, overlay store, or host bridge. */
export const OverlayPresentationDemo: FunctionComponent = () => {
  const annotatedEdge = { startX: 155, endX: 430, y: 138 };
  const selectedPaths = [`M${annotatedEdge.startX} ${annotatedEdge.y} H${annotatedEdge.endX}`, 'M520 138 H790'];
  return (
    <section className="kaoto-overlay-demo" aria-label="Overlay presentation gallery">
      <h1>Canvas overlays — presentation gallery</h1>
      <p>
        Fixed data and provisional placement. Existing corner badges, validation labels and selection remain visible.
      </p>
      <p>
        Explicit highlighted subset: timer → choice → selected log. The lower branch is not highlighted; route B is
        independent.
      </p>
      <svg width={1100} height={700} aria-label="Two routes with an explicit highlighted branch">
        <rect className="kaoto-overlay-demo__route" x={10} y={10} width={1060} height={435} rx={10} />
        <text className="kaoto-overlay-demo__heading" x={30} y={43}>
          Route A · branch example
        </text>
        <foreignObject x={650} y={20} width={180} height={36}>
          <OverlayAnnotation entry={annotation('route-a', { kind: 'route', id: 'route-a' }, 'Route total', 12.5)} />
        </foreignObject>
        {selectedPaths.map((path) => (
          <EdgeOverlayHighlight key={path} path={path} emphasis="strong" />
        ))}
        {selectedPaths.map((path) => (
          <path key={path} d={path} className="kaoto-overlay-demo__edge" />
        ))}
        <path d="M630 138 V332 H790" className="kaoto-overlay-demo__edge" />
        <DemoNode id="timer" label="timer" x={65} y={100} decorated />
        <DemoNode id="choice" label="choice" x={430} y={100} warning decorated count={0} />
        <DemoNode id="selected-log" label="selected log" x={790} y={100} selected decorated count={123456} />
        <DemoNode id="disabled-log" label="disabled log" x={790} y={295} disabled />
        <foreignObject
          className="kaoto-overlay-demo__edge-annotation"
          x={(annotatedEdge.startX + annotatedEdge.endX) / 2 - 85}
          y={65}
          width={170}
          height={36}
        >
          <OverlayAnnotation
            entry={annotation('edge metric', { kind: 'edge', id: 'timer-choice' }, 'Edge duration', -2.75)}
          />
        </foreignObject>
        <foreignObject x={270} y={118} width={40} height={40}>
          <button className="kaoto-overlay-demo__add" aria-label="Reference Add step" title="Reference editing control">
            +
          </button>
        </foreignObject>
        <text x={50} y={405}>
          Counts above steps; existing corner badges and validation labels remain visible.
        </text>
        <rect className="kaoto-overlay-demo__route" x={10} y={465} width={1060} height={220} rx={10} />
        <text className="kaoto-overlay-demo__heading" x={30} y={497}>
          Route B · separate route target
        </text>
        <foreignObject x={650} y={475} width={180} height={36}>
          <OverlayAnnotation
            entry={annotation(
              'route-b',
              { kind: 'route', id: 'route-b' },
              'A long route annotation with full text in its tooltip',
              0,
            )}
          />
        </foreignObject>
        <DemoNode id="route-b-log" label="log" x={65} y={545} />
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

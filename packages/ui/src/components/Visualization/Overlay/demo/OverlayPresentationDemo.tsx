import '../../Custom/Node/CustomNode.scss';
import './OverlayPresentationDemo.scss';

import { ArrowRightIcon, CodeBranchIcon } from '@patternfly/react-icons';
import { FunctionComponent, useState } from 'react';

import logIcon from '../../../../assets/components/log.svg';
import timerIcon from '../../../../assets/components/timer.svg';
import { createVisualizationNode } from '../../../../models';
import { CustomNodeContainer } from '../../Custom/Node/CustomNodeContainer';
import { CustomNodeLabel } from '../../Custom/Node/CustomNodeLabel';
import { OverlayEntry, OverlayTone } from '../overlay-entries';
import { OverlayPresentationAction } from '../overlay-presentation';
import { OverlayAnnotation } from '../OverlayAnnotation';
import { EdgeOverlayHighlight, NodeOverlayHighlight } from '../OverlayHighlight';
import { OverlayMarker } from '../OverlayMarker';

const menu = [
  { id: 'inspect', label: 'Inspect overlay', enabled: true },
  { id: 'unavailable', label: 'Unavailable action', enabled: false },
  { id: 'dismiss', label: 'Dismiss example', enabled: true },
];
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
  interaction: { accessibleLabel: `${id} annotation`, contextMenu: menu, tooltip: 'Fixed demonstration value' },
});
const marker = (
  id: string,
  targetId: string,
  icon: string,
  subdued = false,
): Extract<OverlayEntry, { kind: 'marker' }> => ({
  id,
  kind: 'marker',
  target: { kind: 'node', id: targetId },
  icon,
  tone: subdued ? 'neutral' : 'error',
  emphasis: subdued ? 'subdued' : 'normal',
  interaction: {
    accessibleLabel: id,
    tooltip: `${id}: ${subdued ? 'subdued' : 'normal'} example marker`,
    contextMenu: menu,
  },
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
  onAction: (action: OverlayPresentationAction) => void;
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
  onAction,
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
      {decorated && (
        <NodeOverlayHighlight bounds={{ x: 15, y: 7.5, width: 60, height: 60 }} tone="success" emphasis="strong" />
      )}
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
        <>
          <foreignObject x={90} y={50} width={36} height={36} overflow="visible">
            <OverlayMarker entry={marker(`${id} circle`, id, 'circle')} onAction={onAction} />
          </foreignObject>
          <foreignObject x={90} y={90} width={36} height={36} overflow="visible">
            <OverlayMarker entry={marker(`${id} diamond`, id, 'diamond', true)} onAction={onAction} />
          </foreignObject>
          <foreignObject x={-25} y={132} width={170} height={36}>
            <OverlayAnnotation
              entry={annotation(`${id} metric`, { kind: 'node', id }, 'Elapsed', 0)}
              onAction={onAction}
            />
          </foreignObject>
        </>
      )}
    </g>
  );
};

/** Fixed geometry only. Does not subscribe to the model, overlay store, or host bridge. */
export const OverlayPresentationDemo: FunctionComponent = () => {
  const [lastAction, setLastAction] = useState('None');
  const onAction = (action: OverlayPresentationAction) => {
    setLastAction(`${action.entryId} → ${action.target.kind}:${action.target.id} → ${action.actionId}`);
  };
  const selectedPaths = ['M155 138 H430', 'M520 138 H790'];
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
      <p role="status">Last local action: {lastAction}</p>
      <svg width={1100} height={700} aria-label="Two routes with an explicit highlighted branch">
        <rect className="kaoto-overlay-demo__route" x={10} y={10} width={1060} height={435} rx={10} />
        <text className="kaoto-overlay-demo__heading" x={30} y={43}>
          Route A · branch example
        </text>
        <foreignObject x={650} y={20} width={180} height={36}>
          <OverlayAnnotation
            entry={annotation('route-a', { kind: 'route', id: 'route-a' }, 'Route total', 12.5)}
            onAction={onAction}
          />
        </foreignObject>
        {selectedPaths.map((path) => (
          <EdgeOverlayHighlight key={path} path={path} tone="success" emphasis="strong" />
        ))}
        {selectedPaths.map((path) => (
          <path key={path} d={path} className="kaoto-overlay-demo__edge" />
        ))}
        <path d="M630 138 V332 H790" className="kaoto-overlay-demo__edge" />
        <DemoNode id="timer" label="timer" x={65} y={100} decorated onAction={onAction} />
        <DemoNode id="choice" label="choice" x={430} y={100} warning decorated onAction={onAction} />
        <DemoNode id="selected-log" label="selected log" x={790} y={100} selected decorated onAction={onAction} />
        <DemoNode id="disabled-log" label="disabled log" x={790} y={295} disabled onAction={onAction} />
        <foreignObject x={260} y={65} width={170} height={36}>
          <OverlayAnnotation
            entry={annotation('edge metric', { kind: 'edge', id: 'timer-choice' }, 'Edge duration', -2.75)}
            onAction={onAction}
          />
        </foreignObject>
        <foreignObject x={270} y={118} width={40} height={40}>
          <button className="kaoto-overlay-demo__add" aria-label="Reference Add step" title="Reference editing control">
            +
          </button>
        </foreignObject>
        <text x={50} y={405}>
          Top badges: existing processor / disabled. Below node: existing name and validation.
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
            onAction={onAction}
          />
        </foreignObject>
        <DemoNode id="route-b-log" label="log" x={65} y={545} onAction={onAction} />
      </svg>
      <h2>Independent tone and emphasis</h2>
      <div className="kaoto-overlay-demo__samples">
        {tones.map((tone) => (
          <div key={tone}>
            <span>{tone}</span>
            {(['normal', 'strong', 'subdued'] as const).map((emphasis) => (
              <div className="kaoto-overlay-demo__sample" key={emphasis}>
                <OverlayMarker
                  entry={{
                    ...marker(`${tone} ${emphasis}`, 'sample', tone === 'info' ? 'info' : 'circle'),
                    tone,
                    emphasis,
                  }}
                  onAction={onAction}
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
        <g transform="translate(40 45) scale(0.75)">
          <DemoNode id="small" label="small log" x={0} y={0} decorated disabled onAction={onAction} />
        </g>
        <g transform="translate(410 45) scale(1.5)">
          <DemoNode id="large" label="large log" x={0} y={0} decorated warning onAction={onAction} />
        </g>
      </svg>
      <p>
        Presentation only. Automatic collision handling, overflow and composition across owners remain separate work.
      </p>
    </section>
  );
};

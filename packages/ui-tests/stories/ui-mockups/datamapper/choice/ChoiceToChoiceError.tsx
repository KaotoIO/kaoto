import './ConditionalMappingView.scss';

import { Choices } from '@carbon/icons-react';
import { BaseNode } from '@kaoto/kaoto/testing';
import { Types } from '@kaoto/kaoto/testing';
import { Alert, AlertActionCloseButton, Icon, Label } from '@patternfly/react-core';
import { FunctionComponent, useState } from 'react';

interface ChoiceToChoiceErrorProps {
  'data-testid'?: string;
}

export const ChoiceToChoiceError: FunctionComponent<ChoiceToChoiceErrorProps> = ({
  'data-testid': dataTestId = 'choice-to-choice-error',
}) => {
  const [showError, setShowError] = useState(true);

  return (
    <div className="conditional-mapping-view" data-testid={dataTestId}>
      {showError && (
        <Alert
          variant="danger"
          title="Cannot map choice to choice"
          actionClose={<AlertActionCloseButton onClose={() => setShowError(false)} />}
          style={{ marginBottom: '1rem' }}
        >
          <p>
            Direct mapping from a choice node to another choice node is not supported. Both source and target must be
            specific fields with concrete element names.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>To proceed:</strong>
          </p>
          <ol style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
            <li>
              Expand <strong>both</strong> the source and target choice nodes
            </li>
            <li>Drag a specific source member (e.g., email) to a specific target member (e.g., sms)</li>
            <li>This creates a direct mapping between concrete fields</li>
          </ol>
        </Alert>
      )}

      <div className="conditional-mapping-view__panels">
        <div className="conditional-mapping-view__source">
          <h3>Source</h3>
          <div className="node__container">
            <div className="node__header">
              <BaseNode
                isExpandable={false}
                isDraggable={false}
                iconType={Types.Container}
                title={<span className="node__spacer">customer</span>}
                rank={0}
              />
            </div>
            <div className="node__children" style={{ marginLeft: 'calc(1 * 0.85rem)' }}>
              <div
                className="choice-node"
                style={
                  {
                    '--node-rank': 1,
                    border: '2px dashed #06c',
                    borderRadius: '4px',
                    padding: '0.25rem',
                    backgroundColor: 'rgba(6, 108, 204, 0.1)',
                  } as React.CSSProperties
                }
              >
                <div className="choice-node__header">
                  <span className="choice-node__title">
                    <Label isCompact variant="outline">
                      choice
                    </Label>{' '}
                    <span style={{ fontStyle: 'italic' }}>(email | phone | address)</span>
                  </span>
                  <Icon className="node__spacer">
                    <Choices />
                  </Icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="conditional-mapping-view__target">
          <h3>Target</h3>
          <div className="node__container">
            <div className="node__header">
              <BaseNode
                isExpandable={false}
                isDraggable={false}
                iconType={Types.Container}
                title={<span className="node__spacer">output</span>}
                rank={0}
              />
            </div>
            <div className="node__children" style={{ marginLeft: 'calc(1 * 0.85rem)' }}>
              <div
                className="choice-node"
                style={
                  {
                    '--node-rank': 1,
                    border: '2px solid #c9190b',
                    borderRadius: '4px',
                    padding: '0.25rem',
                    backgroundColor: 'rgba(201, 25, 11, 0.1)',
                  } as React.CSSProperties
                }
              >
                <div className="choice-node__header">
                  <span className="choice-node__title">
                    <Label isCompact variant="outline" color="red">
                      choice
                    </Label>{' '}
                    <span style={{ fontStyle: 'italic' }}>(sms | email | webhook)</span>
                  </span>
                  <Icon className="node__spacer">
                    <Choices />
                  </Icon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <svg
        className="conditional-mapping-view__lines"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <marker
            id="arrowhead-error"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#c9190b" />
          </marker>
        </defs>
        <line
          x1="22%"
          y1="55%"
          x2="32%"
          y2="55%"
          stroke="#c9190b"
          strokeWidth="3"
          strokeDasharray="8,4"
          opacity="0.8"
          markerEnd="url(#arrowhead-error)"
        />
        <text
          x="27%"
          y="53%"
          textAnchor="middle"
          fill="#c9190b"
          fontSize="14"
          fontWeight="bold"
          style={{ userSelect: 'none' }}
        >
          ✗ Not Allowed
        </text>
      </svg>
    </div>
  );
};

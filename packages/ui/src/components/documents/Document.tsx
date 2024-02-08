/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import { Button, Card, CardBody, CardHeader, CardTitle, Title } from '@patternfly/react-core';
import {
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  forwardRef,
  useCallback,
} from 'react';

import { css } from '@patternfly/react-styles';
import './Document.css';
import { useToggle } from '../../hooks';

export interface IDocumentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: string;
  actions?: (ReactElement | null | undefined)[];
  footer?: ReactNode;
  selected?: boolean;
  selectable?: boolean;
  dropTarget?: boolean;
  dropAccepted?: boolean;
  stacked?: boolean;
  scrollIntoView?: boolean;
  noPadding?: boolean;
  noShadows?: boolean;
  startExpanded?: boolean;
  onSelect?: () => void;
  onDeselect?: () => void;
}

export const Document = forwardRef<HTMLDivElement, PropsWithChildren<IDocumentProps>>(function Document(
  {
    id,
    title,
    actions,
    footer,
    selected = false,
    dropTarget = false,
    dropAccepted = false,
    stacked = true,
    selectable = false,
    scrollIntoView = false,
    noPadding = false,
    noShadows = false,
    startExpanded,
    onSelect,
    onDeselect,
    children,
    ...props
  },
  ref,
) {
  const { state: isExpanded, toggle: toggleExpanded } = useToggle(startExpanded!);
  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (onSelect) {
        onSelect();
      }
    },
    [onSelect],
  );
  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
        case 'Space':
          if (onSelect) {
            onSelect();
          }
          break;
        case 'Escape':
          if (onDeselect) {
            onDeselect();
          }
          break;
      }
    },
    [onDeselect, onSelect],
  );
  const makeCardSelected = selected || dropTarget || dropAccepted;

  return (
    <div className={css(stacked && 'stacked')} onClick={handleClick} onKeyDown={handleKey} ref={ref} {...props}>
      <Card
        isCompact={true}
        className={css(
          'card',
          noShadows && 'noShadows',
          dropAccepted && !dropTarget && 'dropAccepted',
          dropTarget && 'dropTarget',
        )}
        isSelected={makeCardSelected}
        isSelectable={makeCardSelected || selectable}
        aria-label={title}
      >
        {(title || actions) && (
          <CardHeader data-codemods="true" className="head" actions={{ actions: actions }}>
            {title && (
              <CardTitle className="header">
                <Button
                  variant={'plain'}
                  onClick={toggleExpanded}
                  aria-label={'Expand/collapse this card'}
                  data-testid={`expand-collapse-${title}-button`}
                  className="headerButton"
                >
                  <Title size="lg" headingLevel={'h2'} aria-label={title}>
                    <span data-title={title}>
                      {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />} {title}
                    </span>
                  </Title>
                </Button>
              </CardTitle>
            )}
          </CardHeader>
        )}
        <CardBody className={css(noPadding ? 'bodyNoPadding' : 'bodyWithPadding', !isExpanded && 'hidden')}>
          {children}
        </CardBody>
        {footer}
      </Card>
    </div>
  );
});

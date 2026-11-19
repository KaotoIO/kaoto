// The illustration shares the size and position of the empty state's one
import './VisualizationEmptyState.scss';
import './BrokenFileEmptyState.scss';

import { Bullseye, Card, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import brokenFileIcon from '../../../assets/broken-file.svg';
import { IDataTestID } from '../../../models';

interface BrokenFileEmptyStateProps extends IDataTestID {
  parsedError?: string;
  className?: string;
}

export const BrokenFileEmptyState: FunctionComponent<BrokenFileEmptyStateProps> = ({
  parsedError,
  className,
  'data-testid': dataTestId,
}) => {
  return (
    <Bullseye className={className}>
      <Card>
        {/* Decorative: the title says the same */}
        <img src={brokenFileIcon} alt="" className="empty-state-icon" />
        {/* A polite status, as the file can break and recover on every keystroke while it is edited */}
        <EmptyState headingLevel="h4" titleText="This file could not be parsed" role="status" data-testid={dataTestId}>
          <EmptyStateBody>
            <p>Fix the syntax error in the file. The content is preserved.</p>
            {parsedError && (
              <code className="broken-file-error" data-testid="broken-file-parse-error">
                {parsedError}
              </code>
            )}
          </EmptyStateBody>
        </EmptyState>
      </Card>
    </Bullseye>
  );
};

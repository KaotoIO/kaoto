import { Content, Timestamp, TimestampFormat, TimestampTooltipVariant } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useMemo } from 'react';

import { GIT_DATE, GIT_HASH, KAOTO_VERSION } from '../../version';

const TOOLTIP_PROPS = { variant: TimestampTooltipVariant.default } as const;

export const About: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const buildDate = useMemo(() => new Date(GIT_DATE), []);

  return (
    <Content>
      <Content component="dl">
        {children}

        <Content component="dt">
          <strong>Kaoto UI</strong>
        </Content>
        <Content component="dt">
          <strong>Version</strong>
        </Content>
        <Content component="dd" data-testid="about-version">
          {KAOTO_VERSION}
        </Content>
        <Content component="dt">
          <strong>Git commit hash</strong>
        </Content>
        <Content component="dd" data-testid="about-git-commit-hash">
          {GIT_HASH}
        </Content>
        <Content component="dt">
          <strong>Git last commit date</strong>
        </Content>
        <Content component="dd" data-testid="about-git-last-commit-date">
          <Timestamp
            date={buildDate}
            dateFormat={TimestampFormat.full}
            timeFormat={TimestampFormat.long}
            tooltip={TOOLTIP_PROPS}
          />
        </Content>
      </Content>
    </Content>
  );
};

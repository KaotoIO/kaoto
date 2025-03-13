/*
    Copyright (C) 2024 Red Hat, Inc.

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
import { Bullseye, Content, Timestamp, TimestampFormat, TimestampTooltipVariant } from '@patternfly/react-core';
import { FunctionComponent, useMemo } from 'react';
import logo from '../../assets/logo-kaoto-dark.png';
import { GIT_DATE, GIT_HASH, KAOTO_VERSION } from '../../version';
import './AboutPage.scss';

export const AboutPage: FunctionComponent = () => {
  const buildDate = useMemo(() => new Date(GIT_DATE), []);
  const TOOLTIP_PROPS = { variant: TimestampTooltipVariant.default } as const;

  return (
    <Bullseye className="about-page">
      <img className="about-page-icon" src={logo} alt="Kaoto icon" />
      <Content>
        <Content component="dl">
          <Content component="dt">
            <strong>Version</strong>
          </Content>
          <Content component="dd" data-testid="about-version">
            {KAOTO_VERSION}
          </Content>
          <br />
          <Content component="dt">
            <strong>Build info</strong>
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
    </Bullseye>
  );
};

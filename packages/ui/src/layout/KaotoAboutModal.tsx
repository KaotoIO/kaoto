import {
  AboutModal,
  Content,
  Timestamp,
  TimestampFormat,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { FunctionComponent, useMemo } from 'react';
import logo from '../assets/logo-kaoto-dark.png';
import { GIT_DATE, GIT_HASH, KAOTO_VERSION } from '../version';

export interface IAboutModal {
  handleCloseModal: () => void;
  isModalOpen: boolean;
}

const TOOLTIP_PROPS = { variant: TimestampTooltipVariant.default } as const;

export const KaotoAboutModal: FunctionComponent<IAboutModal> = ({ handleCloseModal, isModalOpen }) => {
  const buildDate = useMemo(() => new Date(GIT_DATE), []);

  return (
    <AboutModal
      isOpen={isModalOpen}
      onClose={handleCloseModal}
      trademark=""
      brandImageSrc={logo}
      brandImageAlt="Kaoto Logo"
      data-testid="about-modal"
      productName="Kaoto"
    >
      <Content>
        <Content component="dl">
          <Content component="dt">Version</Content>
          <Content component="dd" data-testid="about-version">
            {KAOTO_VERSION}
          </Content>
          <br />
          <Content component="dt">Build info</Content>
          <Content component="dt">Git commit hash</Content>
          <Content component="dd" data-testid="about-git-commit-hash">
            {GIT_HASH}
          </Content>
          <Content component="dt">Git last commit date</Content>
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
    </AboutModal>
  );
};

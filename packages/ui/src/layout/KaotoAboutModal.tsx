import { AboutModal, TextContent, TextList, TextListItem } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import logo from '../assets/logo-kaoto-dark.png';
import { GIT_DATE, GIT_HASH, KAOTO_VERSION } from '../version';

export interface IAboutModal {
  handleCloseModal: () => void;
  isModalOpen: boolean;
}

export const KaotoAboutModal: FunctionComponent<IAboutModal> = ({ handleCloseModal, isModalOpen }) => {
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
      <TextContent>
        <TextList component="dl">
          <TextListItem component="dt">Version</TextListItem>
          <TextListItem component="dd" data-testid="about-version">
            {KAOTO_VERSION}
          </TextListItem>
          <br />
          <TextListItem component="dt">Build info</TextListItem>
          <TextListItem component="dt">Git commit hash</TextListItem>
          <TextListItem component="dd" data-testid="about-git-commit-hash">
            {GIT_HASH}
          </TextListItem>
          <TextListItem component="dt">Git last commit date</TextListItem>
          <TextListItem component="dd" data-testid="about-git-last-commit-date">
            {GIT_DATE}
          </TextListItem>
        </TextList>
      </TextContent>
    </AboutModal>
  );
};

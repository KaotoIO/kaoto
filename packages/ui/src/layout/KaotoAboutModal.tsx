import { AboutModal, TextContent, TextList, TextListItem } from '@patternfly/react-core';
import logo from '../assets/logo-kaoto-dark.png';

export interface IAboutModal {
  handleCloseModal: () => void;
  isModalOpen: boolean;
}

export const KaotoAboutModal = ({ handleCloseModal, isModalOpen }: IAboutModal) => {
  const KAOTO_VERSION: string = '2.0.0';
  const GIT_COMMIT_HASH: string = 'some weird hash';
  const GIT_LAST_COMMIT_DATE: string = 'some date';

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
            {GIT_COMMIT_HASH}
          </TextListItem>
          <TextListItem component="dt">Git last commit date</TextListItem>
          <TextListItem component="dd" data-testid="about-git-last-commit-date">
            {GIT_LAST_COMMIT_DATE}
          </TextListItem>
        </TextList>
      </TextContent>
    </AboutModal>
  );
};

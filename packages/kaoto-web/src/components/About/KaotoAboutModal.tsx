import { Modal, StructuredListBody, StructuredListCell, StructuredListRow, StructuredListWrapper } from '@carbon/react';
import { FunctionComponent, useMemo } from 'react';

import { GIT_DATE, GIT_HASH, KAOTO_VERSION } from '../../version';

interface KaotoAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KaotoAboutModal: FunctionComponent<KaotoAboutModalProps> = ({ isOpen, onClose }) => {
  const buildDate = useMemo(() => {
    if (!GIT_DATE) return '';
    return new Date(GIT_DATE).toLocaleString();
  }, []);

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onRequestClose={onClose}
      modalHeading="About Kaoto"
      passiveModal
      data-testid="kaoto-about-modal"
    >
      <StructuredListWrapper>
        <StructuredListBody>
          <StructuredListRow>
            <StructuredListCell noWrap>Version</StructuredListCell>
            <StructuredListCell data-testid="about-version">{KAOTO_VERSION}</StructuredListCell>
          </StructuredListRow>
          <StructuredListRow>
            <StructuredListCell noWrap>Git commit hash</StructuredListCell>
            <StructuredListCell data-testid="about-git-commit-hash">{GIT_HASH}</StructuredListCell>
          </StructuredListRow>
          <StructuredListRow>
            <StructuredListCell noWrap>Git last commit date</StructuredListCell>
            <StructuredListCell data-testid="about-git-last-commit-date">{buildDate}</StructuredListCell>
          </StructuredListRow>
        </StructuredListBody>
      </StructuredListWrapper>
    </Modal>
  );
};

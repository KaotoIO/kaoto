import { AboutModal } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import logo from '../assets/logo-kaoto-dark.png';
import { About } from '../components/About/About';

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
      <About />
    </AboutModal>
  );
};

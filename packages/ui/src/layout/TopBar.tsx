import {
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  Icon,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadProps,
  MastheadToggle,
  MenuToggle,
  MenuToggleElement,
  ToolbarItem,
} from '@patternfly/react-core';
import { EllipsisVIcon, ExternalLinkAltIcon, FireIcon, GithubIcon } from '@patternfly/react-icons';
import { BarsIcon } from '@patternfly/react-icons/dist/js/icons/bars-icon';
import React, { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';
import camelLogo from '../assets/camel-logo.svg';
import logo from '../assets/logo-kaoto.png';
import { useComponentLink } from '../hooks/ComponentLink';
import { Links } from '../router/links.models';
import { KaotoAboutModal } from './KaotoAboutModal';

interface ITopBar {
  navToggle: () => void;
}

const displayObject: MastheadProps['display'] = {
  default: 'inline',
};

const DEFAULT_POPPER_PROPS = {
  position: 'end',
  preventOverflow: true,
} as const;

export const TopBar: FunctionComponent<ITopBar> = (props) => {
  const logoLink = useComponentLink(Links.Home);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = React.useState(false);

  const onToggle = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (event: React.MouseEvent<Element, MouseEvent> | undefined) => {
    event?.stopPropagation();
    setIsOpen(!isOpen);
  };

  const toggleAboutModal = () => {
    setIsAboutModalOpen(!isAboutModalOpen);
  };

  return (
    <>
      <Masthead id="stack-inline-masthead" display={displayObject}>
        <MastheadToggle>
          <Button variant="plain" onClick={props.navToggle} aria-label="Global navigation">
            <BarsIcon />
          </Button>
        </MastheadToggle>

        <MastheadMain>
          <MastheadBrand component={logoLink}>
            <img className="shell__logo" src={logo} alt="Kaoto Logo" />
          </MastheadBrand>
        </MastheadMain>

        <MastheadContent>
          <ToolbarItem className="shell__link">
            <Dropdown
              onSelect={onSelect}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle ref={toggleRef} onClick={onToggle} variant="plain" isExpanded={isOpen}>
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              isOpen={isOpen}
              onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
              popperProps={DEFAULT_POPPER_PROPS}
            >
              <a href="https://kaoto.io/workshop/" target="_blank" rel="noreferrer">
                <DropdownItem key="tutorial">
                  <Icon isInline>
                    <ExternalLinkAltIcon />
                  </Icon>
                  &nbsp;<span className="pf-u-mr-lg">Tutorials</span>
                </DropdownItem>
              </a>
              <a href="https://kaoto.io/docs/" target="_blank" rel="noreferrer">
                <DropdownItem key="help">
                  <Icon isInline>
                    <ExternalLinkAltIcon />
                  </Icon>
                  &nbsp;<span className="pf-u-mr-lg">Help</span>
                </DropdownItem>
              </a>
              <a href="https://github.com/KaotoIO/kaoto-examples" target="_blank" rel="noreferrer">
                <DropdownItem key="feedback">
                  <Icon isInline>
                    <GithubIcon />
                  </Icon>
                  &nbsp;<span className="pf-u-mr-lg">Examples</span>
                </DropdownItem>
              </a>
              <a href="https://github.com/KaotoIO/kaoto/issues/new/choose" target="_blank" rel="noreferrer">
                <DropdownItem key="feedback">
                  <Icon isInline>
                    <GithubIcon />
                  </Icon>
                  &nbsp;<span className="pf-u-mr-lg">Feedback</span>
                </DropdownItem>
              </a>

              <Divider component="li" key="separator1" />
              <a href="https://camel.apache.org/camel-core/getting-started/index.html" target="_blank" rel="noreferrer">
                <DropdownItem key="camel">
                  <Icon isInline>
                    <img src={camelLogo} />
                  </Icon>
                  &nbsp;<span className="pf-u-mr-lg">Apache Camel</span>
                </DropdownItem>
              </a>
              <a href="https://hawt.io/docs/get-started.html" target="_blank" rel="noreferrer">
                <DropdownItem key="hawtio">
                  <Icon isInline>
                    <FireIcon />
                  </Icon>
                  &nbsp;<span className="pf-u-mr-lg">Hawtio</span>
                </DropdownItem>
              </a>

              <Divider component="li" key="separator2" />
              <Link data-testid="settings-link" to={Links.Settings}>
                <DropdownItem id="settings" key="settings">
                  Settings
                </DropdownItem>
              </Link>
              <Divider component="li" key="separator2" />
              <DropdownItem
                id="about"
                key="about"
                onClick={() => {
                  toggleAboutModal();
                }}
              >
                About
              </DropdownItem>
            </Dropdown>
          </ToolbarItem>
        </MastheadContent>
      </Masthead>

      <KaotoAboutModal
        handleCloseModal={() => {
          toggleAboutModal();
        }}
        isModalOpen={isAboutModalOpen}
      />
    </>
  );
};

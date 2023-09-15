import {
  Button,
  Icon,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  ToolbarItem,
} from '@patternfly/react-core';
import { GithubIcon } from '@patternfly/react-icons';
import { BarsIcon } from '@patternfly/react-icons/dist/js/icons/bars-icon';
import { FunctionComponent, useRef } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo-kaoto.png';
import { useComponentLink } from '../hooks/ComponentLink';
import { ExternalLinks, Links } from '../router/links.models';

interface ITopBar {
  navToggle: () => void;
}

export const TopBar: FunctionComponent<ITopBar> = (props) => {
  const displayObject = useRef({ default: 'inline', lg: 'stack', '2xl': 'inline' } as const);
  const logoLink = useComponentLink(Links.Home);

  return (
    <Masthead id="stack-inline-masthead" display={displayObject.current}>
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
          <Link to={ExternalLinks.GitHub} target="_blank" rel="noopener noreferrer">
            <Button variant="plain" aria-label="edit">
              <Icon size="lg">
                <GithubIcon />
              </Icon>
            </Button>
          </Link>
        </ToolbarItem>
      </MastheadContent>
    </Masthead>
  );
};

import { Button, Masthead, MastheadBrand, MastheadContent, MastheadMain, MastheadToggle } from '@patternfly/react-core';
import { BarsIcon } from '@patternfly/react-icons/dist/js/icons/bars-icon';
import { FunctionComponent, useRef } from 'react';
import logo from '../assets/logo-kaoto.png';
import { Links } from '../router/links';
import { useComponentLink } from '../hooks/ComponentLink';

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

      <MastheadContent>{/* Topbar content goes here */}</MastheadContent>
    </Masthead>
  );
};

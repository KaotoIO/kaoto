import { Header, HeaderContainer, HeaderName } from '@carbon/react';
import { FunctionComponent } from 'react';
import logo from '../../assets/logo-kaoto.png';
import { SchemaSelector } from '../schema-selector/SchemaSelector';
import './TopBar.scss';

export const TopBar: FunctionComponent = () => {
  return (
    <HeaderContainer
      render={() => (
        <Header aria-label="Kaoto Forms">
          <HeaderName prefix="">
            <img className="shell__logo" src={logo} alt="Kaoto Logo" />
          </HeaderName>
          <div className="topbar__actions">
            <SchemaSelector />
          </div>
        </Header>
      )}
    />
  );
};

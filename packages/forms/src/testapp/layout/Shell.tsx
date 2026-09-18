import { Content } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import './Shell.scss';
import { TopBar } from './TopBar';

export const Shell: FunctionComponent<PropsWithChildren> = (props) => {
  return (
    <div className="shell">
      <TopBar />
      <Content className="shell__page-section">{props.children}</Content>
    </div>
  );
};

import { Content } from '@carbon/react';
import classNames from 'classnames';
import { Children, PropsWithChildren, ReactElement, ReactNode, Suspense } from 'react';

import { Nav } from '../components/nav/Nav';

interface PageLayoutProps {
  className?: string;
  fallback?: ReactNode;
}

const PageLayoutHeader = ({ children }: PropsWithChildren) => (
  <div className="cs--page-layout__content-header">{children}</div>
);
PageLayoutHeader.displayName = 'PageLayoutHeader';

export const PageLayout = ({ children, className, fallback }: PropsWithChildren<PageLayoutProps>) => {
  const childArray = Children.toArray(children);

  const isHeader = (child: unknown): child is ReactElement =>
    typeof child === 'object' && child !== null && 'type' in child && child.type === PageLayoutHeader;

  const otherChildren = childArray.filter((child) => !isHeader(child));
  const Header = childArray.find(isHeader);

  return (
    <Suspense fallback={fallback}>
      <div className={classNames('cs--page-layout', className)}>
        <Nav />
        <Content className="cs--content">
          <div className="cs--page-layout__content">
            {Header}
            <div className="cs--page-layout__content-body">{otherChildren}</div>
          </div>
        </Content>
      </div>
    </Suspense>
  );
};

PageLayout.Header = PageLayoutHeader as typeof PageLayoutHeader & {
  displayName: string;
};

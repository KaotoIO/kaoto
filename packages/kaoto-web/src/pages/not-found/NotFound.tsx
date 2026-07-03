import { useLocation } from 'react-router';

import { CommonHeader } from '../../components/commonHeader/CommonHeader';
import { PageLayout } from '../../layouts/page-layout';

const NotFound = () => {
  const location = useLocation();

  return (
    <PageLayout className="cs--not-found" fallback={<p>Loading not found page...</p>}>
      <CommonHeader
        title="Page not found"
        paragraphs={[
          { id: 'not-found', content: 'This is not the page you were looking for.' },
          {
            id: 'unrecognized-route',
            content: (
              <>
                The route <em>&lsquo;{location.pathname}&rsquo;</em> is not recognized.
              </>
            ),
          },
          { id: 'maintainer', content: 'Maintained by fed-at-ibm, a chapter of the OIC.' },
        ]}
      />
    </PageLayout>
  );
};

export default NotFound;

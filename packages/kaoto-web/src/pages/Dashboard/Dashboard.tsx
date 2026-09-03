import { PageHeader } from '@carbon/ibm-products';

import { Footer } from '../../components/Footer/Footer';
import { PageLayout } from '../../layouts/PageLayout';
// The styles are imported into index.scss by default.
// Do the same unless you have a good reason not to.

const Dashboard = () => {
  return (
    <PageLayout className="cs--dashboard" fallback={<p>Loading dashboard page...</p>}>
      <PageLayout.Header>
        <PageHeader title="Dashboard" />
      </PageLayout.Header>

      <Footer />
    </PageLayout>
  );
};

export default Dashboard;

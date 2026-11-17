import { render, screen } from '@testing-library/react';

import { ImportResultStep } from './ImportResultStep';

describe('ImportResultStep', () => {
  it('shows the success notification and what to do next', () => {
    render(
      <ImportResultStep
        status={{ type: 'success', message: 'Import succeeded. 2 operations added.' }}
        failed={false}
        outputs={{ rest: true, routes: true }}
      />,
    );

    expect(screen.getByText('Import succeeded. 2 operations added.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What you can do next' })).toBeInTheDocument();
    expect(screen.getByText('Review the imported REST operations and edit their details.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Open the routes created for the imported operations and add the steps that process each request.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the failure and what you can do when the import failed', () => {
    render(<ImportResultStep status={null} failed />);

    expect(screen.getByRole('alert')).toHaveTextContent('Import failed.');
    expect(screen.getByText(/Some of them may already have been added/)).toBeInTheDocument();
    expect(screen.getByText(/check what was added before you import again/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What you can do' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('heading', { name: 'What you can do next' })).not.toBeInTheDocument();
  });

  it('only points to the Rest Editor when only REST operations were created', () => {
    render(
      <ImportResultStep
        status={{ type: 'success', message: 'Import succeeded. 1 operation added.' }}
        failed={false}
        outputs={{ rest: true, routes: false }}
      />,
    );

    expect(screen.getByText('Go to Rest Editor')).toBeInTheDocument();
    expect(screen.queryByText('Go to Designer')).not.toBeInTheDocument();
  });

  it('only points to the Designer when only routes were created', () => {
    render(
      <ImportResultStep
        status={{ type: 'success', message: 'Import succeeded. 1 operation added.' }}
        failed={false}
        outputs={{ rest: false, routes: true }}
      />,
    );

    expect(screen.getByText('Go to Designer')).toBeInTheDocument();
    expect(screen.queryByText('Go to Rest Editor')).not.toBeInTheDocument();
  });

  it('prefers the failure over a previous success', () => {
    render(<ImportResultStep status={{ type: 'success', message: 'Import succeeded. 1 operation added.' }} failed />);

    expect(screen.getByRole('alert')).toHaveTextContent('Import failed.');
    expect(screen.queryByText('Import succeeded. 1 operation added.')).not.toBeInTheDocument();
  });

  it('shows that there is no result yet when nothing was imported', () => {
    render(<ImportResultStep status={null} failed={false} />);

    expect(screen.getByText('No import results yet.')).toBeInTheDocument();
  });

  it('shows that there is no result yet when the status is a validation error', () => {
    render(
      <ImportResultStep
        status={{ type: 'error', message: 'Import failed. Select at least one operation.' }}
        failed={false}
      />,
    );

    expect(screen.getByText('No import results yet.')).toBeInTheDocument();
    expect(screen.queryByText('Import failed. Select at least one operation.')).not.toBeInTheDocument();
  });
});

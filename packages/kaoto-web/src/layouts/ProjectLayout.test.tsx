import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useProjectContext } from '../hooks/useProjectContext';
import { useRuntimeContext } from '../hooks/useRuntimeContext';
import { ProjectLayout } from './ProjectLayout';

const renderLayout = (outlet = <div data-testid="outlet-content">Outlet</div>) =>
  render(
    <MemoryRouter initialEntries={['/projects/my-project']}>
      <Routes>
        <Route path="projects/:projectId" element={<ProjectLayout />}>
          <Route index element={outlet} />
        </Route>
        <Route path="/" element={<div data-testid="home">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProjectLayout', () => {
  it.each([
    ['project toolbar', 'project-toolbar'],
    ['explorer sidebar', 'explorer'],
    ['outlet content', 'outlet-content'],
  ])('renders the %s', (_label, testId) => {
    renderLayout();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('renders toolbar before explorer in the DOM', () => {
    const { container } = renderLayout();
    const toolbar = container.querySelector('[data-testid="project-toolbar"]')!;
    const explorer = container.querySelector('[data-testid="explorer"]')!;
    expect(toolbar.compareDocumentPosition(explorer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('redirects to / when projectId contains invalid characters', () => {
    render(
      <MemoryRouter initialEntries={['/projects/<bad>']}>
        <Routes>
          <Route path="projects/:projectId" element={<ProjectLayout />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('home')).toBeInTheDocument();
  });

  it('provides RuntimeContext to outlet children', () => {
    const RuntimeConsumer = () => {
      useRuntimeContext(); // throws if RuntimeProvider is not in the tree
      return <div data-testid="runtime-consumer">ok</div>;
    };

    render(
      <MemoryRouter initialEntries={['/projects/my-project']}>
        <Routes>
          <Route path="projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<RuntimeConsumer />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('runtime-consumer')).toBeInTheDocument();
  });

  it('provides ProjectContext with the validated projectId to children', () => {
    const ProjectConsumer = () => {
      const { projectId } = useProjectContext();
      return <div data-testid="project-consumer">{projectId}</div>;
    };

    render(
      <MemoryRouter initialEntries={['/projects/my-project']}>
        <Routes>
          <Route path="projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<ProjectConsumer />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('project-consumer')).toHaveTextContent('my-project');
  });
});

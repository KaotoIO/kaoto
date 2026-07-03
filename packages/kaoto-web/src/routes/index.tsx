import { Route, Routes } from 'react-router';

import { routes } from './config';

export const Router = () => {
  return (
    <Routes>
      {routes.map(({ element: Element, path, index }) =>
        index ? (
          <Route key="index" index element={Element && <Element />} />
        ) : (
          <Route key={path} path={path} element={Element && <Element />} />
        ),
      )}
    </Routes>
  );
};

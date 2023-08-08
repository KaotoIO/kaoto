import { Outlet } from 'react-router-dom';
import { Shell } from './layout/Shell';

function App() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

export default App;

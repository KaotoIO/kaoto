import { CanvasFormTabsProvider } from '../form/providers/canvas-form-tabs.provider';
import { Dashboard } from './dashboard/Dashboard';
import { Shell } from './layout/Shell';
import { CurrentSchemaProvider } from './providers/CurrentSchemaProvider';
import { DemoSuggestionProvider } from './providers/DemoSuggestionProvider';
import { ModelProvider } from './providers/ModelProvider';

function App() {
  return (
    <CurrentSchemaProvider>
      <DemoSuggestionProvider>
        <ModelProvider>
          <CanvasFormTabsProvider tab="All">
            <Shell>
              <Dashboard />
            </Shell>
          </CanvasFormTabsProvider>
        </ModelProvider>
      </DemoSuggestionProvider>
    </CurrentSchemaProvider>
  );
}

export default App;

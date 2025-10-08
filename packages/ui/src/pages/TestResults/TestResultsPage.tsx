import {
  Alert,
  Button,
  CodeBlock,
  Panel,
  PanelMain,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { SyncIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext, useEffect, useState } from 'react';
import { parse } from 'yaml';

import { SettingsContext } from '../../providers';
import { SourceCodeContext } from '../../providers';

type TestResult = {
  testName: string;
  className?: string;
  cause?: string;
  errorMessage?: string;
  duration?: number;
  result: string;
  success: boolean;
  failed: boolean;
  skipped?: boolean;
};

export const TestResultsPage: FunctionComponent = () => {
  const sourceCode = useContext(SourceCodeContext);
  const settingsAdapter = useContext(SettingsContext);
  const agentServiceUrl = settingsAdapter.getSettings().experimentalFeatures.citrusAgentServiceUrl || '';
  const [logs, setLogs] = useState<string>('No test results and service logs available!');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const testName = (parse(sourceCode) as Record<string, unknown>).name || 'clipboard';

  useEffect(() => {
    onClick();
  });

  const onClick = () => {
    fetch(`${agentServiceUrl}/health`)
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'UP') {
          fetch(`${agentServiceUrl}/results/latest`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          })
            .then((res) => res.json())
            .then((json) => {
              const results = (json as TestResult[]) || [];
              const result: TestResult = (results?.find((t) => t.testName === testName) as TestResult) || undefined;
              if (result) {
                setTestResult(result);
                fetch(`${agentServiceUrl}/logs`)
                  .then((res) => res.text())
                  .then((text) => {
                    setLogs(text);
                  })
                  .catch((err) => {
                    setLogs(err.message);
                  });
              } else {
                setTestResult({
                  testName: testName,
                  result: 'WARNING',
                  skipped: true,
                  cause: `No result found for test ${testName}`,
                } as TestResult);
              }
            })
            .catch((err) => {
              setTestResult({
                testName: testName,
                result: 'ERROR',
                failed: true,
                errorMessage: `Failed to fetch test results from Citrus agent service: ${err.message}`,
              } as TestResult);
            });
        } else {
          setTestResult({
            testName: testName,
            result: 'WARNING',
            skipped: true,
            cause: 'Service unavailable: Health check failed for the Citrus agent service',
          } as TestResult);
        }
      })
      .catch((error) => {
        setTestResult({
          testName: testName,
          result: 'WARNING',
          skipped: true,
          cause: `Connection failed: Not connected to Citrus agent service - ${error.message}`,
        } as TestResult);
      });
  };

  return (
    <>
      <Toolbar style={{ backgroundColor: 'transparent' }} id="test-results-toolbar">
        <ToolbarContent>
          <ToolbarGroup gap={{ default: 'gapNone' }}>
            <ToolbarItem key="reload-control">
              <Button
                className="reload-control"
                icon={<SyncIcon />}
                title="Refresh"
                onClick={onClick}
                variant="control"
                data-testid="reloadControlButton"
              />
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>
      <Panel>
        <PanelMain>
          <Stack hasGutter>
            <StackItem>
              {(!testResult || testResult?.skipped) && (
                <Alert variant="warning" title={`WARNING: ${testName}`}>
                  <p>{testResult?.cause}</p>
                </Alert>
              )}
              {testResult?.success && (
                <Alert variant="success" title={`${testResult?.result}: ${testName}`}>
                  <p>The test &quot;{testResult?.testName}&quot; was executed successfully!</p>
                  <p>Duration: {testResult?.duration || 0} ms</p>
                </Alert>
              )}
              {testResult?.failed && (
                <Alert variant="danger" title={`${testResult?.result}: ${testName}`}>
                  <p>{testResult?.errorMessage || 'Unknown error'}</p>
                  <p>{testResult?.cause}</p>
                </Alert>
              )}
            </StackItem>
            <StackItem>
              <CodeBlock>
                <pre>{logs}</pre>
              </CodeBlock>
            </StackItem>
          </Stack>
        </PanelMain>
      </Panel>
    </>
  );
};

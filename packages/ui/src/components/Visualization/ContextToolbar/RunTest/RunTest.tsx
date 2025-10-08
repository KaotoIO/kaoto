import './RunTest.scss';

import {
  Alert,
  Button,
  Icon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CheckIcon, ExclamationIcon, PauseIcon, PlayIcon } from '@patternfly/react-icons';
import { useCallback, useContext, useState } from 'react';
import { parse } from 'yaml';

import { CitrusTestResource } from '../../../../models/citrus/citrus-test-resource';
import { TestReportEntry, TestResult } from '../../../../models/citrus/entities/TestResult';
import { CitrusTestReportService } from '../../../../models/visualization/flows/support/citrus-test-report.service';
import { EntitiesContext, SettingsContext, SourceCodeContext } from '../../../../providers';

export const successTooltipText = 'Test run finished successfully!';
export const failedTooltipText = 'Test run failed!';

export const defaultTooltipText = 'Run test';

export function RunTest() {
  const sourceCode = useContext(SourceCodeContext);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isFailed, setIsFailed] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const entitiesContext = useContext(EntitiesContext);
  const testResource = entitiesContext?.camelResource as CitrusTestResource | undefined;

  const status = isRunning ? 'warning' : isFailed ? 'danger' : isSuccess ? 'success' : undefined;
  const tooltipText = isFailed ? failedTooltipText : isSuccess ? successTooltipText : defaultTooltipText;
  const settingsAdapter = useContext(SettingsContext);
  const agentServiceUrl = settingsAdapter.getSettings().experimentalFeatures.citrusAgentServiceUrl || '';
  const isDisabled = agentServiceUrl === '';
  const testName = (parse(sourceCode) as Record<string, unknown>).name || 'clipboard';

  const onClick = () => {
    fetch(`${agentServiceUrl}/health`)
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'UP') {
          setIsRunning(true);
          fetch(`${agentServiceUrl}/execute/${testName}.yaml`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/yaml',
              Accept: 'application/json',
            },
            body: sourceCode,
          })
            .then((res) => res.json())
            .then((json) => {
              const results = (json as TestResult[]) || [];
              const result: TestResult = (results?.find((t) => t.testName === testName) as TestResult) || undefined;
              if (result) {
                handleTestResult(result);
              } else {
                handleTestResult({
                  testName: testName,
                  result: 'WARNING',
                  skipped: true,
                  cause: `Test not found: No result found for test ${testName}`,
                } as TestResult);
              }
            })
            .catch((err) => {
              handleTestResult({
                testName: testName,
                result: 'ERROR',
                failed: true,
                errorMessage: `Test run failed: ${err.message}`,
              } as TestResult);
            })
            .finally(() => {
              setIsRunning(false);
              setTimeout(() => {
                setIsSuccess(false);
                setIsFailed(false);
              }, 3000);

              fetch(`${agentServiceUrl}/results/flow`, {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                },
              })
                .then((res) => res.json())
                .then((json) => {
                  const results = (json as TestReportEntry[]) || [];
                  const result: TestReportEntry =
                    (results?.find((t) => t.name === testName) as TestReportEntry) || undefined;
                  if (result) {
                    CitrusTestReportService.decodeMessageContent(result.actions);
                    testResource?.getVisualEntities().forEach((entity) => {
                      entity.applyTestReport(result);
                    });
                    entitiesContext?.updateEntitiesFromCamelResource();
                  }
                });
            });
        } else {
          handleTestResult({
            testName: testName,
            result: 'WARNING',
            skipped: true,
            cause: 'Service unavailable: Health check failed for the Citrus agent service',
          } as TestResult);
        }
      })
      .catch((error) => {
        handleTestResult({
          testName: testName,
          result: 'WARNING',
          skipped: true,
          cause: `Connection failed: Not connected to Citrus agent service - ${error.message}`,
        } as TestResult);
        setTimeout(() => {
          setIsFailed(false);
        }, 3000);
      });
  };

  const handleTestResult = (result: TestResult) => {
    setIsRunning(false);
    setTestResult(result);
    setIsFailed(result.failed);
    setIsSuccess(result.success);
    setIsWarningModalOpen(!result.success);
  };

  const onCloseWarningModal = useCallback(() => {
    setIsWarningModalOpen(false);
  }, []);

  return (
    <>
      <Button
        className="run-test-control"
        isDisabled={isDisabled}
        icon={
          <Icon status={status}>
            {isRunning ? <PauseIcon /> : isFailed ? <ExclamationIcon /> : isSuccess ? <CheckIcon /> : <PlayIcon />}
          </Icon>
        }
        title={tooltipText}
        onClick={onClick}
        variant="control"
        data-testid="runButton"
        data-running={isRunning}
        data-success={isSuccess}
        data-failed={isFailed}
      />

      <Modal isOpen={isWarningModalOpen} variant={ModalVariant.medium} data-testid="test-result-warning-modal">
        <ModalHeader title={`${testResult?.result}: ${testName}`} />
        <ModalBody>
          <Stack hasGutter>
            <StackItem>
              {testResult?.skipped && (
                <Alert variant="warning" title={`${testResult?.result}: ${testName}`}>
                  <p>{testResult?.cause}</p>
                </Alert>
              )}
              {testResult?.failed && (
                <Alert variant="danger" title={`${testResult?.result}: ${testName}`}>
                  <p>{testResult?.errorMessage || 'Unknown error'}</p>
                  <p>{testResult?.cause}</p>
                </Alert>
              )}
            </StackItem>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            key="Close"
            data-testid="test-result-warning-modal-btn-close"
            variant="control"
            onClick={onCloseWarningModal}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

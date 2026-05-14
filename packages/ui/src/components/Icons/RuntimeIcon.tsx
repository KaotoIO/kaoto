import './RuntimeIcon.scss';

import { Icon } from '@patternfly/react-core';

import camelLogo from '../../assets/camel-logo.svg';
import citrusLogo from '../../assets/citrus-logo.png';
import quarkusLogo from '../../assets/quarkus-logo.svg';
import redhatLogo from '../../assets/redhat-logo.svg';
import springBootLogo from '../../assets/springboot-logo.svg';

/**
 * Returns the appropriate icon for a given runtime or catalog name.
 *
 * @param runtimeOrName - Runtime type (e.g., "Main", "Quarkus") or catalog name (e.g., "Camel Main 4.0.0.redhat-00001")
 * @returns Icon component with the appropriate logo
 */
export const getRuntimeIcon = (runtimeOrName: string) => {
  if (runtimeOrName.includes('redhat')) {
    return (
      <Icon className="runtime-icon">
        <img src={redhatLogo} alt="Red Hat logo" />
      </Icon>
    );
  }

  if (runtimeOrName === 'Citrus' || runtimeOrName.includes('Citrus')) {
    return (
      <Icon className="runtime-icon">
        <img src={citrusLogo} alt="Citrus logo" />
      </Icon>
    );
  }

  if (runtimeOrName === 'Quarkus' || runtimeOrName.includes('Quarkus')) {
    return (
      <Icon className="runtime-icon">
        <img src={quarkusLogo} alt="Quarkus logo" />
      </Icon>
    );
  }

  if (runtimeOrName === 'Spring Boot' || runtimeOrName.replace(/\s/g, '').includes('SpringBoot')) {
    return (
      <Icon className="runtime-icon">
        <img src={springBootLogo} alt="Spring Boot logo" />
      </Icon>
    );
  }

  return (
    <Icon className="runtime-icon">
      <img src={camelLogo} alt="Apache Camel logo" />
    </Icon>
  );
};

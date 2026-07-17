import './RuntimeIcon.scss';

import { Icon } from '@patternfly/react-core';

import bobIcon from '../../assets/bob/bob-icon.svg';
import camelLogo from '../../assets/camel-logo.svg';
import citrusLogo from '../../assets/citrus-logo.png';
import quarkusLogo from '../../assets/quarkus-logo.svg';
import redhatLogo from '../../assets/redhat-logo.svg';
import springBootLogo from '../../assets/springboot-logo.svg';

/**
 * Returns the appropriate icon for a given runtime or catalog name.
 *
 * Matches are case-insensitive and whitespace-agnostic for flexibility.
 * @param runtimeOrName - Runtime type (e.g., "Main", "Quarkus") or catalog name (e.g., "Camel Main 4.0.0.redhat-00001")
 * @returns Icon component with the appropriate logo
 */
export const getRuntimeIcon = (runtimeOrName: string = '') => {
  const normalized = runtimeOrName.toLowerCase().replace(/\s/g, '');

  if (normalized.includes('redhat')) {
    return (
      <Icon className="runtime-icon">
        <img src={redhatLogo} alt="Red Hat logo" />
      </Icon>
    );
  }

  if (normalized.includes('citrus')) {
    return (
      <Icon className="runtime-icon">
        <img src={citrusLogo} alt="Citrus logo" />
      </Icon>
    );
  }

  if (normalized.includes('bob')) {
    return (
      <Icon className="runtime-icon">
        <img src={bobIcon} alt="Bob logo" />
      </Icon>
    );
  }

  if (normalized.includes('quarkus')) {
    return (
      <Icon className="runtime-icon">
        <img src={quarkusLogo} alt="Quarkus logo" />
      </Icon>
    );
  }

  if (normalized.includes('springboot')) {
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

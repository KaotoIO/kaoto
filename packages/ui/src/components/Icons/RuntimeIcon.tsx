import './RuntimeIcon.scss';

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
 * @returns `img` element with the appropriate logo
 */
export const getRuntimeIcon = (runtimeOrName: string = '') => {
  const normalized = runtimeOrName.toLowerCase().replace(/\s/g, '');

  if (normalized.includes('redhat')) {
    return <img className="runtime-icon" src={redhatLogo} alt="Red Hat logo" />;
  }

  if (normalized.includes('citrus')) {
    return <img className="runtime-icon" src={citrusLogo} alt="Citrus logo" />;
  }

  if (normalized.includes('quarkus')) {
    return <img className="runtime-icon" src={quarkusLogo} alt="Quarkus logo" />;
  }

  if (normalized.includes('springboot')) {
    return <img className="runtime-icon" src={springBootLogo} alt="Spring Boot logo" />;
  }

  return <img className="runtime-icon" src={camelLogo} alt="Apache Camel logo" />;
};

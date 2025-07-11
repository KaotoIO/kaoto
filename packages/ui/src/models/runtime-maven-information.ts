export interface CamelMainMavenInformation {
  runtime: string;
  camelVersion: string;
}

export interface CamelSpringBootMavenInformation extends CamelMainMavenInformation {
  /* Spring Boot specific*/
  camelSpringBootBomArtifactId?: string;
  camelSpringBootBomGroupId?: string;
  camelSpringBootVersion?: string;
  springBootVersion?: string;
}

export interface CamelQuarkusMavenInformation extends CamelMainMavenInformation {
  /* Quarkus specific*/
  camelQuarkusVersion?: string;
  quarkusVersion?: string;
  quarkusBomGroupId?: string;
  quarkusBomArtifactId?: string;
  camelQuarkusBomGroupId?: string;
  camelQuarkusBomArtifactId?: string;
}

export type RuntimeMavenInformation =
  | CamelMainMavenInformation
  | CamelSpringBootMavenInformation
  | CamelQuarkusMavenInformation;

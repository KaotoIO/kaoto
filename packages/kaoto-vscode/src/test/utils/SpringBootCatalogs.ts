import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';

/**
 * The "Camel Spring Boot 4.18.3.redhat-00006" entry of @kaoto/camel-catalog 0.10.7.
 * Red Hat builds number Camel Spring Boot (version, runtimeProviderVersion) apart from camel-launcher (executorVersion).
 */
const RED_HAT_SPRING_BOOT_CATALOG: CatalogLibraryEntry = {
	name: 'Camel Spring Boot 4.18.3.redhat-00006',
	version: '4.18.3.redhat-00006',
	runtime: 'Spring Boot',
	fileName: 'camel-springboot/4.18.3.redhat-00006/index-xxx.json',
	executorVersion: '4.18.3.redhat-00005',
	camelCatalogVersion: '4.18.3.redhat-00006',
	runtimeProviderVersion: '4.18.3.redhat-00006',
	frameworkVersion: '3.5.16',
};

const COMMUNITY_SPRING_BOOT_CATALOG: CatalogLibraryEntry = {
	name: 'Camel Spring Boot 4.18.5',
	version: '4.18.5',
	runtime: 'Spring Boot',
	fileName: 'camel-springboot/4.18.5/index-xxx.json',
	executorVersion: '4.18.5',
	camelCatalogVersion: '4.18.5',
	runtimeProviderVersion: '4.18.5',
	frameworkVersion: '3.5.16',
};

/**
 * Spring Boot catalogs with the Camel Spring Boot version that the Camel CLI must get, whatever the executor.
 */
export const SPRING_BOOT_CATALOGS: { name: string; catalog: CatalogLibraryEntry; camelSpringBootVersion: string }[] = [
	{ name: 'a Red Hat catalog', catalog: RED_HAT_SPRING_BOOT_CATALOG, camelSpringBootVersion: '4.18.3.redhat-00006' },
	{
		// A fixed @kaoto/camel-catalog puts the Camel version, not the Camel Spring Boot version, into camelCatalogVersion.
		name: 'a Red Hat catalog with the Camel version as camelCatalogVersion',
		catalog: { ...RED_HAT_SPRING_BOOT_CATALOG, camelCatalogVersion: '4.18.3.redhat-00005' },
		camelSpringBootVersion: '4.18.3.redhat-00006',
	},
	{ name: 'a community catalog', catalog: COMMUNITY_SPRING_BOOT_CATALOG, camelSpringBootVersion: '4.18.5' },
	{
		name: 'a catalog without runtimeProviderVersion',
		catalog: { ...RED_HAT_SPRING_BOOT_CATALOG, camelCatalogVersion: '4.18.3.redhat-00005', runtimeProviderVersion: '' },
		camelSpringBootVersion: '4.18.3.redhat-00006',
	},
];

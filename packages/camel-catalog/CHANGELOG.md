# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 0.3.0 (2023-11-22)

### Bug Fixes

* **deps:** update dependency io.fabric8:kubernetes-model to v6.9.0 ([1923d4d](https://github.com/KaotoIO/kaoto-next/commit/1923d4d09a1d4122eb0455f937221205a27b4cd1))
* **deps:** update dependency io.fabric8:kubernetes-model to v6.9.1 ([f812b71](https://github.com/KaotoIO/kaoto-next/commit/f812b7180688769308c7551085fccc714f1034ac))
* **deps:** update dependency io.fabric8:kubernetes-model to v6.9.2 ([419c60f](https://github.com/KaotoIO/kaoto-next/commit/419c60fffa034a0eae01624d1e891ea525224407))
* **deps:** update dependency org.apache.maven.plugin-tools:maven-plugin-annotations to v3.10.1 ([4157faa](https://github.com/KaotoIO/kaoto-next/commit/4157faa8426cdf7a6346cc9558f3674a73b0836e))
* **deps:** update dependency org.apache.maven.plugin-tools:maven-plugin-annotations to v3.10.2 ([df62ce2](https://github.com/KaotoIO/kaoto-next/commit/df62ce2848e6beeafc5254f4e2acfc89ae65bf8c))
* **deps:** update version.jackson to v2.15.3 ([c56e2a6](https://github.com/KaotoIO/kaoto-next/commit/c56e2a66db78c026d7707eded2e0c3d4439837a3))
* **deps:** update version.jackson to v2.16.0 ([6f1910b](https://github.com/KaotoIO/kaoto-next/commit/6f1910ba6cc241d0fa932c1a3b1119ec80cb2b49))
* Refactor @kaoto-next/camel-catalog ([e4796d2](https://github.com/KaotoIO/kaoto-next/commit/e4796d270a61d41615d7cdf5ea7dc2f396f6640a)), closes [#311](https://github.com/KaotoIO/kaoto-next/issues/311) [#316](https://github.com/KaotoIO/kaoto-next/issues/316) [#335](https://github.com/KaotoIO/kaoto-next/issues/335) [#311](https://github.com/KaotoIO/kaoto-next/issues/311)
* Support using camel catalog and schema in Jest tests ([365f7a0](https://github.com/KaotoIO/kaoto-next/commit/365f7a0172f3cbfeb9ea2f5c6b7c4074003bf75c)), closes [#310](https://github.com/KaotoIO/kaoto-next/issues/310)

### Features

* **catalog:** Minify Camel Catalog ([5c17105](https://github.com/KaotoIO/kaoto-next/commit/5c1710544af50f4f040ef7dcf94d69f801af2170))
* Support configuring /PipeSpec/ErrorHandler ([1cd996f](https://github.com/KaotoIO/kaoto-next/commit/1cd996fb53a89ef41b23ba4b84c7b2e27095516f)), closes [#188](https://github.com/KaotoIO/kaoto-next/issues/188)
* Support configuring Camel K CR metadata ([#181](https://github.com/KaotoIO/kaoto-next/issues/181)) ([#226](https://github.com/KaotoIO/kaoto-next/issues/226)) ([31aba1a](https://github.com/KaotoIO/kaoto-next/commit/31aba1a9d2395665d2735f2f3740d300f638e98f))
* Support configuring dataformat in Canvas form ([2a62d04](https://github.com/KaotoIO/kaoto-next/commit/2a62d04d070826f18bb7c5a01a3fd9ab2dd83534)), closes [#273](https://github.com/KaotoIO/kaoto-next/issues/273)

# 0.2.0 (2023-10-05)

### Bug Fixes

* **build:** Build errors with node v20 ([1cdc56f](https://github.com/KaotoIO/kaoto-next/commit/1cdc56fe96e3e46a1ac84e3423193c6d5c6406dd))
* **build:** Windows build ([b8d962e](https://github.com/KaotoIO/kaoto-next/commit/b8d962e0b86e4854277d354c53185a23e2ff9ed9))
* Camel K CRD file extraction fails ([c633b07](https://github.com/KaotoIO/kaoto-next/commit/c633b07c419fad48f0e4b65b3f4a0687819aa4ba)), closes [#106](https://github.com/KaotoIO/kaoto-next/issues/106)
* Create sub schemas for each top properties ([#144](https://github.com/KaotoIO/kaoto-next/issues/144)) ([40efd4a](https://github.com/KaotoIO/kaoto-next/commit/40efd4a18af9e4da20394943979f5c2a58fe8e8f)), closes [#138](https://github.com/KaotoIO/kaoto-next/issues/138)
* **deps:** update dependency io.fabric8:kubernetes-model to v6.8.1 ([#32](https://github.com/KaotoIO/kaoto-next/issues/32)) ([e38f7ab](https://github.com/KaotoIO/kaoto-next/commit/e38f7abaca83504927ac5e5bee16f9a80f5a27f4))
* **deps:** update dependency org.apache.maven:maven-plugin-api to v3.9.5 ([#191](https://github.com/KaotoIO/kaoto-next/issues/191)) ([598fd26](https://github.com/KaotoIO/kaoto-next/commit/598fd26665b08cba3692685dd5ac158245fc2fde))
* Let UI use maven generated YAML DSL sub schema ([66bdd77](https://github.com/KaotoIO/kaoto-next/commit/66bdd7704c87d2d29c602d36557f10d5ddba5ba5)), closes [#147](https://github.com/KaotoIO/kaoto-next/issues/147) [#8](https://github.com/KaotoIO/kaoto-next/issues/8)
* Put schema files into a Map to allow direct access with a schema name ([9cf8c4d](https://github.com/KaotoIO/kaoto-next/commit/9cf8c4d538908732b23198d394e0dcfa95f283ff)), closes [#148](https://github.com/KaotoIO/kaoto-next/issues/148)
* Remove kebab-case YAML schema in favor of camelCase one ([96b21e4](https://github.com/KaotoIO/kaoto-next/commit/96b21e48d1b483ce0dae46d6b28a53c02d1ebdad)), closes [#70](https://github.com/KaotoIO/kaoto-next/issues/70)
* Replace rm with rimraf to clean dist folder ([8133563](https://github.com/KaotoIO/kaoto-next/commit/81335630d329ea6b0e7c21a1d3c045ed89ff4e00))

### Features

* Add camel catalog and schema ([bb8f3ad](https://github.com/KaotoIO/kaoto-next/commit/bb8f3ad9dadfe6fe71f22fe8dbb1986d23830986))
* **camel-catalog:** export Typescript definitions from Camel Schemas ([a76985c](https://github.com/KaotoIO/kaoto-next/commit/a76985c78871f70ff8a15af97afe53970c26fc78))
* **versioning:** Version and publish workflow ([98f9587](https://github.com/KaotoIO/kaoto-next/commit/98f95879076cd066d1e0cb83d9556468c1277e7a))

# 0.1.0 (2023-10-05)

### Bug Fixes

* **build:** Build errors with node v20 ([1cdc56f](https://github.com/KaotoIO/kaoto-next/commit/1cdc56fe96e3e46a1ac84e3423193c6d5c6406dd))
* **build:** Windows build ([b8d962e](https://github.com/KaotoIO/kaoto-next/commit/b8d962e0b86e4854277d354c53185a23e2ff9ed9))
* Camel K CRD file extraction fails ([c633b07](https://github.com/KaotoIO/kaoto-next/commit/c633b07c419fad48f0e4b65b3f4a0687819aa4ba)), closes [#106](https://github.com/KaotoIO/kaoto-next/issues/106)
* Create sub schemas for each top properties ([#144](https://github.com/KaotoIO/kaoto-next/issues/144)) ([40efd4a](https://github.com/KaotoIO/kaoto-next/commit/40efd4a18af9e4da20394943979f5c2a58fe8e8f)), closes [#138](https://github.com/KaotoIO/kaoto-next/issues/138)
* **deps:** update dependency io.fabric8:kubernetes-model to v6.8.1 ([#32](https://github.com/KaotoIO/kaoto-next/issues/32)) ([e38f7ab](https://github.com/KaotoIO/kaoto-next/commit/e38f7abaca83504927ac5e5bee16f9a80f5a27f4))
* **deps:** update dependency org.apache.maven:maven-plugin-api to v3.9.5 ([#191](https://github.com/KaotoIO/kaoto-next/issues/191)) ([598fd26](https://github.com/KaotoIO/kaoto-next/commit/598fd26665b08cba3692685dd5ac158245fc2fde))
* Let UI use maven generated YAML DSL sub schema ([66bdd77](https://github.com/KaotoIO/kaoto-next/commit/66bdd7704c87d2d29c602d36557f10d5ddba5ba5)), closes [#147](https://github.com/KaotoIO/kaoto-next/issues/147) [#8](https://github.com/KaotoIO/kaoto-next/issues/8)
* Put schema files into a Map to allow direct access with a schema name ([9cf8c4d](https://github.com/KaotoIO/kaoto-next/commit/9cf8c4d538908732b23198d394e0dcfa95f283ff)), closes [#148](https://github.com/KaotoIO/kaoto-next/issues/148)
* Remove kebab-case YAML schema in favor of camelCase one ([96b21e4](https://github.com/KaotoIO/kaoto-next/commit/96b21e48d1b483ce0dae46d6b28a53c02d1ebdad)), closes [#70](https://github.com/KaotoIO/kaoto-next/issues/70)
* Replace rm with rimraf to clean dist folder ([8133563](https://github.com/KaotoIO/kaoto-next/commit/81335630d329ea6b0e7c21a1d3c045ed89ff4e00))

### Features

* Add camel catalog and schema ([bb8f3ad](https://github.com/KaotoIO/kaoto-next/commit/bb8f3ad9dadfe6fe71f22fe8dbb1986d23830986))
* **camel-catalog:** export Typescript definitions from Camel Schemas ([a76985c](https://github.com/KaotoIO/kaoto-next/commit/a76985c78871f70ff8a15af97afe53970c26fc78))
* **versioning:** Version and publish workflow ([98f9587](https://github.com/KaotoIO/kaoto-next/commit/98f95879076cd066d1e0cb83d9556468c1277e7a))

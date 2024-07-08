# Kaoto Camel Catalog Generator

This project is a simple tool to generate a Camel Catalog from a set of Camel components. It is based on the Camel Catalog Maven Plugin and the Camel Catalog Model.

## Usage

Install the project dependencies:

```bash
./mvnw install
```

Run the project with the following command:

```bash
./mvnw package; java -jar ./target/catalog-generator-0.0.1-SNAPSHOT.jar -o ./dist/camel-catalog -k 4.6.0 -m 4.6.0 -m 4.4.0 -m 4.4.0.redhat-00025 -q 3.12.0 -q 3.8.0.redhat-00006 -s 4.6.0 -s 4.4.0.redhat-00014 -n "Default Catalog"
```

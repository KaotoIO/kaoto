# How to build and run a Camel application

This project was generated using [Camel Jbang](https://camel.apache.org/manual/camel-jbang.html). Please, refer the the online documentation for learning more about how to configure the export of your Camel application.

This is a brief guide explaining how to build, "containerize" and run your Camel application.

## Build the Maven project

```bash
./mvnw clean package
```

The application could now immediately run:

```bash
java -jar target/my-camel-main-route-1.0-SNAPSHOT.jar
```

## Create a Docker container

You can create a container image directly from the `src/main/docker` resources. Here you have a precompiled base configuration which can be enhanced with any further required configuration.

```bash
docker build -f src/main/docker/Dockerfile -t my-camel-main-route:1.0-SNAPSHOT .
```

Once the application is published, you can run it directly from the container:

```bash
docker run -it my-camel-main-route:1.0-SNAPSHOT
```

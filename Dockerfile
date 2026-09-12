FROM eclipse-temurin:17-jre

WORKDIR /app

COPY target/lingora-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 10000

ENTRYPOINT ["java", "-Dserver.port=10000", "-Dserver.address=0.0.0.0", "-jar", "app.jar"]
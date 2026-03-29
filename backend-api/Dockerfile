# Gebruik een lichte Java image
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
# Kopieer de gebouwde .jar van Maven naar de container
COPY target/*.jar app.jar
# Start de applicatie
ENTRYPOINT ["java", "-jar", "app.jar"]
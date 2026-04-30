#!/bin/sh
# ----------------------------------------------------------------------------
# Maven Wrapper startup script (simplified)
# ----------------------------------------------------------------------------
if [ -z "$JAVA_HOME" ]; then
  JAVACMD="java"
else
  JAVACMD="$JAVA_HOME/bin/java"
fi

MAVEN_WRAPPER_JAR=".mvn/wrapper/maven-wrapper.jar"
MAVEN_WRAPPER_PROPERTIES=".mvn/wrapper/maven-wrapper.properties"

# Download wrapper jar if not present
if [ ! -f "$MAVEN_WRAPPER_JAR" ]; then
  echo "Downloading Maven Wrapper..."
  mkdir -p ".mvn/wrapper"
  curl -sL "https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar" \
    -o "$MAVEN_WRAPPER_JAR" 2>/dev/null || \
  wget -q "https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar" \
    -O "$MAVEN_WRAPPER_JAR" 2>/dev/null || \
  echo "Could not download Maven Wrapper, falling back to system mvn"
fi

if [ -f "$MAVEN_WRAPPER_JAR" ]; then
  exec "$JAVACMD" \
    -classpath "$MAVEN_WRAPPER_JAR" \
    "-Dmaven.multiModuleProjectDirectory=$MAVEN_PROJECTBASEDIR" \
    org.apache.maven.wrapper.MavenWrapperMain \
    -f pom.xml "$@"
else
  exec mvn "$@"
fi

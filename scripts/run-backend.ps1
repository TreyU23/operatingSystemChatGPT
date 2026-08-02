$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localJdk = Join-Path $projectRoot ".tools\jdk-21"

if (Test-Path (Join-Path $localJdk "bin\java.exe")) {
    $env:JAVA_HOME = $localJdk
}

if (-not $env:JAVA_HOME -and -not (Get-Command java -ErrorAction SilentlyContinue)) {
    throw "Java 21 is required. Install a JDK or run scripts/bootstrap-java.ps1."
}

$env:MAVEN_USER_HOME = Join-Path $projectRoot ".tools\maven-home"
if (-not $env:DATA_DIR) {
    $env:DATA_DIR = Join-Path $projectRoot "data"
}
if (-not $env:WORKSPACE_ROOT) {
    $env:WORKSPACE_ROOT = $projectRoot
}

Push-Location $projectRoot
try {
    & ".\mvnw.cmd" -pl backend spring-boot:run
} finally {
    Pop-Location
}

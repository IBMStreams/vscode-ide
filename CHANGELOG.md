# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Update default save file location to user's home directory ([#69](https://github.com/IBMStreams/vscode-ide/issues/69))
- Warn user when building a file with unsaved changes ([#70](https://github.com/IBMStreams/vscode-ide/issues/70))
- Changelog file to document changes between releases ([#87](https://github.com/IBMStreams/vscode-ide/issues/87))

### Changed

- Coloring for debug log messages ([#76](https://github.com/IBMStreams/vscode-ide/issues/76))
- Clean up and standardize webview styling ([#83](https://github.com/IBMStreams/vscode-ide/issues/83))

### Fixed

- ESLint problems ([#74](https://github.com/IBMStreams/vscode-ide/issues/74))
- Handling of special characters in submission-time parameter values ([#82](https://github.com/IBMStreams/vscode-ide/issues/82))

## [1.0.1] - 2020-05-26

### Added

- Support for building and submitting applications to multiple IBM Streams instances
- Support for IBM Cloud Pak for Data v2.5 and v3.0 deployments
- Support for IBM Streams standalone deployments
- Streams Explorer view for quick access to instances, jobs, toolkits, and helpful resources
  - New commands:
    - Add Instance (`ibm-streams.view.streamsExplorer.streamsInstances.addInstance`)
    - Remove Instances (`ibm-streams.view.streamsExplorer.streamsInstances.removeInstances`)
    - Refresh Instances (`ibm-streams.view.streamsExplorer.streamsInstances.refreshInstances`)
- Support for viewing job graphs
  - New command:
    - Show Job Graph (`ibm-streams.environment.showJobGraph`)
- Ability to run the SPL language server in socket mode
  - New settings:
    - Server: Mode (`ibm-streams.server.mode`)
    - Server: Port (`ibm-streams.server.port`)
- Ability to configure the log level for the extension
  - New setting:
    - Log Level (`ibm-streams.logLevel`)

### Removed

- Obsolete settings
  - ICP4D: Url (`ibm-streams.icp4d.url`)
  - ICP4D: Use Master Node Host (`ibm-streams.icp4d.useMasterNodeHost`)
  - Streaming Analytics: Credentials (`ibm-streams.streamingAnalytics.credentials`)
  - Target Version (`ibm-streams.targetVersion`)
- Obsolete commands
  - Set IBM Cloud Private for Data URL (`ibm-streams.icp4d.setUrl`)
  - Set IBM Streaming Analytics Service Credentials (`ibm-streams.streamingAnalytics.setServiceCredentials`)
  - Set IBM Streams Target Version (`ibm-streams.setTargetVersion`)

[Unreleased]: https://github.com/IBMStreams/vscode-ide/compare/v1.0.0...develop
[1.0.1]: https://github.com/IBMStreams/vscode-ide/tree/v1.0.0
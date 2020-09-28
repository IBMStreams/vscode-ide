# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2020-09-28

### Added

- Support for building edge applications
- Support mixed-mode SPL applications in toleration mode ([#109](https://github.com/IBMStreams/vscode-ide/issues/109))
- Support for SPL application sets
- Additional actions to manage Streams build service and local toolkits ([#131](https://github.com/IBMStreams/vscode-ide/issues/131))

### Fixed

- Lint error when build output messages return column values of 0 ([#121](https://github.com/IBMStreams/vscode-ide/issues/121))
- Do not allow the IBM Streams SPL Language Server output channel to be removed ([#123](https://github.com/IBMStreams/vscode-ide/issues/123))

### Changed

- Replace discriminatory or culturally offensive terms that do not rely on third-party software ([#119](https://github.com/IBMStreams/vscode-ide/issues/119))

## [1.0.2] - 2020-07-08

### Added

- Update default save file location to user's home directory ([#69](https://github.com/IBMStreams/vscode-ide/issues/69))
- Warn user when building with unsaved changes ([#70](https://github.com/IBMStreams/vscode-ide/issues/70), [#103](https://github.com/IBMStreams/vscode-ide/issues/103))
- Allow user to start an IBM Streaming Analytics service if stopped ([#72](https://github.com/IBMStreams/vscode-ide/issues/72))
- Diagnostics for build output messages of all severity types ([#78](https://github.com/IBMStreams/vscode-ide/issues/78))
- Keyboard shortcuts for build commands ([#79](https://github.com/IBMStreams/vscode-ide/issues/79))
- Better support for job configuration overlay files when configuring job submissions ([#81](https://github.com/IBMStreams/vscode-ide/issues/81))
- Changelog file to document changes between releases ([#87](https://github.com/IBMStreams/vscode-ide/issues/87))
- Better error handling when starting the SPL language server ([#89](https://github.com/IBMStreams/vscode-ide/issues/89))
- Launch configuration that disables extensions and logging ([#96](https://github.com/IBMStreams/vscode-ide/issues/96))
- Provide more clarity about application folder structure requirements ([#113](https://github.com/IBMStreams/vscode-ide/issues/113))

### Changed

- Coloring for debug log messages ([#76](https://github.com/IBMStreams/vscode-ide/issues/76))
- Clean up and standardize webview styling ([#83](https://github.com/IBMStreams/vscode-ide/issues/83))
- Update extension documentation link ([#93](https://github.com/IBMStreams/vscode-ide/issues/93))

### Fixed

- ESLint problems ([#74](https://github.com/IBMStreams/vscode-ide/issues/74))
- Handling of special characters in submission-time parameter values ([#82](https://github.com/IBMStreams/vscode-ide/issues/82))
- Application bundle submissions from IBM Streams Studio projects ([#98](https://github.com/IBMStreams/vscode-ide/issues/98))
- Detection of newer local toolkits ([#99](https://github.com/IBMStreams/vscode-ide/issues/99))
- Remove leftover build archive file when a build fails ([#104](https://github.com/IBMStreams/vscode-ide/issues/104))
- Fetching toolkit index files may result in 404 errors ([#105](https://github.com/IBMStreams/vscode-ide/issues/105))
- Do not show error stack trace when IBM Streams log messages are reported ([#110](https://github.com/IBMStreams/vscode-ide/issues/110))
- Incorrect build output path in Windows environments ([#112](https://github.com/IBMStreams/vscode-ide/issues/112))

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

[1.0.3]: https://github.com/IBMStreams/vscode-ide/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/IBMStreams/vscode-ide/compare/v1.0.0...v1.0.2
[1.0.1]: https://github.com/IBMStreams/vscode-ide/tree/v1.0.0

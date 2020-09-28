# IBM Streams support for Visual Studio Code

This extension provides support for [IBM Streams](https://www.ibm.com/cloud/streaming-analytics) within the [Visual Studio Code](https://code.visualstudio.com) editor and works with the following Streams versions.

- [**IBM Cloud Pak for Data deployment**](https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/cpd/svc/streams/developing-intro.html): Delivers a platform for combining streaming and stored data with AI to build solutions that impact business decisions in real time.
- [**IBM Streams standalone deployment**](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.2.0/com.ibm.streams.welcome.doc/doc/kc-homepage.html) (on-premises): Delivers a programming language and IDE for applications, a runtime system and analytic toolkits to speed development.
- [**IBM Streaming Analytics on IBM Cloud**](https://cloud.ibm.com/docs/services/StreamingAnalytics?topic=StreamingAnalytics-gettingstarted): Offers most of the features of IBM Streams on an agile, cloud-based platform.

[Visual Studio Code 1.38.0](https://code.visualstudio.com/updates/v1_38) or later is required.

## Quick start

1.  Install the [**IBM Streams**](https://marketplace.visualstudio.com/items?itemName=IBM.ibm-streams) extension from the VS Code Marketplace.
1.  [Add a Streams instance](https://github.com/IBMStreams/vscode-ide/wiki/Adding-a-Streams-instance).
1.  If you are developing Streams SPL applications:
    - Ensure that Java JRE or JDK/SDK version 8 or higher is installed. Learn more [here](https://github.com/IBMStreams/vscode-ide/wiki#prerequisites).
    - [Add external toolkits](https://github.com/IBMStreams/vscode-ide/wiki/Working-with-toolkits) if your applications use them.

## Features

### Streams Explorer view

The Streams Explorer view allows you to:

- Easily manage your Streams instances
- View details for Streams instances and jobs
- See a list of Streams toolkits
- Access helpful resources

To bring up the view, click on the IBM Streams icon on the side of VS Code.

![Streams Explorer](./images/docs/feature_streamsExplorer.png)

### Develop SPL applications

This extension allows you to create Streams applications with SPL language support included. To get started, simply open a `.spl` file. Typical code editing features ([IntelliSense](https://code.visualstudio.com/docs/editor/intellisense)) are supported, including code completion, code folding, find references, go to definition, etc.

![Developing a SPL application](./images/docs/feature_developApplication.png)

You may also create a minimal SPL application (containing a `.spl` file and an `info.xml` file) by executing the **Create SPL Application** command.

For an enhanced development experience, it is recommended that you set the VS Code [color theme](https://code.visualstudio.com/docs/getstarted/themes) to one of the provided themes: **Streams Light** (based on Streams Studio) or **Streams Dark**.

> Note: To set a default color theme for `.spl` files to one of the included themes, you may want to search for a VS Code extension that provides that capability.

![Themes](./images/docs/themes.png)

### Build and submit SPL applications

To build an application, either:

- Right-click on a `.spl` or `Makefile` file in the [Explorer](https://code.visualstudio.com/docs/getstarted/userinterface#_explorer) view.
- Right-click in the editor of an open `.spl` or `Makefile` file.

There are three build options:

- **Build**: Builds and downloads the application bundle(s).
- **Build and Submit Job**: Builds and submits the application(s) to a Streams instance.
- **Build Edge Application Image**: Builds a Docker image that can be deployed to edge systems. This requires an IBM Cloud Pak for Data deployment with edge application image builds enabled. Learn more [here](https://github.com/IBMStreams/vscode-ide/wiki/Building-an-edge-application).

> Note: In order to detect your application folder, ensure that it contains either an [`info.xml`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3.0/com.ibm.streams.dev.doc/doc/toolkitinformationmodelfile.html) or `Makefile` file. If your SPL application is defined with a namespace, then one of these files must be present in the parent folder; otherwise, one of these files must be present in the same folder as your `.spl` file.
>
> As an example, consider the following application folder layout:
>
> ```
> /+ MyAppDir                     # application folder
>    /+ info.xml                  # name, version, dependency information
>    /+ my.sample                 # namespace directory
>       /+ FooBar.spl             # .spl file with the namespace my.sample and the main composite FooBar
>       /+ FooBarHelper.spl       # a second .spl file containing helpers
> ```
>
> For more information, refer to the [documentation](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3.0/com.ibm.streams.dev.doc/doc/appdirlayout.html).

![Building and submitting SPL application](./images/docs/feature_buildSubmitApplication.gif)

To submit application bundles to a Streams instance, right-click on one or more bundles in the Explorer view and select **Submit Job**. For each bundle, you will prompted for the job configuration before the submission. For an advanced configuration, you may import a [job configuration overlay](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/dev_job_configuration_overlays.html) file (in JSON format).

### Viewing job graphs

Use job graphs to visualize and monitor your Streams jobs. Graphs allow you to monitor metrics and flow rates, view flowing data, and much more! You may launch a graph in one of two ways:

- Execute the **Show Job Graph** command from the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette). This will display an empty graph in the context of the default Streams instance and you may select a job from the dropdown at the top.
- In the [Streams Explorer](#streams-explorer-view) view, hover over a job node and then click on the **Show Job Graph** icon that appears on the right. This will display the graph for the selected job.

> Note: Graphs are only supported for jobs in IBM Cloud Pak for Data deployments or IBM Streams standalone deployments (IBM Streaming Analytics on IBM Cloud is *not* supported).

![Viewing job graph](./images/docs/feature_jobGraph.png)

## Troubleshooting

- If the *Initializing SPL language features* message in the [Status Bar](https://code.visualstudio.com/docs/getstarted/userinterface) at the bottom of VS Code does not go away after some time, try updating the **Server: Mode** setting to `socket`. Refer to the [setting description](https://github.com/IBMStreams/vscode-ide/wiki/Settings) for important usage information.

  ![Initializing SPL language features](./images/docs/initializingLanguageFeatures.gif)

---
title: "Quick start guide"
permalink: /docs/quick-start-guide/
toc: true
toc_sticky: true
---

Follow this guide to get up and running quickly!

## Installation and setup

1.  Download and install [Visual Studio Code](https://code.visualstudio.com/Download) (VS Code).
1.  Install the [IBM Streams extension]({{ site.marketplace }}).
    - Bring up the [Extensions](https://code.visualstudio.com/docs/editor/extension-gallery) view by clicking on the <img src="https://github.com/microsoft/vscode-icons/blob/master/icons/light/extensions.svg?raw=true" alt="Extensions icon" title="Extensions" class="editor-button"> icon on the side of VS Code.
    - Search for **IBM Streams** and click on the **Install** button.
    - Reload VS Code if you are prompted to.
    <figure>
      <img src="{{ "/assets/images/quick-start-guide/install-extension.png" | relative_url }}" alt="Installing the extension" title="Installing the extension">
    </figure>
1.  Set the `JAVA_HOME` environment variable to a Java JRE or JDK/SDK version 8 or higher. This satisfies the requirements of the IBM Streams SPL language server, which provides [IntelliSense](https://code.visualstudio.com/docs/editor/intellisense) support for SPL files.
1.  Set the `java.home` VS Code setting to a Java JDK version 11 or higher. This satisfies the [requirements]({{ "/docs/developing-java-primitive-operators/#setting-up-vs-code-for-java-development" | relative_url }}) of the Language Support for Java(TM) by Red Hat extension that this extension depends on.
1.  Set "http.proxySupport": "off" in the settings.json file.
1.  [Add an IBM Streams instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}).
    <div class="notice--video">
      <p><strong>Watch and learn</strong>: This video demonstrates how to add your first instance.</p>
      <video class="tutorial-video" src="{{ site.videos.quick_start_guide.instance_add_first }}" controls></video>
    </div>
1.  [Add a toolkits folder]({{ "/docs/using-toolkits/#adding-a-local-toolkit" | relative_url }}) for toolkit dependencies.

## VS Code overview

This section covers some of the most useful VS Code features. For more information, refer to the [VS Code documentation](https://code.visualstudio.com/docs).

### Explorer and editor

The [Explorer](https://code.visualstudio.com/docs/getstarted/userinterface#_explorer) (<img src="https://github.com/microsoft/vscode-icons/blob/master/icons/light/files.svg?raw=true" alt="Explorer icon" title="Explorer" class="editor-button">) on the side of VS Code shows the projects that you are currently working on. Learn how to import a project [below](#importing-a-project).

Develop your Streams applications in the editor area. You can open and edit multiple files at a time.

<figure>
  <img src="{{ "/assets/images/quick-start-guide/explorer-editor.png" | relative_url }}" alt="Explorer and editor" title="Explorer and editor">
</figure>

### Command Palette

Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) to search for and see all of the available commands.

<figure>
  <img src="{{ "/assets/images/quick-start-guide/command-palette.png" | relative_url }}" alt="Command Palette" title="Command Palette">
</figure>

### Version control with Git

The [Source Control](https://code.visualstudio.com/Docs/editor/versioncontrol) view (<img src="https://github.com/microsoft/vscode-icons/blob/master/icons/light/source-control.svg?raw=true" alt="Source Control icon" title="Source Control" class="editor-button">) on the side of VS Code manages changes in your local Git repository. You can also create and push commits directly from VS Code.

<figure>
  <img src="{{ "/assets/images/quick-start-guide/source-control.png" | relative_url }}" alt="Source Control" title="Source Control">
</figure>

## Importing a project

If you already have existing projects on your local machine or in GitHub, you can easily work with them in VS Code.

### Importing an existing local project

To import a local SPL project (including those from [Streams Studio](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_4.3.0/com.ibm.streams.studio.doc/doc/coverview.html)):

1.  Click **File** > **Open...** (or **Add Folder to Workspace...**).

    **Tip**: Choose whether to use a single- or [multi-root workspace](<(https://code.visualstudio.com/docs/editor/multi-root-workspaces)>).<br><br>Choose **Open** if you want to work with a single project folder.<br><br>Choose **Add Folder to Workspace...** if you want to work on multiple projects at a time. The project will be added to the current workspace.
    {: .notice--info}

1.  Browse to the project folder and click **Open** (or **Add**).
1.  The imported project files are added to the [Explorer](https://code.visualstudio.com/docs/getstarted/userinterface#_explorer) (<img src="https://github.com/microsoft/vscode-icons/blob/master/icons/light/files.svg?raw=true" alt="Explorer icon" title="Explorer" class="editor-button">) on the side of VS Code.

### Importing an existing project from GitHub

To import a project from GitHub, you can clone the repository from within VS Code.

1.  Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select **Git: Clone**.
1.  You can either clone from a URL or from GitHub.
    - From URL:
      1. Enter a repository URL (e.g., [https://github.com/IBMStreams/samples](https://github.com/IBMStreams/samples)).
      1. Select **Clone from URL**.
    - From GitHub:
      1. Select **Clone from GitHub**.
      1. Click on the **Allow** button to allow signing into GitHub.
      1. In your browser, authorize VS Code to access GitHub by clicking on the **Continue** button.
      1. In VS Code, click on the **Open** button to continue with the clone.
      1. Select a repository from the list.
1.  Select a repository location on your local machine where the repository should be cloned to.
1.  Once the clone finishes, you can open the cloned repository in the current window or a new window.
1.  The imported project files are added to the [Explorer](https://code.visualstudio.com/docs/getstarted/userinterface#_explorer) (<img src="https://github.com/microsoft/vscode-icons/blob/master/icons/light/files.svg?raw=true" alt="Explorer icon" title="Explorer" class="editor-button">) on the side of VS Code.

## Switching to VS Code from Streams Studio

If you have used [Streams Studio](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_4.3.0/com.ibm.streams.studio.doc/doc/coverview.html), the following list summarizes some important things to look out for.

- SPL projects from Streams Studio can be used in VS Code without having to make any changes. See the [Importing an existing project](#importing-an-existing-local-project) section for instructions.
- Adding a Streams toolkit is discussed in the [Using toolkits]({{ "/docs/using-toolkits/#adding-a-toolkit" | relative_url }}) section.
- An equivalent of the SPL graphical editor is not available for developing SPL applications.
- Build configurations are not used to compile or run applications in VS Code. To compile an SPL composite, right-click on the SPL file containing the composite in the [Explorer](https://code.visualstudio.com/docs/getstarted/userinterface#_explorer) and select **Build** or **Build and Submit Job**.
- You can monitor running jobs using the included [job graph]({{ "/docs/building-running-applications/#job-graph" | relative_url }}) or the [Streams Console]({{ "/docs/building-running-applications/#streams-console" | relative_url }}).
- Streams installation management is not included because your Streams instance is created and managed in the cloud. However, Streams instance management is covered in the [Streams Explorer]({{ "/docs/streams-explorer" | relative_url }}) section.

---
title: 'Streams Explorer'
permalink: /docs/streams-explorer/
toc: true
toc_sticky: true
---

The **Streams Explorer** view allows you to:

- Easily manage your [Streams instances](#instances)
- View [details](#details) for Streams instances and jobs
- See a list of [Streams toolkits](#toolkits)
- Access [helpful resources](#helpful-resources)

To bring up the view, click on the IBM Streams icon <img src="{{ site.github_streams_icon }}" alt="IBM Streams icon" title="IBM Streams" class="editor-button"> on the side of VS Code.

## Instances

This section provides a list of all of your Streams instances.

- An instance can be **authenticated**. When this extension is activated, all instances are unauthenticated. Learn how to [authenticate to an instance](#authenticating-to-an-instance).
- An instance can be the **default instance**. While you can have multiple Streams instances, there can only be _one_ default instance. The default instance is selected by default when building and submitting applications, and determines what [build service toolkits](#build-service-toolkits) are used by this extension. Learn how to [set the default instance](#setting-the-default-instance).

Instance nodes are identified by the <img src="{{ site.github_icon_prefix }}/flash.svg?raw=true" alt="Instance node icon" title="Instance node icon" class="editor-button"> icon. This icon comes in different variations that indicate the state of the instance.

|                                                                         Icon                                                                          |                                                     Authenticated?                                                     |                                                   Default instance?                                                    |
| :---------------------------------------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------------------------------------: |
|        <img src="{{ site.github_icon_prefix }}/flash.svg?raw=true" alt="Instance node icon" title="Instance node icon" class="editor-button">         |    <img src="{{ site.github_carbon_icon_prefix }}/32/close.svg?raw=true" alt="No" title="No" class="editor-button">    |    <img src="{{ site.github_carbon_icon_prefix }}/32/close.svg?raw=true" alt="No" title="No" class="editor-button">    |
|    <img src="{{ site.github_icon_prefix }}/flash--filled.svg?raw=true" alt="Instance node icon" title="Instance node icon" class="editor-button">     | <img src="{{ site.github_carbon_icon_prefix }}/32/checkmark.svg?raw=true" alt="Yes" title="Yes" class="editor-button"> |    <img src="{{ site.github_carbon_icon_prefix }}/32/close.svg?raw=true" alt="No" title="No" class="editor-button">    |
|     <img src="{{ site.github_icon_prefix }}/flash--check.svg?raw=true" alt="Instance node icon" title="Instance node icon" class="editor-button">     |    <img src="{{ site.github_carbon_icon_prefix }}/32/close.svg?raw=true" alt="No" title="No" class="editor-button">    | <img src="{{ site.github_carbon_icon_prefix }}/32/checkmark.svg?raw=true" alt="Yes" title="Yes" class="editor-button"> |
| <img src="{{ site.github_icon_prefix }}/flash--filled--check.svg?raw=true" alt="Instance node icon" title="Instance node icon" class="editor-button"> | <img src="{{ site.github_carbon_icon_prefix }}/32/checkmark.svg?raw=true" alt="Yes" title="Yes" class="editor-button"> | <img src="{{ site.github_carbon_icon_prefix }}/32/checkmark.svg?raw=true" alt="Yes" title="Yes" class="editor-button"> |

### Adding an instance

To add an instance, click on the <img src="{{ site.github_icon_prefix }}/add--alt.svg?raw=true" alt="Add Instance icon" title="Add Instance" class="editor-button"> button at the top of the section. You will be prompted to select a Streams version and provide the connection details for the instance. The prerequisites for each version are detailed below.

{% include streams-version-prerequisites.html %}

Once a connection to the instance is established, the instance is added to the **Instances** section.

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to add an instance.</p>
  <video class="tutorial-video" src="{{ site.videos.streams_explorer.instance_add }}" controls></video>
</div>

### Removing an instance

To remove an instance, click on the <img src="{{ site.github_icon_prefix }}/subtract--alt.svg?raw=true" alt="Remove Instances icon" title="Remove Instances" class="editor-button"> button at the top of the section. Select one or more instances to remove and click **OK**. The selected instance(s) are removed from the **Instances** section.

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to remove an instance.</p>
  <video class="tutorial-video" src="{{ site.videos.streams_explorer.instance_remove }}" controls></video>
</div>

### Authenticating to an instance

There a couple of ways to authenticate to an instance.

- Click on the <img src="{{ site.github_icon_prefix }}/login.svg?raw=true" alt="Authenticate icon" title="Authenticate icon" class="editor-button"> icon.
- If the instance _is_ the default instance, click on the <img src="{{ site.github_icon_prefix }}/information.svg?raw=true" alt="Information icon" title="Information icon" class="editor-button"> **Get started by authenticating to this instance.** message.
- If the instance _is not_ the default instance, click on the unexpanded node.

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to authenticate to an instance.</p>
  <video class="tutorial-video" src="{{ site.videos.streams_explorer.instance_authenticate }}" controls></video>
</div>

### Refreshing an instance

Instances are refreshed automatically based on the [**Refresh Interval**]({{ "/docs/settings" | relative_url }}) setting. The default interval value is 5 minutes. To manually refresh an instance, click on the <img src="{{ site.github_icon_prefix }}/renew.svg?raw=true" alt="Refresh Instance icon" title="Refresh Instance icon" class="editor-button"> icon.

### Setting the default instance

You can set an instance as the default instance by clicking on the <img src="{{ site.github_icon_prefix }}/checkmark--outline.svg?raw=true" alt="Set Instance as Default icon" title="Set Instance as Default icon" class="editor-button"> icon.

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to set the default instance.</p>
  <video class="tutorial-video" src="{{ site.videos.streams_explorer.instance_set_default }}" controls></video>
</div>

## Details

This section allows you to view details about a node that is selected in the **Instances** section. For example, when an instance node is selected, the **Details** section is updated to display the following details about the instance:

- Connection details (such as the Cloud Pak for Data URL and username)
- Health
- Services
- Status
- And much more!

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video provides an overview of the <strong>Details</strong> section.</p>
  <video class="tutorial-video" src="{{ site.videos.streams_explorer.details }}" controls></video>
</div>

## Toolkits

This section allows you to easily view and manage toolkits that can be used in your Streams applications. Toolkits are grouped into two categories: build service toolkits and local toolkits.

For more information about toolkits, see [Using toolkits]({{ "/docs/using-toolkits" | relative_url }}).

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video provides an overview of the <strong>Toolkits</strong> section.</p>
  <video class="tutorial-video" src="{{ site.videos.streams_explorer.toolkits }}" controls></video>
</div>

### Build service toolkits

This set of toolkits depends on the Streams version of your default Streams instance (in the [Streams Explorer]({{ "/docs/streams-explorer/#instances" | relative_url }})). They are either stored remotely in your instance's build service or the bundled toolkits are used. Learn more [here]({{ "/docs/using-toolkits/#build-service-toolkits" | relative_url }}).

Hover on or click on the **Build service** node to:

- Add a toolkit (<img src="{{ site.github_icon_prefix }}/add--alt.svg?raw=true" alt="Add Toolkit to Streams Build Service" title="Add Toolkit to Streams Build Service" class="editor-button">): Prompts you to select a toolkit folder on your local machine containing an indexed toolkit and adds the toolkit to the Streams build service. The list of build service toolkits is updated to include the new toolkit.
- Remove toolkit(s) (<img src="{{ site.github_icon_prefix }}/subtract--alt.svg?raw=true" alt="Remove Toolkits from Streams Build Service" title="Remove Toolkits from Streams Build Service" class="editor-button">): Prompts you to select one or more toolkits to remove from the Streams build service. The list of build service toolkits is updated to exclude any removed toolkits.

Hover on or click on a build service toolkit node to:

- Open a toolkit (<img src="{{ site.github_icon_prefix }}/view--filled.svg?raw=true" alt="Open Toolkit" title="Open Toolkit" class="editor-button">): Opens the toolkit index XML file in the current VS Code window.
- View a toolkit (<img src="{{ site.github_icon_prefix }}/launch.svg?raw=true" alt="View Toolkit" title="View Toolkit" class="editor-button">): Reveals the toolkit index XML file in your local file manager (e.g., Windows File Explorer or macOS Finder).

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to add and remove a build service toolkit.</p>
  <video class="tutorial-video" src="{{ site.videos.streams_explorer.toolkit_build_service }}" controls></video>
</div>

### Local toolkits

These toolkits are stored locally on your machine. The [**Toolkit Paths**]({{ "/docs/settings" | relative_url }}) setting determines which toolkits are included.

**Note**: In order for a toolkit to be recognized, it must be already indexed (i.e., it must have an up-to-date [`toolkit.xml`](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkitartifacts.html) file).
{: .notice--info}

Hover on or click on the **Local** node to:

- Edit local toolkits (<img src="{{ site.github_icon_prefix }}/edit.svg?raw=true" alt="Edit Local Toolkits" title="Edit Local Toolkits" class="editor-button">): Opens the [Settings editor](https://code.visualstudio.com/docs/getstarted/settings#_settings-editor) for manual editing of the **Toolkit Paths** setting.
- Add a toolkit path (<img src="{{ site.github_icon_prefix }}/add--alt.svg?raw=true" alt="Add Toolkit Path" title="Add Toolkit Path" class="editor-button">): Prompts you to select a toolkit folder on your local machine containing an indexed toolkit and adds the toolkit folder path to the **Toolkit Paths** setting. The list of local toolkits is updated to include any new toolkits.
- Remove toolkit path(s) (<img src="{{ site.github_icon_prefix }}/subtract--alt.svg?raw=true" alt="Remove Toolkit Paths" title="Remove Toolkit Paths" class="editor-button">): Prompts you to select one or more toolkit paths to remove from the **Toolkit Paths** setting. The list of local toolkits is updated to exclude any removed toolkits.

Hover on or click on a local toolkit node to:

- Open a toolkit (<img src="{{ site.github_icon_prefix }}/view--filled.svg?raw=true" alt="Open Toolkit" title="Open Toolkit" class="editor-button">): Opens the toolkit folder in a new VS Code window.
- View a toolkit (<img src="{{ site.github_icon_prefix }}/launch.svg?raw=true" alt="View Toolkit" title="View Toolkit" class="editor-button">): Reveals the toolkit folder in your local file manager (e.g., Windows File Explorer or macOS Finder).

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to add and remove a local toolkit.</p>
  <video class="tutorial-video" src="{{ site.videos.streams_explorer.toolkit_local }}" controls></video>
</div>

## Helpful resources

This section provides quick access to helpful resources such as samples and documentation. Simply click on a node to open the resource in a browser.

Additional resources can be found on the [Resources]({{ "/docs/resources" | relative_url }}) page.

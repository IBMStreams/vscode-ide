---
title: "Building and running applications"
permalink: /docs/building-running-applications/
toc: true
toc_sticky: true
---

When you have finished [developing an SPL application]({{ "/docs/developing-spl-applications" | relative_url }}), you can build and/or submit it to to a Streams instance.

## Building and submitting a SPL application

### Before you begin

If you plan to build and/or submit your application(s) from a `Makefile`, you must configure your [`sc`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_4.3.0/com.ibm.streams.ref.doc/doc/sc.html) command invocation to pull in toolkit dependencies using `-t, --spl-path=path`.

| Toolkit type                                                                 | Toolkit lookup path                |
| ---------------------------------------------------------------------------- | ---------------------------------- |
| Streams product toolkits                                                     | `$(STREAMS_INSTALL)/toolkits`      |
| Toolkits that were uploaded to the Streams build service (Streams 5.0+ only) | `$(STREAMS_BUILDSERVICE_TOOLKITS)` |
| Local toolkits included the [**Toolkit Paths**]({{ "/docs/settings"          | relative_url }}) setting           | `../toolkits` |

Example:

```makefile
all:
	sc -M yournamespace::YourMainComposite -t $(STREAMS_INSTALL)/toolkits:$(STREAMS_BUILDSERVICE_TOOLKITS):../toolkits
```

### Procedure

1.  [Add a Streams instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}) to the Streams Explorer in VS Code if you haven't already.
1.  Right-click on a `.spl` or `Makefile` file. There are three build options:
    - **Build**: Builds and downloads the application bundle(s).
    - **Build and Submit Job**: Builds and submits the application(s) to a Streams instance.
    - **Build Edge Application Image**: Builds a Docker image that can be deployed to edge systems. This requires an IBM Cloud Pak for Data deployment with edge application image builds enabled. For more information, see [Building edge applications]({{ "/docs/building-edge-applications/" | relative_url }}).
1.  Follow the prompts to submit the build.

{% capture application-structure-notice-text %}

**Note**: In order to detect your application folder, ensure that it contains either an [`info.xml`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkitinformationmodelfile.html) or `Makefile` file. If your SPL application is defined with a namespace, then one of these files must be present in the parent folder; otherwise, one of these files must be present in the same folder as your `.spl` file.

As an example, consider the following application folder layout:

```
/+ YourAppDir                   # application folder
   /+ info.xml                  # name, version, dependency information
   /+ yournamespace             # namespace folder
      /+ YourMainComposite.spl  # .spl file with the namespace yournamespace and the main composite YourMainComposite
```

For more information, refer to the [documentation](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/appdirlayout.html).

{% endcapture %}

<div class="notice--info">
  {{ application-structure-notice-text | markdownify }}
</div>

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to build and submit an application.</p>
  <video class="tutorial-video" src="{{ site.videos.building_running_applications.build_submit_spl_application }}" controls></video>
</div>

### Building on OSStreams

- **Prerequisites**:

1. Have a docker registry running
2. Follow the steps under "Building streams" https://github.com/IBMStreams/OSStreams
3. Have an SPL application ready to be built with OSStreams. Example: https://github.com/xguerin/spl-playground/tree/master/apps/custommetrics

- **Setting up**:

1. Open command palette using command + shift + p and select "Open Settings(UI)"
2. In the search bar, type in "Streams"
3. Checkmark the "Enable OSStreams Builds" box
4. In the "OSStreams Image" setting, enter the string containing DNS and port, namespace and the image (The default is "localhost:5000/\$USER/streams-runtime:6.debug")
5. Settings are automatically saved, so the tab can be closed

- **Workspace**:

1. Click on file on VSCode and select "Open"
2. Select an SPL Project containing the SPL file you wish to build. ex: open this project https://github.com/xguerin/spl-playground
3. make sure the workspace you open is not included in the namespace of your file you wish to build. For example, the namespace in https://github.com/xguerin/spl-playground/blob/master/apps/custommetrics/CustomMetrics.spl is apps.custommetrics, so set your workspace to be the folder right before apps/custommetrics.
4. ex: users/bob/documents/spl-playground

- **Building the App**:

1. In the explorer, right click the spl file you wish to build and select "Build on OSStreams"
2. In the IBM Streams output console, updates will be shown with the status of the build, starting with "Building with OSStreams..."
3. The console will update once the app has been built, or will show any errors that occurred during the build
4. The output folder containing the .sab file will be in the directory of the folder that was mounted

### Building on V4.3

- **Prerequisites**:

1. Have QSE running on docker
2. Have an SPL application ready to be built

- **Setting up**:

1. Open command palette using command + shift + p and select "Open Settings(UI)"
2. in the search bar, type in "Streams"
3. Checkmark the "Enable V4.3 Builds" box
4. In the "QSE Version" setting, enter the QSE version (ex: 4.3.1.4)
5. In the "Shared Workspace" setting, enter the volume that is mounted between your computer and the image (ex: "workspace" and make sure to have the file you wish to build in here)
6. In the "V43 Imagename" setting, enter the name of the image (ex: streamsdocker4314)
7. Settings are automatically saved, so the tab can be closed

- **Workspace**:

1. Click on file on VSCode and select "Open"
2. Select an SPL Project containing the SPL file you wish to build. Make sure this is in your shared workspace folder

- **Building the App**:

1. In the explorer, right click the spl file you wish to build and select "Build on V4.3"
2. In the IBM Streams output console, updates will be shown with the status of the build, starting with "Building with V4.3..."
3. The console will update once the app has been built, or will show any errors that occurred during the build
4. The output folder containing the .sab file will be in the directory of the folder that was mounted

### Results

This depends on the build selection you made.

- **Build**: The [application bundle](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/applicationbundle.html) (`.sab`) file(s) are downloaded to the application's `output` folder by default. You may [submit application bundle files](#submitting-a-spl-application-bundle) to run on a Streams instance.
- **Build and Submit Job**: Before the job is submitted to the Streams instance, you are prompted to configure the job submission. You may provide [submission-time values](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/submissionvalues.html) and specify a [job configuration overlay file](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/dev_job_configuration_overlays.html).
- **Build Edge Application Image**: An edge application image is stored in the OpenShift internal registry. For more information, see [Building edge applications]({{ "/docs/building-edge-applications#what-to-do-next" | relative_url }}).

## Submitting a SPL application bundle

If you have an [application bundle](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/applicationbundle.html) file (`.sab`), you can submit it to a Streams instance.

### Procedure

1.  [Add a Streams instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}) to the Streams Explorer in VS Code if you haven't already.
1.  Right-click on an [application bundle](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/applicationbundle.html) (`.sab`) file and select **Submit Job**.
1.  Follow the prompts to configure the job submission and submit the application bundle to the Streams instance. You may provide [submission-time values](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/submissionvalues.html) and specify a [job configuration overlay file](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/dev_job_configuration_overlays.html).

### Results

If the job was submitted successfully, it will appear in the list of jobs for the Streams instance in the **Instances** section of the Streams Explorer.

## Monitoring a running job

Once an application has been submitted, you may monitor the running job using the job graph and/or the Streams Console.

### Job graph

The job graph runs in the VS Code editor. It allows you to easily visualize and monitor your Streams jobs. Streams applications are really directed graphs that analyze data as it is processed. Each node in the graph is an operator that processes data, and each link represents a stream of live data.

**Note**: You may use the job graph if your job is running in a Streams instance that is an [IBM Cloud Pak for Data deployment](https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/cpd/svc/streams/developing-intro.html) or [IBM Streams standalone deployment](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.2.0/com.ibm.streams.welcome.doc/doc/kc-homepage.html).
{: .notice--info}

Some of the useful features include:

- Monitor metrics and flow rates
- View flowing data
- Highlight nodes by branch, upstream, or downstream
- Color nodes by PE
- Set the trace level for a PE
- Download operator trace data
- Restart PE(s)
- Delete job(s)

{% include job-graph.html %}

<figure>
  <img src="{{ "/assets/images/building-running-applications/job-graph.png" | relative_url }}" alt="Job graph" title="Job graph">
</figure>

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates the features of the job graph.</p>
  <video class="tutorial-video" src="https://ibm.box.com/shared/static/q8p42hup8zmoa5i28osyxbtwn0soxn6t.mp4" controls></video>
</div>

### Streams Console

The [Streams Console](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.welcome.doc/doc/console.html) is an integrated console that runs in your web browser. You can use it to manage your instance and resources, configure security, and monitor jobs from a single location. Its sleek and efficient interface also lets you quickly gain insights into the health, metrics, issues, and performance of your Streams instance.

**Note**: You may use the Streams Console for all Streams instance types _unless_ your job is running in a Streams instance that is an [IBM Cloud Pak for Data deployment](https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/cpd/svc/streams/developing-intro.html) that does not have the Streams Console enabled.
{: .notice--info}

It has the following capabilities for monitoring your jobs:

- Create queries to focus on data that you care about.
- Display the results of a query in a card. A card lets you visualize important data about your applications with tools, such as live graphs, tables, and charts.
- Create filters to refine the data that is displayed on your dashboards and logs without changing your queries
- View your instance logs based on the environment variables you define.
- Problem determination features to help you quickly find and fix errors in your applications.
- Monitoring how operators behave and guaranteed tuple processing in the cloud. Streams provides metrics to help evaluate the health of Streams services, to aid in diagnosing performance issues, and to analyze throughput of requests.

{% include streams-console.html %}

<figure>
  <img src="{{ "/assets/images/building-running-applications/streams-console.png" | relative_url }}" alt="Streams Console" title="Streams Console">
</figure>

## Canceling a running job

When you are finished working with an application, you may cancel the job.

### Procedure

1.  Bring up the Streams Explorer and locate the **Instances** section.
1.  Hover over a job and click on the **Cancel Job** icon <img src="{{ site.github_icon_prefix }}/delete.svg?raw=true" alt="Cancel Job icon" title="Cancel Job" class="editor-button"> that appears on the right.

### Results

The processing elements (PEs) for the job are stopped and knowledge of the job and its PEs are removed from the Streams instance. The job is also removed from the Streams Explorer.

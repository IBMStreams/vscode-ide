---
title: 'Developing SPL applications'
permalink: /docs/developing-spl-applications/
toc: true
toc_sticky: true
---

A [stream processing application](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/streaming_applications.html) is a collection of operators, all of which process streams of data. Typically, [Streams Processing Language](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.splangref.doc/doc/spl-container.html) (SPL) is used for creating Streams applications.

## Creating a SPL application

### Procedure

1.  Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select **Create SPL Application**.
1.  In the panel that appears, specify the following:
    - **Application folder path**: The path of the folder where you want to create the SPL application. It is recommended to use an empty folder.
    - **Namespace**: The namespace of the SPL application. You can use namespaces to organize your SPL code, similar to Python modules or Java packages.
      <div class="notice--info">
        <strong>Note</strong>: The namespace must start with an ASCII letter or underscore, followed by ASCII letters, digits, underscores, or period delimiters.
      </div>
    - **Main composite name**: The main composite name of the SPL application. The entry point of a SPL application is called a main composite and it is defined in a SPL source file (`.spl`).
      <div class="notice--info">
        <strong>Note</strong>: The name must start with an ASCII letter or underscore, followed by ASCII letters, digits, or underscores.
      </div>
1.  Click on the **Create** button to create the SPL application.

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to create an SPL application.</p>
  <video class="tutorial-video" src="{{ site.videos.developing_spl_applications.create_spl_application }}" controls></video>
</div>

### Results

A minimal SPL application is created in the folder location you specified. The folder structure is:

```
/+ <application-folder>
   /+ <namespace>
      /+ <main-composite>.spl
   /+ info.xml
```

Example SPL source file (`<main-composite>.spl`):

```
namespace yournamespace;

composite YourMainComposite {
  graph
    stream<rstring str> Src = Beacon() {
      // Insert operator clauses here
    }
}
```

Note that a [toolkit information model](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkitinformationmodelfile.html) (`info.xml`) file is also created since a SPL application is considered a [toolkit](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkits.html). This file contains the name, description, and version information about the toolkit. It also contains any dependencies that might exist on other toolkits, in the form of a list of toolkit names and versions or range of versions required.

Example `info.xml` file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<info:toolkitInfoModel xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:info="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo">
  <info:identity>
    <info:name>YourMainComposite</info:name>
    <info:description/>
    <info:version>1.0.0</info:version>
    <info:requiredProductVersion>4.3.0.0</info:requiredProductVersion>
  </info:identity>
  <info:dependencies/>
</info:toolkitInfoModel>
```

## Editing a SPL application

Once you have created a SPL application, the next step is to develop the application. For more information, see [Writing stream processing applications](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/writingapplications.html).

### Defining operators

Connect [operators](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/operators.html) together to ingest data from external data sources, process and analyze data, and write data to external data systems. SPL operators are defined in [toolkits](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkits.html), which can be divided into two categories:

- Toolkits developed by IBM

  - Standard toolkit: The [SPL standard toolkit](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/tk$spl.html) (`spl`) provides a set of operators, types, and functions that are available by default to develop SPL applications. For example, here are some commonly used operators: [`Aggregate`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.relational$Aggregate.html), [`Beacon`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.utility$Beacon.html), [`FileSink`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.adapter$FileSink.html), [`FileSource`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.adapter$FileSource.html), [`Filter`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.relational$Filter.html), [`Join`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.relational$Join.html), [`Split`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.utility$Split.html), and [`Throttle`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.utility$Throttle.html). You can find samples for these operators in the [Samples Catalog](https://ibmstreams.github.io/samples/).
  - Specialized toolkits: [Specialized toolkits](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/toolkits/toolkits.html) are sets of artifacts that are developed for specific business environments and activities. Some toolkits are included with the IBM product and others are publicly available on [GitHub](https://github.com/search?q=topic:toolkit+org:IBMStreams&type=Repositories). For example, here are some commonly used toolkits: [DateTime](http://ibmstreams.github.io/streamsx.datetime/), [DPS](http://ibmstreams.github.io/streamsx.dps/), [Text](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$com.ibm.streams.text/tk$com.ibm.streams.text.html), and [TimeSeries](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$com.ibm.streams.timeseries/tk$com.ibm.streams.timeseries.html).

    **Note**: Specialized toolkits have certain requirements and restrictions if you use Streams in an OpenShift or Kubernetes environment. Review [Specialized toolkits](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/icp_toolkit_restrictions.html) before you develop applications with specialized toolkits to be deployed in these environments.
    {: .notice--info}

- Custom toolkits
  - You can create toolkits outside the context of creating applications by developing all the necessary artifacts, organizing them into namespace directories, and running the [`spl-make-toolkit`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_4.3.0/com.ibm.streams.ref.doc/doc/spl-make-toolkit.html) command to index the toolkit. For more information, see [Developing toolkits](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/creating_toolkits.html) and [Building a toolkit]({{ "/docs/developing-toolkits/#building-a-toolkit" | relative_url}}).
  - Toolkits can also be created by third-party developers and integrated into your application.

To use an operator from a toolkit that is _not_ part of the Streams product (e.g., a public [`streamsx`](https://github.com/search?q=topic:toolkit+org:IBMStreams&type=Repositories) toolkit), you must [add the toolkit]({{ "/docs/using-toolkits/#adding-a-toolkit" | relative_url}}) and [import the toolkit]({{ "/docs/using-toolkits/#using-a-toolkit" | relative_url}}).

### Editing features

This extension includes rich SPL code editing features ([IntelliSense](https://code.visualstudio.com/docs/editor/intellisense)).

- **Code completion**: Type `control` + `space` or a trigger character (such as the dot character (`.`)) to show a list of suggestions. You can use this to add operators using templates.
- **Find references**: To find out where a stream or operator is used within a file or workspace, right-click on it and select **Go to References** or **Find All References**.
- **Folding**: If a closing bracket isn’t easily visible, [fold](https://code.visualstudio.com/docs/editor/codebasics#_folding) portions of code using the folding icons on the left side of the editor.
- **Bracket matching**: [Bracket matching](https://code.visualstudio.com/docs/editor/editingevolved#_bracket-matching) shows you the scope of a declaration when moving the cursor near a bracket.
- **Find problems**: Syntax errors in your code are reported in the editor and in the PROBLEMS panel at the bottom.
- **View documentation**: You can hover over any artifact, such as a parameter, stream, or operator, and its documentation is displayed if it is available.

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates some of the editing features available for SPL files.</p>
  <video class="tutorial-video" src="{{ site.videos.developing_spl_applications.editing_features }}" controls></video>
</div>

### Selecting a Streams color theme

For an enhanced development experience, it is recommended that you set the VS Code [color theme](https://code.visualstudio.com/docs/getstarted/themes) to one of the provided themes: **Streams Light** (based on [Streams Studio](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_4.3.0/com.ibm.streams.studio.doc/doc/coverview.html)) or **Streams Dark**.

<figure>
  <img src="{{ "/assets/images/developing-spl-applications/themes.png" | relative_url }}" alt="Themes" title="Themes">
</figure>

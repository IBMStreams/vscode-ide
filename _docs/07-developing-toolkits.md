---
title: 'Developing toolkits'
permalink: /docs/developing-toolkits/
toc: true
toc_sticky: true
---

A [toolkit](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkits.html) is a collection of artifacts that are organized into a package. Toolkits make SPL or native functions and primitive or composite operators reusable across different applications. A toolkit provides one or more namespaces that contain functions, operators, and types that are packaged as part of the toolkit, all of which can then be reused in other Streams applications.

The Streams platform includes many toolkits, each with useful operators and functions. For example, the operators used to connect to Apache Kafka are in the [Kafka toolkit](https://github.com/IBMStreams/streamsx.kafka).

However, you can create your own custom toolkit if the included toolkits do not contain the functionality that you need.

For more information, see [Developing toolkits](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/creating_toolkits.html).

## Building a toolkit

Build a custom toolkit that you can use in your streaming applications.

{% capture building-toolkit-notice-text %}

**Notes**:

- Toolkit builds are intended for custom toolkits. Toolkits that are included with the Streams product are pre-built.
- Developing a toolkit in a folder that is included in the **Toolkit Paths** setting is _not_ recommended. Only indexed toolkits should be specified in the setting (i.e., toolkits where the `toolkit.xml` file is up-to-date with the contents of the toolkit directory).

{% endcapture %}

<div class="notice--info">
  {{ building-toolkit-notice-text | markdownify }}
</div>

### Before you begin

You must open or add the folder for the toolkit you wish to build in Visual Studio Code.

A `Makefile` at the root of the toolkit folder is required. It must run the [`spl-make-toolkit`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_4.3.0/com.ibm.streams.ref.doc/doc/spl-make-toolkit.html) command, which indexes the toolkit and makes the functions and operators it contains ready for use by SPL programs. A simple `Makefile` would look like the following.

```makefile
all:
	spl-make-toolkit -i .
```

For other `Makefile` examples, see the toolkits in the [Streams GitHub organization](https://github.com/IBMStreams).

#### Gradle builds

If the toolkit uses [Gradle](https://gradle.org/) as the build tool, the `Makefile` must run the target Gradle task. For example, consider the [streamsx.kafka](https://github.com/IBMStreams/streamsx.kafka) toolkit. A simple `Makefile` would look like the following.

```makefile
all:
	cd com.ibm.streamsx.kafka; ../gradlew build
```

### Procedure

1. [Add your Streams 5.5 instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}) to the Streams Explorer in VS Code if you haven't already.
1. Right-click on a custom toolkit folder (must include a `Makefile` at the root of the folder), `Makefile` file, `info.xml` file, or `toolkit.xml` file and select **Build Toolkit**.
1. Follow the prompts to submit the build.

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to build a toolkit.</p>
  <video class="tutorial-video" src="{{ site.videos.developing_toolkits.build_toolkit }}" controls></video>
</div>

### Results

After a build completes successfully, the indexed toolkit is extracted to the toolkit folder (overwriting the existing files). You will be presented with two options:

- **Download Toolkit**: Downloads the toolkit archive file (`.tgz`) to the toolkit folder.
- **Add Toolkit to Toolkit Path**: Adds the toolkit to a toolkit path folder (defined in the [**Toolkit Paths**]({{ "/docs/settings" | relative_url }}) setting). This makes the indexed toolkit available to use in your Streams applications.

### What to do next

[Add the toolkit]({{ "/docs/using-toolkits/#adding-a-toolkit" | relative_url }}) and [use the toolkit]({{ "/docs/using-toolkits/#using-a-toolkit" | relative_url }}) in your Streams applications.

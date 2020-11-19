---
title: 'Using toolkits'
permalink: /docs/using-toolkits/
toc: true
toc_sticky: true
---

A [toolkit](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkits.html) is a collection of artifacts that are organized into a package. Toolkits make SPL or native functions and primitive or composite operators reusable across different applications. A toolkit provides one or more namespaces that contain functions, operators, and types that are packaged as part of the toolkit, all of which can then be reused in other Streams applications.

The Streams platform includes many toolkits, each with useful operators and functions. For example, the operators used to connect to Apache Kafka are in the [Kafka toolkit](https://github.com/IBMStreams/streamsx.kafka). Almost all Streams applications that you create will use one or more external toolkits.

## Toolkits and developing SPL applications

SPL code editing features ([IntelliSense](https://code.visualstudio.com/docs/editor/intellisense)) are powered by the SPL language server, which relies on toolkits to provide content (e.g., operator details on hover). Toolkits are grouped into two categories: build service toolkits and local toolkits.

### Build service toolkits

This set of toolkits depends on the Streams version of your default Streams instance (in the [Streams Explorer]({{ "/docs/streams-explorer/#instances" | relative_url }})).

- If your default instance is an [IBM Cloud Pak for Data deployment]({{ site.doc.cloud_pak_for_data.general }}) or [IBM Streams standalone deployment]({{ site.doc.standalone.general }}), then this extension uses the toolkits that are available for build processing from the instance's remote build service.
- If your default instance is an [IBM Streaming Analytics service on IBM Cloud]({{ site.doc.streaming_analytics.general }}) or there are no instances, then this extension uses the [bundled toolkits](#bundled-toolkits).

### Local toolkits

These toolkits are stored locally on your machine. The [**Toolkit Paths**]({{ "/docs/settings" | relative_url }}) setting determines which toolkits are included.

**Note**: In order for a toolkit to be recognized, it must be already indexed (i.e., it must have an up-to-date [`toolkit.xml`](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkitartifacts.html) file).
{: .notice--info}

### Viewing and managing toolkits

To view and manage the toolkits that this extension is using:

1.  Bring up the [Streams Explorer]({{ "/docs/streams-explorer" | relative_url }}) by clicking on the IBM Streams icon <img src="{{ site.github_streams_icon }}" alt="IBM Streams icon" title="IBM Streams" class="editor-button"> on the side of VS Code.
1.  Find the **Toolkits** section where the toolkit names and versions are listed. For information about managing toolkits, see [Toolkits]({{ "/docs/streams-explorer/#toolkits" | relative_url }}).

    **Note**: If the bundled toolkits are being used, the **Build service** section will display **None available**.
    {: .notice--info}

<figure>
  <img src="{{ "/assets/images/using-toolkits/streams-explorer-toolkits.png" | relative_url }}" alt="Toolkits in the Streams Explorer" title="Toolkits in the Streams Explorer">
</figure>

## Finding a toolkit

You can search for open-source Streams toolkits in [GitHub](https://github.com/search?q=topic%3Atoolkit+org%3AIBMStreams&type=Repositories) or [develop a custom toolkit](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/creating_toolkits.html).

## Adding a toolkit

If your Streams application uses a toolkit that is not bundled with this extension or is not included as part of the Streams build service for the default Streams instance, you must add the toolkit locally or to the build service. Adding the toolkit to the build service is beneficial if the toolkit is large; you only need to upload the toolkit once rather than uploading the toolkit with every application build.

**Note**: In order for a toolkit to be recognized, it must be already indexed (i.e., it must have an up-to-date [`toolkit.xml`](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkitartifacts.html) file).
{: .notice--info}

### Adding a local toolkit

1.  Designate a folder on your machine where Streams toolkits will be stored. This folder will contain any toolkits that you want to use in your streaming applications.
1.  Place the toolkit to add in the designated toolkits folder.
1.  Update the [**Toolkit Paths**]({{ "/docs/settings" | relative_url }}) setting to point to the designated toolkits folder (must be an absolute path). You can either:
    - Use the [Settings editor](https://code.visualstudio.com/docs/getstarted/settings#_settings-editor).
    - Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select [**Set IBM Streams Toolkit Paths**]({{ "/docs/commands#environment-commands" | relative_url }}).
    - Bring up the [Streams Explorer]({{ "/docs/streams-explorer" | relative_url }}) and expand the **Toolkits** section. Then, hover over the **Local** node and click on the **Add Toolkit Path** icon <img src="{{ site.github_icon_prefix }}/add--alt.svg?raw=true" alt="Add Toolkit Path icon" title="Add Toolkit Path" class="editor-button"> that appears on the right.

{% capture adding-local-toolkit-notice-text %}

**Notes**:

- The **Toolkit Paths** setting accepts paths to multiple toolkits folders (comma or semicolon separated), but it is recommended to use a single folder.
- Developing a custom toolkit in a folder that is part of the **Toolkit Paths** setting is _not_ recommended. Only indexed toolkits should be specified in the setting.

{% endcapture %}

<div class="notice--info">
  {{ adding-local-toolkit-notice-text | markdownify }}
</div>

<figure>
  <img src="{{ "/assets/images/using-toolkits/toolkit-paths-setting.png" | relative_url }}" alt="Toolkit Paths setting" title="Toolkit Paths setting">
</figure>

The **Toolkits** section in the Streams Explorer will display the toolkits in the toolkit paths under the **Local** node.

<figure>
  <img src="{{ "/assets/images/using-toolkits/streams-explorer-toolkits-local.png" | relative_url }}" alt="Local toolkits" title="Local toolkits">
</figure>

### Adding a toolkit to the Streams build service

**Note**: This is only available when the version of the default Streams instance is: _IBM Cloud Pak for Data deployment_ or _IBM Streams standalone deployment_.
{: .notice--info}

1.  Either:
    - Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select [**Add Toolkit to Streams Build Service**]({{ "/docs/commands#environment-commands" | relative_url }}).
    - Bring up the [Streams Explorer]({{ "/docs/streams-explorer" | relative_url }}) and expand the **Toolkits** section. Then, hover over the **Build service** node and click on the **Add Toolkit to Streams Build Service** icon <img src="{{ site.github_icon_prefix }}/add--alt.svg?raw=true" alt="Add Toolkit to Streams Build Service icon" title="Add Toolkit to Streams Build Service" class="editor-button"> that appears on the right.
    - Bring up the [Explorer](https://code.visualstudio.com/docs/getstarted/userinterface#_explorer) and right-click on a toolkit folder that contains an indexed toolkit (with a `toolkit.xml` file) or a `toolkit.xml` file. Then, select **Add Toolkit to Streams Build Service**.
1.  In the dialog that appears, you can browse to a different toolkit folder or accept the selected toolkit folder. Click on the **Set as toolkit folder** button.

If the toolkit is successfully added, the **Toolkits** section in the Streams Explorer will display the new toolkit under the **Build service** node.

<figure>
  <img src="{{ "/assets/images/using-toolkits/streams-explorer-toolkits-build-service.png" | relative_url }}" alt="Build service toolkits" title="Build service toolkits">
</figure>

## Removing a toolkit

If you no longer need a toolkit, you can remove it so that this extension no longer tracks it.

### Removing a local toolkit

To remove a _single toolkit_, manually delete or move the toolkit from the toolkit folder. Bring up the Streams Explorer and expand the **Toolkits** section. Then, hover over the local toolkit node and click on the **View Toolkit** icon <img src="{{ site.github_icon_prefix }}/launch.svg?raw=true" alt="View Toolkit icon" title="View Toolkit" class="editor-button"> that appears on the right. This will reveal the toolkit in your OS file manager where you can delete or move the toolkit.

To remove an entire _toolkit path_, update the [**Toolkit Paths**]({{ "/docs/settings" | relative_url }}) setting so that it no longer points to the toolkit path. You can either:

- Use the [Settings editor](https://code.visualstudio.com/docs/getstarted/settings#_settings-editor).
- Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select [**Set IBM Streams Toolkit Paths**]({{ "/docs/commands#environment-commands" | relative_url }}).
- Bring up the [Streams Explorer]({{ "/docs/streams-explorer" | relative_url }}) and expand the **Toolkits** section. Then, hover over the **Local** node and click on the **Remove Toolkit Path** icon <img src="{{ site.github_icon_prefix }}/subtract--alt.svg?raw=true" alt="Remove Toolkit Paths icon" title="Remove Toolkit Paths" class="editor-button"> that appears on the right. Select one or more toolkit paths to remove.

The **Toolkits** section in the Streams Explorer will no longer display the removed toolkit(s) under the **Local** node.

### Removing a toolkit from the Streams build service

**Note**: This is only available when the version of the default Streams instance is: _IBM Cloud Pak for Data deployment_ or _IBM Streams standalone deployment_.
{: .notice--info}

1.  Either:
    - Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select [**Remove Toolkits from Streams Build Service**]({{ "/docs/commands#environment-commands" | relative_url }}).
    - Bring up the [Streams Explorer]({{ "/docs/streams-explorer" | relative_url }}) and expand the **Toolkits** section. Then, hover over the **Build service** node and click on the **Remove Toolkits from Streams Build Service** icon <img src="{{ site.github_icon_prefix }}/subtract--alt.svg?raw=true" alt="Remove Toolkits from Streams Build Service icon" title="Remove Toolkits from Streams Build Service" class="editor-button"> that appears on the right.
1.  Select one or more toolkits to remove.

If the toolkit(s) are successfully removed, the **Toolkits** section in the Streams Explorer will no longer display the toolkit(s) under the **Build service** node.

## Using a toolkit

To use functions, operators, and types that are defined in a toolkit, configure your Streams application.

1.  Add the toolkit as a dependency by adding an entry in your project’s [`info.xml`](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkitinformationmodelfile.html) file. Example:
    ```xml
    <info:dependencies>
      <info:toolkit>
        <common:name>com.ibm.streams.sometoolkit</common:name>
        <common:version>[minVer,maxVer)</common:version>
      </info:toolkit>
    </info:dependencies>
    ```
1.  Import a function, operator, or type from the toolkit by adding a `use` directive at the top of your SPL file. Example:
    ```
    use com.ibm.streams.sometoolkit.somenamespace::SomeOperator;
    ```
1.  Use the imported function, operator, or type in your code. Example:
    ```
    stream<int32 myint> AnotherOperator = SomeOperator() {
      // Do something here
    }
    ```

When building your SPL application, toolkit dependencies are resolved automatically. If you are building from a `Makefile`, ensure that you [specify the toolkit lookup paths]({{ "/docs/building-running-applications/#before-you-begin" | relative_url }}).

## Bundled toolkits

The following toolkits are bundled with this extension.

| Name                                                                                                                                                                                                              | Description                                                                                                                                                                                   | Version |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: |
| [com.ibm.streams.cep](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.cep/tk$com.ibm.streams.cep.html)                                  | Provides the `MatchRegex` operator to perform complex event processing.                                                                                                                       |  2.1.1  |
| [com.ibm.streams.cybersecurity](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.cybersecurity/tk$com.ibm.streams.cybersecurity.html)    | Provides operators that are capable of analyzing DNS response records.                                                                                                                        |  2.1.1  |
| [com.ibm.streams.geospatial](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.geospatial/tk$com.ibm.streams.geospatial.html)             | Includes operators and functions that facilitate efficient processing and indexing of location data.                                                                                          |  3.3.2  |
| [com.ibm.streams.pmml](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.pmml/tk$com.ibm.streams.pmml.html)                               | Provides operators to score input records using PMML models and to interact with the [IBM Watson Machine Learning](https://www.ibm.com/cloud/machine-learning) repository.                    |  2.1.0  |
| [com.ibm.streams.rproject](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.rproject/tk$com.ibm.streams.rproject.html)                   | Includes the `RScript` operator, which you can use to run R commands and apply complex data mining algorithms to detect patterns of interest in data streams.                                 |  2.1.2  |
| [com.ibm.streams.rules](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.rules/tk$com.ibm.streams.rules.html)                            | Integrates [IBM Operational Decision Manager](https://www.ibm.com/products/operational-decision-manager) (ODM) with IBM Streams to run business rules that are created in ODM.                |  2.1.2  |
| [com.ibm.streams.rulescompiler](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.rulescompiler/tk$com.ibm.streams.rulescompiler.html)    |                                                                                                                                                                                               | 1.2.19  |
| [com.ibm.streams.teda](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.teda/tk$com.ibm.streams.teda.html)                               | Provides a set of generic operators that are used in telecommunications applications, and it also provides an application framework that enables you to set up new file-to-file applications. |  2.2.1  |
| [com.ibm.streams.text](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.text/tk$com.ibm.streams.text.html)                               | Includes operators to extracts information from text data.                                                                                                                                    |  2.3.2  |
| [com.ibm.streams.timeseries](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streams.timeseries/tk$com.ibm.streams.timeseries.html)             | Includes operators and functions to condition, analyze, and model time series data.                                                                                                           |  5.0.1  |
| [com.ibm.streamsx.avro](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.avro/tk$com.ibm.streamsx.avro.html)                            | Supports serialization and deserialization of messages in an [Apache Avro](https://avro.apache.org/) format.                                                                                  |  1.2.2  |
| [com.ibm.streamsx.datetime](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.datetime/tk$com.ibm.streamsx.datetime.html)                | Set of utilities to handle dates, times, and timestamps.                                                                                                                                      |  1.2.1  |
| [com.ibm.streamsx.dps](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.tk20200220.doc/toolkits/dita/tk$com.ibm.streamsx.dps/tk$com.ibm.streamsx.dps.html)                                | Enables multiple applications running processing elements (PEs) on one or more machines to share application specific state information.                                                      |  4.1.1  |
| [com.ibm.streamsx.elasticsearch](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.elasticsearch/tk$com.ibm.streamsx.elasticsearch.html) | Provides adapters for the [Elasticsearch](https://www.elastic.co/elasticsearch/) search and analytics engine.                                                                                 |  2.1.1  |
| [com.ibm.streamsx.eventstore](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.eventstore/tk$com.ibm.streamsx.eventstore.html)          | Provides adapters for the [Db2 Event Store](https://www.ibm.com/products/db2-event-store) database.                                                                                           |  2.0.3  |
| [com.ibm.streamsx.hbase](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.hbase/tk$com.ibm.streamsx.hbase.html)                         | Provides support for interacting with [Apache HBase](https://hbase.apache.org/).                                                                                                              |  3.6.0  |
| [com.ibm.streamsx.hdfs](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.hdfs/tk$com.ibm.streamsx.hdfs.html)                            | Provides operators that can read and write data from Hadoop Distributed File System (HDFS) version 2 or later.                                                                                |  4.4.1  |
| [com.ibm.streamsx.inet](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.inet/tk$com.ibm.streamsx.inet.html)                            | Provides support for common internet protocol client functions and operators.                                                                                                                 |  3.1.0  |
| [com.ibm.streamsx.iot](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.iot/tk$com.ibm.streamsx.iot.html)                               | Provides Internet of Things (IoT) integration with [IBM Watson IoT Platform](https://internetofthings.ibmcloud.com/).                                                                         |  1.2.0  |
| [com.ibm.streamsx.jdbc](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.jdbc/tk$com.ibm.streamsx.jdbc.html)                            | Enables Streams applications to work with databases via JDBC.                                                                                                                                 |  1.6.0  |
| [com.ibm.streamsx.jms](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.jms/tk$com.ibm.streamsx.jms.html)                               | Provides operators and functions that help you interact with JMS systems such as [IBM MQ](https://www.ibm.com/products/mq) or [Apache ActiveMQ](http://activemq.apache.org/).                 |  1.1.0  |
| [com.ibm.streamsx.json](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.json/tk$com.ibm.streamsx.json.html)                            | Provides standard transforms between SPL values and JSON objects.                                                                                                                             |  1.5.2  |
| [com.ibm.streamsx.kafka](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.kafka/tk$com.ibm.streamsx.kafka.html)                         | Enables Streams applications to easily integrate with [Apache Kafka](https://kafka.apache.org/).                                                                                              |  1.9.4  |
| [com.ibm.streamsx.mail](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.mail/tk$com.ibm.streamsx.mail.html)                            | Provides support for the SMTP and IMAP protocols.                                                                                                                                             |  2.0.0  |
| [com.ibm.streamsx.messagehub](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.messagehub/tk$com.ibm.streamsx.messagehub.html)          | Enables Streams applications to work with [IBM Event Streams](https://www.ibm.com/cloud/event-streams).                                                                                       |  1.9.3  |
| [com.ibm.streamsx.messaging](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.messaging/tk$com.ibm.streamsx.messaging.html)             | Includes operators and functions that help you interact with messaging systems such as Kafka, JMS, XMS, and MQTT.                                                                             |  5.4.1  |
| [com.ibm.streamsx.mqtt](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.mqtt/tk$com.ibm.streamsx.mqtt.html)                            | Enables Streams applications to work with MQTT providers.                                                                                                                                     |  1.0.1  |
| [com.ibm.streamsx.network](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.network/tk$com.ibm.streamsx.network.html)                   | Provides operators and functions for ingesting and parsing raw network data at the packet level.                                                                                              |  3.2.1  |
| [com.ibm.streamsx.objectstorage](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.objectstorage/tk$com.ibm.streamsx.objectstorage.html) | Provides the ability to read and write data from and to [IBM Cloud Object Storage](https://www.ibm.com/cloud/object-storage), respectively.                                                   |  1.9.2  |
| [com.ibm.streamsx.rabbitmq](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.rabbitmq/tk$com.ibm.streamsx.rabbitmq.html)                | Provides operators that allows your Streams applications to read and send messages from [RabbitMQ](https://www.rabbitmq.com/).                                                                |  1.2.1  |
| [com.ibm.streamsx.sparkmllib](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.sparkmllib/tk$com.ibm.streamsx.sparkmllib.html)          | Allows [Apache Spark's MLlib](https://spark.apache.org/mllib/) library to be used for real-time scoring of data.                                                                              |  1.2.0  |
| [com.ibm.streamsx.topology](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$com.ibm.streamsx.topology/tk$com.ibm.streamsx.topology.html)                | Provides mechanisms to build IBM Streams applications in other programming languages, with Java, Scala and Python support.                                                                    | 1.12.10 |
| [spl](https://www.ibm.com/support/knowledgecenter/SSCRJU_4.3.0/com.ibm.streams.1tk20190612.doc/toolkits/dita/tk$spl/tk$spl.html)                                                                                  | Provides a set of operators, types, and functions that are specific to IBM Streams.                                                                                                           |  1.4.0  |

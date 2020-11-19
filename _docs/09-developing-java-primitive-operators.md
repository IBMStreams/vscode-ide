---
title: 'Developing Java primitive operators'
permalink: /docs/developing-java-primitive-operators/
toc: true
toc_sticky: true
---

Java primitive operators use the [Java Operator API](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.spl-java-operators.doc/api/overview-summary.html) to receive, inspect, and submit tuples.

They are seamlessly integrated into SPL. Java primitive operators have unique names. The SPL compiler can enforce compile-time checks of operator parameters, and on the number of input and output ports. Specialized operator models describe such constraints.

Java primitive operators also provide implementation encapsulation. A user of the operator does not need to know the name of the Java class and the required class path for the operator implementation. This information is described directly in the operator model. SPL developers that use a Java primitive operator do not need to know that the operator they are invoking is implemented in Java.

For more information, see [Operators implemented in Java](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/str_optypenativejava.html) and [Developing Java primitive operators](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/javaprimitiveoperators.html).

## Creating a Java primitive operator

Create a [Java primitive operator](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/str_optypenativejava.html) that you can use in your streaming applications. See the [Java primitive operator guide]({{ "/docs/java-primitive-operator-guide" | relative_url }}) for a complete example.

### Before you begin

#### Setting up VS Code for Java development

The [Language Support for Java(TM) by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.java) extension is required. When you install the IBM Streams extension, you will also be prompted to install this Java extension if it is not already installed.

You may also want to install the [Java Extension Pack](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack), which includes other extensions to help you test and debug your Java applications.

Java SE Development Kit (JDK) 11 or above is required for the Java extension(s) to run. For more information about installing a JDK, see [Installing a Java Development Kit (JDK)](https://code.visualstudio.com/docs/java/java-tutorial#_installing-a-java-development-kit-jdk). Once JDK 11 is installed, configure VS Code to use the JDK by updating the `java.home` setting in [VS Code's User or Workspace settings](https://code.visualstudio.com/docs/getstarted/settings). Example:

```json
"java.home": "/Library/Java/JavaVirtualMachines/adoptopenjdk-11.jdk/Contents/Home"
```

For more information, see [Getting Started with Java in VS Code](https://code.visualstudio.com/docs/java/java-tutorial).

#### Configuring the Java runtime

Java SE Development Kit (JDK) 8 is required for developing Java primitive operators. For more information about installing a JDK, see [Installing a Java Development Kit (JDK)](https://code.visualstudio.com/docs/java/java-tutorial#_installing-a-java-development-kit-jdk). Once JDK 8 is installed, configure VS Code to use the JDK by updating the `java.configuration.runtimes` setting in [VS Code's User or Workspace settings](https://code.visualstudio.com/docs/getstarted/settings). Example:

```json
"java.configuration.runtimes": [
  {
    "name": "JavaSE-1.8",
    "path": "/Library/Java/JavaVirtualMachines/adoptopenjdk-8.jdk/Contents/Home",
    "default": true
  }
]
```

For more information, see [Configure JDK](https://code.visualstudio.com/docs/java/java-project#_configure-jdk).

### Procedure

1.  [Add your Streams 5.5 instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}) to the Streams Explorer in VS Code if you haven't already.
1.  Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select **Create Java Primitive Operator**.
1.  Follow the prompts to create the Java primitive operator. Specify the following:
    - **Project folder path**: The project folder path for the primitive operator. Use the **Browse...** button to create and select an empty folder on your machine. The primitive operator files will be created in this folder.
    - **Operator namespace**: The SPL namespace for the primitive operator.
    - **Operator name**: The name of the primitive operator.
    - **Operator processing pattern**: The operator processing pattern identifies whether the operator has input ports, output ports, or both and the type of tuple flow the operator provides.
1.  Add the Log4j 1.2 dependency.

    1.  Download the JAR file from one of the mirrors [here](https://logging.apache.org/log4j/1.2/download.html).
    1.  Unpackage the `.tar.gz` or `.zip` file.
    1.  Designate a folder on your machine where Java JAR dependencies will be stored (e.g., `/Users/someuser/Documents/javaJars`). Locate the `log4j-1.2.XX.jar` file inside the unpackaged folder and move or copy it to the designated folder.
    1.  Update the [`java.project.referencedLibraries`](https://code.visualstudio.com/docs/java/java-project#_library-configuration) setting in [VS Code's User or Workspace settings](https://code.visualstudio.com/docs/getstarted/settings) to add the folder containing the JAR file. The path should be absolute and can contain a glob pattern. Example:

        ```json
        "java.project.referencedLibraries": [
          "/Users/someuser/Documents/javaJars/*.jar"
        ]
        ```

        If your operator depends on other `.jar` files, add them to the same folder to bring in these dependencies.

### Results

Based on the selected operator processing pattern, a Java primitive operator is created in the specified project folder and the operator's Java source file (`<operator-name>.java`) is opened for editing.

The folder structure for the Java project is:

```
/+ <project-folder>
   /+ impl
      /+ java
         /+ bin
         /+ src
            /+ <operator-namespace>
               /+ <operator-name>.java
   /+ Makefile
```

Note that a `Makefile` file is also created. This is used to [build the Java primitive operator](#building-a-java-primitive-operator). The file looks like:

```makefile
CLASS_PATH=$(STREAMS_INSTALL)/lib/com.ibm.streams.operator.jar:$(STREAMS_INSTALL)/lib/com.ibm.streams.operator.samples.jar
DEST_DIR=impl/java/bin
SOURCE_FILE=impl/java/src/<operator-namespace>/<operator-name>.java
TOOLKIT_NAME=<project-folder>

all: compile-java build-toolkit

compile-java:
	javac -cp $(CLASS_PATH) -d $(DEST_DIR) $(SOURCE_FILE)

build-toolkit:
	$(STREAMS_INSTALL)/bin/spl-make-toolkit -i . -n $(TOOLKIT_NAME)
```

### What to do next

Implement the primitive operator using the [Java Operator API](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.spl-java-operators.doc/api/overview-summary.html). This depends on the operator processing pattern you chose.

- If your operator consumes incoming tuples and produces outgoing tuples, see [Implementing an operator using the Java Operator API](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/implementingoperusingjavaapi.html).
- If your operator produces outgoing tuples as a source operator, see [Implementing a source operator with the Java Operator API](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/sourceoperatorusingjavaopapi.html).
- If your operator consumes incoming tuples as a sink operator, see [Implementing a sink operator using the Java Operator API](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/sinkoperatorusingjavaopapi.html).

Use the `TODO` comments in the source file as a guide.

For more information, see [Developing Java primitive operators](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/javaprimitiveoperators.html) and the [Java Operator Development Guide](http://ibmstreams.github.io/streamsx.documentation/docs/4.1/java/java-op-dev-guide/).

#### Adding the `src` folder to the Java source path

If you see a message like the following in the **PROBLEMS** panel after opening the `.java` source file, then you'll need to add the `src` folder to the Java source path.

```
<operator-name>.java is not on the classpath of project <project_name>, only syntax errors are reported
```

Right-click on the `src` folder and select **Add Folder to Java Source Path**.

<figure>
  <img src="{{ "/assets/images/developing-java-primitive-operators/add_folder_to_source_path.png" | relative_url }}" alt="Add Folder to Java Source Path" title="Add Folder to Java Source Path">
</figure>

#### Building the operator

When you're ready, [build the Java primitive operator](#building-a-java-primitive-operator) to generate a toolkit that you can use in your streaming applications.

## Building a Java primitive operator

Build a [Java primitive operator](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/str_optypenativejava.html) to generate a [toolkit](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkits.html) that you can use in your streaming applications. See the [Java primitive operator guide](Java-primitive-operator-guide) for a complete example.

### Before you begin

Your Java project must have the following folder structure.

**Note**: If you created your operator using the [**Create Java Primitive Operator**](./Commands) command, then your project will have been created with the correct structure.
{: .notice--info}

```
/+ <project-folder>
   /+ impl
      /+ java
         /+ bin
         /+ src
            /+ <operator-namespace>
               /+ <operator-name>.java
   /+ Makefile
```

The `Makefile` must compile the Java source file(s) using `javac` and build a toolkit using [`spl-make-toolkit`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_4.3.0/com.ibm.streams.ref.doc/doc/spl-make-toolkit.html). A simple `Makefile` would be the following:

```makefile
CLASS_PATH=$(STREAMS_INSTALL)/lib/com.ibm.streams.operator.jar:$(STREAMS_INSTALL)/lib/com.ibm.streams.operator.samples.jar
DEST_DIR=impl/java/bin
SOURCE_FILE=impl/java/src/<operator-namespace>/<operator-name>.java
TOOLKIT_NAME=<project-folder>

all: compile-java build-toolkit

compile-java:
	javac -cp $(CLASS_PATH) -d $(DEST_DIR) $(SOURCE_FILE)

build-toolkit:
	$(STREAMS_INSTALL)/bin/spl-make-toolkit -i . -n $(TOOLKIT_NAME)
```

{% capture multiple-operators-notice-text %}

**Note**: If you have created multiple operators in the same project, you must update the `Makefile` to compile all of the `.java` source files. Example:

```makefile
SOURCE_FILE=impl/java/src/<operator-namespace-1>/*.java impl/java/src/<operator-namespace-2>/*.java
```

{% endcapture %}

<div class="notice--info">
  {{ multiple-operators-notice-text | markdownify }}
</div>

### Procedure

1.  [Add your Streams 5.5 instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}) to the Streams Explorer in VS Code if you haven't already.
1.  Right-click on a Java project folder or `.java` file containing a primitive operator and select **Build Java Primitive Operator**.
1.  Follow the prompts to submit the build.

### Results

After a build completes successfully, the indexed toolkit is extracted to the project folder (overwriting the existing files). You will be presented with two options:

- **Download Toolkit**: Downloads the toolkit archive file (`.tgz`) to the toolkit folder.
- **Add Toolkit to Toolkit Path**: Adds the toolkit to a toolkit path folder (defined in the [**Toolkit Paths**](./Settings) setting). This makes the indexed toolkit available to use in your Streams applications.

The toolkit will have the following folder structure. The authored files are marked with `+` and generated files are marked with `*`.

```
/+ <project-folder>
   /+ impl
      /+ java
         /+ bin
            /* <operator-namespace>
               /* <operator-name>.class
               /* <operator-name>$StreamsModel.java
               /* <operator-name>$StreamsModel.class
         /+ src
            /+ <operator-namespace>
               /+ <operator-name>.java
   /* <operator-namespace>
      /* <operator-name>
         /* <operator-name>.xml
   /+ Makefile
   /* toolkit.xml
```

### What to do next

Learn how to use the toolkit in your SPL applications [here]({{ "/docs/using-toolkits/#using-a-toolkit" | relative_url }}).

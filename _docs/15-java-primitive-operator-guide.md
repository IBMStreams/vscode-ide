---
title: 'Java primitive operator guide'
permalink: /docs/java-primitive-operator-guide/
toc: true
toc_sticky: true
---

This guide demonstrates creating a [Java primitive operator](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/str_optypenativejava.html), including implementing the operator and testing the operator.

This guide uses an example that creates a Java primitive operator to produce the sum of two numbers.

## Implementing the Java primitive operator

This section guides you through the steps of creating the primitive operator and configuring the Java class implementation for your Java primitive operator.

### Creating the Java primitive operator

This task demonstrates how to create the Java primitive operator.

1.  Set up your [Java development environment]({{ "/docs/developing-java-primitive-operators/#before-you-begin" | relative_url }}).
1.  [Add your Streams 5.5 instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}) to the Streams Explorer in VS Code if you haven't already.
1.  Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select **Create Java Primitive Operator**.
1.  Provide the following information:
    - **Project folder path**: Use the **Browse...** button to create and select an empty folder on your machine called `MyJavaProject`. The primitive operator files will be created in this folder. Example: `/Users/someuser/Documents/streams/MyJavaProject`.
    - **Operator namespace**: Specify `sample.sum` as the namespace. Your Java primitive operator will be created in this namespace.
    - **Operator name**: Specify `MyJavaOp` as the name of your Java primitive operator.
    - **Operator processing pattern**: Use the default selected pattern. The pattern identifies whether the operator has input ports, output ports, or both, and the type of tuple flow the operator provides. Each pattern uses templates for generating the operator model and Java source files.
1.  Click the **Create** button to create the skeleton Java primitive operator.
1.  If you have multiple Streams instances, you will be prompted to select an instance.
1.  Add the Log4j 1.2 dependency by following the last step [here]({{ "/docs/developing-java-primitive-operators/#procedure" | relative_url }}).

### Customizing the Java class implementation

This task demonstrates how to customize the implementation of the Java class (`.java` file) for your Java primitive operator.

1.  Open the Java source file `MyJavaOp.java`. This is located in the `MyJavaProject/impl/java/src/sample.sum` folder.
1.  Locate the `process` method and replace the body with the following code (in between the curly braces):

    ```java
    // Create a new tuple for output port 0.
    StreamingOutput<OutputTuple> outStream = getOutput(0);
    OutputTuple outTuple = outStream.newTuple();

    // Copy across all matching attributes.
    outTuple.assign(tuple);

    // Set the sum to the "c" attribute in the tuple.
    outTuple.setInt("c", tuple.getInt("a") + tuple.getInt("b"));

    // Submit new tuple to output port 0.
    outStream.submit(outTuple);
    ```

1.  Select **File** > **Save** to save the changes to `MyJavaOp.java`.

## Testing the Java primitive operator

This section guides you through the steps of building your Java primitive operator, creating a SPL application that invokes your operator, and then building and running the application to test your operator.

### Building the Java primitive operator

This task demonstrates how to build the Java primitive operator. This creates a toolkit that you can use in your SPL application.

1.  Right-click on the `MyJavaOp.java` file and select **Build Java Primitive Operator**.
1.  If you have multiple Streams instances, you will be prompted to select an instance.
1.  Check the notifications and build output to confirm that the primitive operator was built successfully. If it was successful, select the **Add Toolkit to Toolkit Path** button in the notification that appears. If you do not have a toolkit path specified, you will be prompted to specify a path. This makes the toolkit available for use in streaming applications.

### Creating the SPL application

This task demonstrates how to create a SPL application that invokes the Java primitive operator.

1.  Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select **Create SPL Application**.
1.  Provide the following information:
    - **Application folder path**: Select an empty folder on your machine called `TestJavaProject`. Example: `/Users/someuser/Documents/streams/TestJavaProject`.
    - **Namespace**: Specify `sample.sum.test` as the namespace. Your main composite will be created in this namespace.
    - **Main composite name**: Specify `Main` as the name of your main composite.
1.  Add the toolkit as a dependency.
    1.  Open the toolkit information model file `info.xml`. This is located in the `TestJavaProject` folder.
    1.  Locate the `<info:dependencies/>` element and replace it with the following code:
        ```xml
        <info:dependencies>
          <info:toolkit>
            <common:name>MyJavaProject</common:name>
            <common:version>1.0.0</common:version>
          </info:toolkit>
        </info:dependencies>
        ```
1.  Edit the SPL source.

    1.  Open SPL source file `Main.spl`. This is located in the `TestJavaProject/sample.sum.test` folder.
    1.  Import the `MyJavaOp` operator by entering the following `use` directive at the beginning of the file after `namespace sample.sum.test;`:
        ```
        use sample.sum::MyJavaOp;
        ```
    1.  Enter the following code for the `Main` composite (replace the starter code in between the curly braces):

        ```
        graph
          stream<int32 a, int32 b> InStream = Beacon() {
            logic
              state:
                mutable int32 n = 0, m = 0;
            param
              iterations: 10u;
            output
              InStream: a = ++n, b = 10 - ++m;
          }

          // Invoke the Java primitive operator MyJavaOp
          stream<int32 a, int32 b, int32 c> Sum = MyJavaOp(InStream) {}

          () as PrintSum = Custom(Sum) {
            logic
              onTuple Sum:
                println((rstring) a + " + " + (rstring) b + " = " + (rstring) c);
          }
        ```

    1.  Select **File** > **Save** to save the changes to `Main.spl`.

### Building and running the SPL application

This task demonstrates how to build and run the SPL application to test your Java primitive operator.

1.  Build and run the SPL application.
    1. Right-click on the `Main.spl` file and select **Build and Submit Job**.
    1. If you have multiple Streams instances, you will be prompted to select an instance.
    1. When the build completes successfully, you will be prompted to configure the job submission. Accept the defaults by clicking on the **Submit job** button.
    1. Check the notifications and submission output to confirm that the SPL application was submitted successfully. Take a note of the job ID.
1.  Verify that your Java primitive operator is working as expected.
    1.  Bring up the Streams Explorer and locate the new job in the **Instances** section.
    1.  Hover over the job and click on the **Download Job Logs** button.
    1.  Select a folder on your machine where the job logs will be downloaded to.
    1.  Unpackage the job logs `.tar.gz` file and open the PE output file `pec.pe.<pe-id>.stdouterr`. This is located in `app-X/jobs/<job-id>`.
    1.  Verify that the output shows a series of sum messages.
        ```
        "1 + 9 = 10"
        "2 + 8 = 10"
        "3 + 7 = 10"
        "4 + 6 = 10"
        "5 + 5 = 10"
        "6 + 4 = 10"
        "7 + 3 = 10"
        "8 + 2 = 10"
        "9 + 1 = 10"
        "10 + 0 = 10"
        ```
1.  After you have verified the result, cancel the running job.
    1.  Bring up the Streams Explorer and locate the job in the **Instances** section.
    1.  Hover over the job and click on the **Cancel Job** button.

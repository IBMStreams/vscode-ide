---
title: 'C++ primitive operator with a shared library guide'
permalink: /docs/cpp-primitive-operator-with-a-shared-library-guide/
toc: true
toc_sticky: true
---

This guide demonstrates creating a [C++ primitive operator](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/str_optypenativec.html), including implementing the operator and testing the operator.

This guide uses an example that creates a C++ primitive operator to print a hello greeting for a set of names. The example also demonstrates how an external C++ shared library can be created and referenced by the C++ operator.

## Implementing the C++ primitive operator

This section guides you through the steps of implementing the C++ shared library, configuring the C++ primitive operator model, and configuring the code generator templates for your C++ primitive operator.

### Creating the C++ primitive operator

This task demonstrates how to create the C++ primitive operator. This creates an operator model that describes the syntactic and semantic properties common to all instances of the operator.

1.  [Add your Streams 5.5 instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}) to the Streams Explorer in VS Code if you haven't already.
1.  Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select **Create C++ Primitive Operator**.
1.  Provide the following information:
    - **Project folder path**: Use the **Browse...** button to create and select an empty folder on your machine called `MyCppProject`. The primitive operator files will be created in this folder. Example: `/Users/someuser/Documents/streams/MyCppProject`.
    - **Operator namespace**: Specify `sample.hello` as the namespace. Your C++ primitive operator will be created in this namespace.
    - **Operator name**: Specify `MyCppOp` as the name of your C++ primitive operator.
    - **Generic operator**: Deselect the checkbox.
1.  Click the **Create** button to create the skeleton C++ primitive operator.
1.  If you have multiple Streams instances, you will be prompted to select an instance.

### Implementing the C++ shared library

This task demonstrates how to implement the C++ shared library that will be used by the C++ primitive operator. This includes creating a C++ header file and a C++ source file.

1.  Create the C++ header file in `MyCppProject/impl/include`.

    - Bring up the Explorer view.
    - Right-click on the `MyCppProject/impl/include` folder and select **New File**. Enter `MySampleLib.h` as the file name.
    - Open the `MySampleLib.h` file and enter the following code:

      ```cpp
      #ifndef MYSAMPLELIB_H_
      #define MYSAMPLELIB_H_

      #include <string>

      namespace MySample
      {
        class MySampleClass
        {
        public:
          static std::string sayHello(std::string name);
        };
      };

      #endif
      ```

1.  Create the C++ source file in `MyCppProject/impl/src`.

    - Bring up the Explorer view.
    - Right-click on the `MyCppProject/impl/src` folder and select **New File**. Enter `MySampleLib.cpp` as the file name.
    - Open the `MySampleLib.cpp` file and enter the following code:

      ```cpp
      #include "../include/MySampleLib.h"
      #include <iostream>

      using namespace std;
      using namespace MySample;

      std::string MySampleClass::sayHello(string name)
      {
        return "Hello there, " + name;
      }
      ```

1.  Edit the makefile in `MyCppProject` to add a target that builds the C++ shared library. Open the `MyCppProject/Makefile` file and replace the contents with the following:

    ```makefile
    IMPL=impl
    IMPL_INCLUDE=$(IMPL)/include
    IMPL_LIB=$(IMPL)/lib
    IMPL_SRC=$(IMPL)/src
    SPL_PKGCFG=$(STREAMS_INSTALL)/bin/dst-pe-pkg-config.sh
    SPL_PKG=dst-spl-pe-install
    SPL_INCLUDE_OPTIONS = `$(SPL_PKGCFG) --cflags $(SPL_PKG)`
    TOOLKIT_NAME=MyCppProject

    all: build-cpp-shared-lib build-toolkit

    build-cpp-shared-lib: libMySampleLib.so

    MySampleLib.o: $(IMPL_SRC)/MySampleLib.cpp $(IMPL_INCLUDE)/MySampleLib.h
    	@echo Compiling MySampleLib.cpp...
    	@g++ -Wall -fPIC -I include $(SPL_INCLUDE_OPTIONS) -c $(IMPL_SRC)/MySampleLib.cpp -o $(IMPL_LIB)/$@

    libMySampleLib.so: MySampleLib.o
    	@echo Building C++ shared library '$@'...
    	@g++ -shared -o $(IMPL_LIB)/$@ $(IMPL_LIB)/$<

    build-toolkit:
    	$(STREAMS_INSTALL)/bin/spl-make-toolkit -i . -m -n $(TOOLKIT_NAME)
    ```

### Configuring the operator model

This task demonstrates how to configure the operator model for your C++ primitive operator to specify the location to the C++ shared library. The operator model describes the syntactic and semantic properties common to all instances of the operator.

1.  Open the operator model `MyCppOp.xml`. This is located in the `MyCppProject/sample.hello/MyCppOp` folder.
1.  Add the `MySampleLib` shared library as a dependency. Find the `<context>` node and enter the following code as a child node:
    ```xml
    <libraryDependencies>
      <library>
        <cmn:description>MySampleLib</cmn:description>
        <cmn:managedLibrary>
          <cmn:lib>MySampleLib</cmn:lib>
          <cmn:libPath>../../impl/lib</cmn:libPath>
          <cmn:includePath>../../impl/include</cmn:includePath>
        </cmn:managedLibrary>
      </library>
    </libraryDependencies>
    ```
1.  Select **File** > **Save** to save the changes to `MyCppOp.xml`.

### Customizing the code generator templates

This task demonstrates how to customize the code generator templates (`.cgt` files) for your C++ primitive operator. The code generator templates implement the operator logic.

1.  Open the CPP code generator template `MyCppOp_cpp.cgt`. This is located in the `MyCppProject/sample.hello/MyCppOp` folder.
1.  Enter the following at the beginning of the file (after the `#pragma` statement):

    ```cpp
    #include "MySampleLib.h"

    using namespace std;
    using namespace SPL;
    ```

1.  Locate the `process(Tuple & tuple, uint32_t port)` method and enter the following code (in between the curly braces):

    ```cpp
    // List of names
    string names [] = {"Emma", "Liam", "Olivia", "Noah", "Ava", "William"};

    // Get the "nameIndex" attribute from the tuple
    uint32_t const nameIndex = tuple.getAttributeValue("nameIndex");

    // Get the name based on the nameIndex
    string name = names[nameIndex];

    // Use an external shared library to generate the greeting
    string str = MySample::MySampleClass::sayHello(name);

    // Set the generated greeting to the "hello" attribute in the tuple
    ValueHandle handle0 = tuple.getAttributeValue("hello");
    rstring & helloString = handle0;
    helloString = str;

    // Send the tuple along
    submit(tuple, 0);
    ```

1.  Select **File** > **Save** to save the changes to `MyCppOp_cpp.cgt`.

{% capture folder-structure-text %}

At this point, your C++ primitive operator folder should have the following structure:

```cpp
/+ MyCppProject
   /+ impl
      /+ include
         /+ MySampleLib.h
      /+ lib
      /+ src
         /+ MySampleLib.cpp
   /+ sample.hello
      /+ MyCppOp
         /+ MyCppOp.xml
         /+ MyCppOp_cpp.cgt
         /+ MyCppOp_cpp.pm
         /+ MyCppOp_h.cgt
         /+ MyCppOp_h.pm
   /+ Makefile
```

{% endcapture %}

<div class="notice">
  {{ folder-structure-text | markdownify }}
</div>

## Testing the C++ primitive operator

This section guides you through the steps of building your C++ primitive operator, creating a SPL application that invokes your operator, and then building and running the application to test your operator.

### Building the C++ primitive operator

This task demonstrates how to build the C++ primitive operator. This creates a toolkit that you can use in your SPL application.

1.  Right-click on the `MyCppOp_cpp.cgt` file and select **Build C++ Primitive Operator**.
1.  If you have multiple Streams instances, you will be prompted to select an instance.
1.  Check the notifications and build output to confirm that the primitive operator was built successfully. If it was successful, select the **Add Toolkit to Toolkit Path** button in the notification that appears. If you do not have a toolkit path specified, you will be prompted to specify a path. This makes the toolkit available for use in streaming applications.

### Creating the SPL application

This task demonstrates how to create a SPL application that invokes the C++ primitive operator.

1.  Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select **Create SPL Application**.
1.  Provide the following information:
    - **Application folder path**: Select an empty folder on your machine called `TestCppProject`. Example: `/Users/someuser/Documents/streams/TestCppProject`.
    - **Namespace**: Specify `sample.hello.test` as the namespace. Your main composite will be created in this namespace.
    - **Main composite name**: Specify `Main` as the name of your main composite.
1.  Add the toolkit as a dependency.
    1.  Open the toolkit information model file `info.xml`. This is located in the `TestCppProject` folder.
    1.  Locate the `<info:dependencies/>` element and replace it with the following code:
        ```xml
        <info:dependencies>
          <info:toolkit>
            <common:name>MyCppProject</common:name>
            <common:version>1.0.0</common:version>
          </info:toolkit>
        </info:dependencies>
        ```
1.  Edit the SPL source.

    1.  Open the SPL source file `Main.spl`. This is located in the `TestCppProject/sample.hello.test` folder.
    1.  Enter the following `use` directive at the beginning of the file after `namespace sample.hello.test;`:
        ```
        use sample.hello::MyCppOp;
        ```
    1.  Enter the following code for the `Main` composite (replace the starter code in between the curly braces):

        ```
        graph
          stream<rstring hello, uint32 nameIndex> InStream = Beacon() {
            logic
              state:
                mutable uint32 n = 0;
            param
              iterations: 6u;
            output
              InStream: hello = "", nameIndex = n++;
          }

          // Invoke the C++ primitive operator MyCppOp
          stream<InStream> Hello = MyCppOp(InStream) {}

          () as PrintHello = Custom(Hello) {
            logic
              onTuple Hello:
                println(hello);
          }
        ```

    1.  Select **File** > **Save** to save the changes to `Main.spl`.

### Building and running the SPL application

This task demonstrates how to build and run the SPL application to test your C++ primitive operator.

1.  Build and run the SPL application.
    1. Right-click on the `Main.spl` file and select **Build and Submit Job**.
    1. If you have multiple Streams instances, you will be prompted to select an instance.
    1. When the build completes successfully, you will be prompted to configure the job submission. Accept the defaults by clicking on the **Submit job** button.
    1. Check the notifications and submission output to confirm that the SPL application was submitted successfully. Take a note of the job ID.
1.  Verify that your C++ primitive operator is working as expected.
    1.  Bring up the Streams Explorer and locate the new job in the **Instances** section.
    1.  Hover over the job and click on the **Download Job Logs** button.
    1.  Select a folder on your machine where the job logs will be downloaded to.
    1.  Unpackage the job logs `.tar.gz` file and open the PE output file `pec.pe.<pe-id>.stdouterr`. This is located in `app-X/jobs/<job-id>`.
    1.  Verify that the output shows a series of `"Hello there, <name>"` messages.
        ```
        "Hello there, Emma"
        "Hello there, Liam"
        "Hello there, Olivia"
        "Hello there, Noah"
        "Hello there, Ava"
        "Hello there, William"
        ```
1.  After you have verified the result, cancel the running job.
    1.  Bring up the Streams Explorer and locate the job in the **Instances** section.
    1.  Hover over the job and click on the **Cancel Job** button.

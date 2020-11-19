---
title: 'SPL application guide'
permalink: /docs/spl-application-guide/
toc: true
toc_sticky: true
---

This guide demonstrates creating a [stream processing application](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/streaming_application_basics.html) written in [Streams Processing Language](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.splangref.doc/doc/spl-container.html) (SPL), including building and running the application.

## What will the application do?

This guide demonstrates how to create an existing sample application called `BusAlerts` that is available in [GitHub](https://github.com/IBMStreams/samples/tree/main/QuickStart/BusAlerts). We will be using the cached version of the application.

This application shows how you could create a smart advertising program to display alerts and ads in public transit buses in San Francisco. As buses move through the city, they will periodically report their current location to this application. When a bus is near a point of interest (POI), such as an area with a safety alert or a business with an advertisement, the application will detect this and send the alert.

For example, if a bus comes within 1 km of the Golden Gate Bridge, you want to display this message inside the bus: "Approaching Golden Gate Bridge, pedestrian bridge is closed."

Although the application retrieves cached bus location data from the [NextBus service](https://www.nextbus.com/), the alert system is not real, so the alerts for each bus will be printed.

```
Bus 1544:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
...
Bus 1471:sf-muni:nextbus is near Mission Dolores Park, message = Security incident near Mission Dolores Park, road and sidewalk closures in effect.
...
Bus 5611:sf-muni:nextbus is near Golden Gate Bridge, message = Approaching Golden Gate Bridge, pedestrian bridge is closed.
...
```

The data is processed in three main steps:

1. Ingest data about moving buses.
2. Use the data from step 1 to determine when a bus is near a POI.
3. Send an alert to the bus.

**Tip**: When you develop Streams applications, first break down the application into individual tasks, and then find one or more operators to perform each task.
{: .notice--info}

## Setting up the application

This section guides you through the steps of setting up the application to prepare for development.

### Creating the application

You can quickly create a minimal SPL application containing `.spl` and `info.xml` files.

1.  [Add your Streams instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}) to the Streams Explorer in VS Code if you haven't already.
1.  Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select **Create SPL Application**.
1.  In the panel that appears, specify the following:
    - **Application folder path**: Use the **Browse...** button to select an empty folder on your machine called `MyBusApp`. Example: `/Users/someuser/Documents/streams/BusApp`.
    - **Namespace**: Specify `my.name.space` as the namespace. You can use namespaces to organize your SPL code, similar to Python modules or Java packages.
    - **Main composite name**: Specify `BusAlerts` as the main composite name of the SPL application. Executable SPL applications are called main composites, and they are defined in SPL source files. These files have a `.spl` extension.
1.  Click on the **Create** button to create the SPL application.

The SPL application is created with the following structure:

```
/+ MyBusApp
   /+ my.name.space
      /+ BusAlerts.spl
   /+ info.xml
```

### Importing the data files

This application relies on data from two files:

- [`saved_BusLocations.txt`](https://raw.githubusercontent.com/IBMStreams/samples/main/QuickStart/BusAlerts/data/saved_BusLocations.txt): Cached bus location data.
- [`poi.csv`](https://raw.githubusercontent.com/IBMStreams/samples/main/QuickStart/BusAlerts/data/poi.csv): Points of interest.

Let's import them into the project.

1.  Create a folder called `data` in `MyBusApp`.
1.  Download the two data files and store them in the `data` folder.

The SPL application should have the following structure:

```
/+ MyBusApp
   /+ data
      /+ poi.csv
      /+ saved_BusLocations.txt
   /+ my.name.space
      /+ BusAlerts.spl
   /+ info.xml
```

### Updating the toolkit information model file

SPL applications are considered [toolkits](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkits.html), and an `info.xml` file describes a toolkit and any other toolkits it depends on.

**Important**: This file must be at the root of the application.
{: .notice--warning}

1.  Open the toolkit information model file `info.xml`. This is located in the `MyBusApp` folder.
1.  Add dependencies on the [`com.ibm.streamsx.datetime`](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$com.ibm.streamsx.datetime/tk$com.ibm.streamsx.datetime.html) and [`com.ibm.streams.geospatial`](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$com.ibm.streams.geospatial/tk$com.ibm.streams.geospatial.html) toolkits. Locate the `<info:dependencies/>` element and replace it with the following code:
    ```xml
    <info:dependencies>
      <info:toolkit>
        <common:name>com.ibm.streamsx.datetime</common:name>
        <common:version>[1.2.0,2.0.0)</common:version>
      </info:toolkit>
      <info:toolkit>
        <common:name>com.ibm.streams.geospatial</common:name>
        <common:version>[3.3.0,4.0.0)</common:version>
      </info:toolkit>
    </info:dependencies>
    ```
1.  Add the following code after the `</info:dependencies>` element:
    ```xml
    <info:sabFiles>
      <info:include path="data/**"/>
    </info:sabFiles>
    ```

{% capture info-xml-notice-text %}

**Tips**:

- The `info:identity` tag contains general details about the toolkit: name, description, version, and required Streams version.
- The `info:dependencies` tag lists any toolkits that the application requires.
- The `info:sabFiles` tag indicates which folders within the project contain files that your application will access at runtime.

{% endcapture %}

<div class="notice--info">
 {{ info-xml-notice-text | markdownify }}
</div>

Your `info.xml` file should look like the following:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<info:toolkitInfoModel xmlns:common="http://www.ibm.com/xmlns/prod/streams/spl/common" xmlns:info="http://www.ibm.com/xmlns/prod/streams/spl/toolkitInfo">
  <info:identity>
    <info:name>BusAlerts</info:name>
    <info:description />
    <info:version>1.0.0</info:version>
    <info:requiredProductVersion>4.3.0.0</info:requiredProductVersion>
  </info:identity>
  <info:dependencies>
    <info:toolkit>
      <common:name>com.ibm.streamsx.datetime</common:name>
      <common:version>[1.2.0,2.0.0)</common:version>
    </info:toolkit>
    <info:toolkit>
      <common:name>com.ibm.streams.geospatial</common:name>
      <common:version>[3.3.0,4.0.0)</common:version>
    </info:toolkit>
  </info:dependencies>
  <info:sabFiles>
    <info:include path="data/**" />
  </info:sabFiles>
</info:toolkitInfoModel>
```

### Adding `use` directives

In order to use functions, operators, and types from the `com.ibm.streamsx.datetime` and the `com.ibm.streams.geospatial` toolkits, add the following `use` directives at the top of the `BusAlerts.spl` file after the `namespace` declaration.

```scala
namespace my.name.space;

use com.ibm.streams.geospatial.st::*;
use com.ibm.streams.geospatial.ext::*;
use com.ibm.streamsx.datetime::*;
```

## Developing the application

This section guides you through the steps of developing the application.

### Operators overview

Remember, Streams applications are made up of [**operators**](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.splangref.doc/doc/operators_1.html). Each operator performs a specific task with an **input stream** of data and then produces an **output stream** that is the result of the processing.

The following code snippet is a generic template of the head of an operator invocation, with the name of the operator that processes the data and its input and output streams. Every operator in your application will follow this format.

- **Operator kind**: The type of the operator (e.g., `FileSource` or `Geofence`).
- **Operator name**: The name of the operator.
- **Input stream** _(optional)_: The stream of data to be processed by the operator.
- **Output stream** _(optional)_: The results of the operator’s action on the incoming data.
  - **Output stream schema**: Describes the content of each outgoing tuple.

```scala
OutputStream<OutputStreamSchema> OperatorName = OperatorKind(InputStream)
```

### Ingesting the data

Recall the three steps from the [What will the application do?](#what-will-the-application-do) section.

1. Ingest data about moving buses.
2. Use the data from step 1 to determine when a bus is near a POI.
3. Send an alert to the bus.

All Streams applications start with ingesting the data that will be analyzed. In this case, the data you are processing is the location of each bus as it is reported.

#### Reading the data files

There are two data files: one for bus locations and one for points of interest.

##### Bus locations

The saved bus locations are located in `data/saved_BusLocations.txt`.

```
"<?xml version=\"1.0\" encoding=\"utf-8\" ?> \n<body copyright=\"All data copyright San Francisco Muni 2018.\">\n<vehicle id=\"8217\" routeTag=\"19\" dirTag=\"19___I_F00\" lat=\"37.789494\" lon=\"-122.420441\" secsSinceReport=\"9\" predictable=\"true\" heading=\"345\" speedKmHr=\"3\"/>\n<vehicle id=\"8608\" routeTag=\"54\" dirTag=\"54___I_F00\" lat=\"37.7140119\" lon=\"-122.456078\" secsSinceReport=\"9\" predictable=\"true\" heading=\"0\" speedKmHr=\"26\"/>...
```

We need to convert the data in that file to a stream that can be consumed by our data processing operators. You’ll use a [`FileSource`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.adapter$FileSource.html) operator to create a stream that contains the data from the file. The code for this logic is as follows:

```scala
composite BusAlerts
{
  graph
    stream<xml locationXMLDoc> NextBusData_FromFile = FileSource()
    {
      param
        file: getApplicationDir() + "/data/saved_BusLocations.txt";
    }
}
```

Streams applications are directed graphs of connected operators, so the first line in the composite is a `graph` clause, which denotes the beginning of the application.

Next, you have the operator invocation, with the following properties:

- **Operator kind**: `FileSource` that reads data from a file.
- **Input stream**: There is no input stream because it is the start of our Streams application.
- **Output stream**: The output stream is `NextBusData_FromFile`, which is a stream of the lines in the input file.
- **Output stream schema**: Each tuple is a XML string from the data file, with the following format:
  ```xml
  <vehicle id="5764" routeTag="24" dirTag="24\_\_\_I_F00" lat="37.734356" lon="-122.390739" secsSinceReport="9" predictable="true" heading="218" speedKmHr="0"/>
  ```

##### Points of interest

The points of interest are located in `data/poi.csv`.

```
#POI name, Message to send, POI location in WKT, Required distance from POI
Golden Gate Bridge,"Approaching Golden Gate Bridge, pedestrian bridge is closed.","POINT (-122.46746489758902 37.79717439889875)"
"AT&T Park","If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!","POINT (-122.3914585 37.7785951)"
Mission Dolores Park,"Security incident near Mission Dolores Park, road and sidewalk closures in effect.","POINT (-122.4457047 37.7648361)"
"Fairview Mall","Parade on Yonge Street from 10am to 6pm, expect major delays.","POINT (-79.3463243 43.7770863)"
```

We need to convert the data in that file to a stream that can be consumed by our data processing operators. You’ll use a [`FileSource`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.adapter$FileSource.html) operator to create a stream that contains the data from the file. The code for this logic is as follows:

```scala
stream<POI_Type> POI_FromFile = FileSource()
{
  param
    file: getApplicationDir() + "/data/poi.csv";
    hasHeaderLine: true;
}
```

The `POI_FromFile` operator outputs tuples of type `POI_Type` that matches the format in the CSV file. The `POI_Type` type has the following definition:

```scala
type POI_Type = rstring POI_ID, rstring message, rstring locationWKT;
```

Enter the preceding line at the top of the file, right after the line `use com.ibm.streamsx.datetime::*;`.

#### Parsing the data

Now you have two streams of data coming from the `NextBusData_FromFile` and `POI_FromFile` operators that you are ready to process.

<figure>
  <img src="{{ "/assets/images/spl-application-guide/bus-alerts-graph-1.png" | relative_url }}" alt="BusAlerts application graph" title="BusAlerts application graph">
</figure>

The schema of the `POI_FromFile` stream is already in an acceptable format where each attribute describes an individual property of a POI. However, the schema of the `NextBusData_FromFile` stream contains a XML string from which the bus ID, latitude, and other information need to be extracted.

For this step, you will send the `NextBusData_FromFile` stream to an operator called `ParseNextBusData`. This operator is a special kind of operator called a _composite_ operator. It is called a composite operator because it is made up of multiple operators. It uses the [`XMLParse`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.XML$XMLParse.html) operator to parse the XML data. This guide will not cover how to create the `ParseNextBusData` operator. You will need to download the [ParseNextBusData.spl](https://raw.githubusercontent.com/IBMStreams/samples/main/QuickStart/BusAlerts/my.name.space/ParseNextBusData.spl) file and store it in the `my.name.space` folder.

The SPL application should have the following structure:

```
/+ MyBusApp
   /+ data
      /+ poi.csv
      /+ saved_BusLocations.txt
   /+ my.name.space
      /+ BusAlerts.spl
      /+ ParseNextBusData.spl
   /+ info.xml
```

Now you can invoke the `ParseNextBusData` operator to parse the bus location data from the `NextBusData_FromFile` stream.

```scala
stream<VehicleLocationType> ParsedDataStream = ParseNextBusData(NextBusData_FromFile)
{
  param
    agency: "sf-muni";
}
```

The `ParseNextBusData` operator outputs tuples of type `VehicleLocationType` that contains the individual attributes that describe the location of each bus. The `VehicleLocationType` type has the following definition:

```scala
type VehicleLocationType = tuple<rstring id, TimeMillis reportTime, float64 latitude, float64 longitude>
```

Enter the preceding line at the top of the file, right after the line `type POI_Type = ...`.

At this point, the application graph looks like the following:

<figure>
  <img src="{{ "/assets/images/spl-application-guide/bus-alerts-graph-2.png" | relative_url }}" alt="BusAlerts application graph" title="BusAlerts application graph">
</figure>

### Detecting when a bus is near a POI

The next step is to detect when a bus is within 1 km of any of the known POIs.

**Note**: the `Geofence` operator is designed to solve this exactly this type of problem, but for demonstration purposes, you can write the logic yourself.
{: .notice--info}

Even though Streams provides dozens of built-in operators, your unique needs might require you to write your own code. You can write your own code by using the [`Custom`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/op$spl.utility$Custom.html) operator. The `Custom` operator is, as the name implies, for custom code.

The operator stub for the detection logic is as follows:

```scala
stream<Alert> BusesToAlert = Custom(ParsedDataStream; POI_FromFile)
{
  logic
    onTuple POI_FromFile:
    {
      // Process POI
    }
    onTuple ParsedDataStream:
    {
      // A bus has just sent its location
      // Check its distance from the POIs and submit an alert if necessary
    }
}
```

Notice that there are _two_ **input streams**, the parsed stream of bus locations (`ParsedDataStream`) and the stream of POIs (`POI_FromFile`). When the operator detects that a bus is near the POI, it submits a tuple of type `Alert` to the **output stream**, `BusesToAlert`.

The `Alert` type contains the following information:

- `id`: The ID of the bus.
- `poi`: The name of the POI.
- `message`: The message to send to the bus.
- `distance`: The current computed distance from the POI.

The `Alert` type has the following definition:

```scala
type Alert = rstring id, rstring poi, rstring message, float64 distance;
```

Enter the preceding line at the top of the file, right after the line `type VehicleLocationType = ...`.

Next, add a `logic` clause to the `Custom` operator. The `logic` clause is executed on each tuple that is received by the operator. Since there are two input streams, you need two `onTuple` clauses. If the tuple is from the `POI_FromFile` stream, the code within the `onTuple POI_FromFile` clause is executed. Otherwise, the code within the `onTuple ParsedDataStream` clause is executed.

The full code for the detection logic is as follows:

```scala
stream<Alert> BusesToAlert = Custom(ParsedDataStream; POI_FromFile)
{
  logic
    state: // 1
    {
      // List of POIs
      mutable list<POI_Type> POIList = [ ];
      // Maximum distance from the POI
      float64 radius = 1500.0;
    }
    onTuple POI_FromFile:
    {
      // 2
      appendM(POIList, POI_FromFile);
    }
    onTuple ParsedDataStream:
    {
      // A bus has just sent its location
      // Convert the lat/lon to WKT
      rstring busWKT = point(longitude, latitude);
      for (POI_Type poi in POIList)
      {
        // 3
        float64 distanceFromPOI = distance(busWKT, poi.locationWKT);
        // 4
        if (distanceFromPOI <= radius)
        {
          // 5
          // Bus is near POI
          mutable Alert out = {};
          out.distance = distanceFromPOI;
          out.poi = poi.POI_ID;
          out.message = poi.message;
          // Copy input data to output
          assignFrom(out, ParsedDataStream);
          submit(out, BusesToAlert);
        }
      }
    }
}
```

The code is marked with numbers that indicate lines of interest:

1. The `state` clause is used to define two variables: a list to keep track of the known POIs and the maximum distance from the POI.
1. When the operator receives a tuple from the `POI_FromFile` stream, the tuple is added to the list.
1. When the operator receives a bus’ location, then for each POI, the distance function is used to compute the distance between the current location of the bus and the POI.
1. Check if the computed distance is within the predefined radius (1 km or 1,000 m).
1. If the bus is within the 1 km radius, create and send an alert tuple.

At this point, the application graph looks like the following:

<figure>
  <img src="{{ "/assets/images/spl-application-guide/bus-alerts-graph-3.png" | relative_url }}" alt="BusAlerts application graph" title="BusAlerts application graph">
</figure>

### Sending alerts

The last step is to send alerts. Use the [`printStringLn`](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.toolkits.doc/toolkits/dita/tk$spl/fc$spl.utility.html#spldoc_functions__printStringLn.T) function in another `Custom` operator to print the message to the screen.

```scala
() as AlertPrinter = Custom(BusesToAlert as In)
{
  logic
    onTuple BusesToAlert:
    {
      printStringLn("Bus " + id + " is near " + poi + ", message = " + message);
    }
}
```

The application is complete!

<figure>
  <img src="{{ "/assets/images/spl-application-guide/bus-alerts-graph-4.png" | relative_url }}" alt="BusAlerts application graph" title="BusAlerts application graph">
</figure>

### Complete application

The application in its entirety is as follows:

```scala
namespace my.name.space;

use com.ibm.streams.geospatial.st::*;
use com.ibm.streams.geospatial.ext::*;
use com.ibm.streamsx.datetime::*;

type POI_Type = rstring POI_ID, rstring message, rstring locationWKT;
type VehicleLocationType = tuple<rstring id, TimeMillis reportTime, float64 latitude, float64 longitude>;
type Alert = rstring id, rstring poi, rstring message, float64 distance;

composite BusAlerts
{
  graph
    stream<xml locationXMLDoc> NextBusData_FromFile = FileSource()
    {
      param
        file: getApplicationDir() + "/data/saved_BusLocations.txt";
    }

    stream<POI_Type> POI_FromFile = FileSource()
    {
      param
        file: getApplicationDir() + "/data/poi.csv";
        hasHeaderLine: true;
    }

    stream<VehicleLocationType> ParsedDataStream = ParseNextBusData(NextBusData_FromFile)
    {
      param
        agency: "sf-muni";
    }

    stream<Alert> BusesToAlert = Custom(ParsedDataStream; POI_FromFile)
    {
      logic
        state: // 1
        {
          // List of POIs
          mutable list<POI_Type> POIList = [ ];
          // Maximum distance from the POI
          float64 radius = 1500.0;
        }
        onTuple POI_FromFile:
        {
          // 2
          appendM(POIList, POI_FromFile);
        }
        onTuple ParsedDataStream:
        {
          // A bus has just sent its location
          // Convert the lat/lon to WKT
          rstring busWKT = point(longitude, latitude);
          for (POI_Type poi in POIList)
          {
            // 3
            float64 distanceFromPOI = distance(busWKT, poi.locationWKT);
            // 4
            if (distanceFromPOI <= radius)
            {
              // 5
              // Bus is near POI
              mutable Alert out = {};
              out.distance = distanceFromPOI;
              out.poi = poi.POI_ID;
              out.message = poi.message;
              // Copy input data to output
              assignFrom(out, ParsedDataStream);
              submit(out, BusesToAlert);
            }
          }
        }
    }

    () as AlertPrinter = Custom(BusesToAlert as In)
    {
      logic
        onTuple BusesToAlert:
        {
          printStringLn("Bus " + id + " is near " + poi + ", message = " + message);
        }
    }
}
```

### Key takeaways

From this basic application, here are a couple of things to notice:

#### `Custom` operators

`Custom` operators are an important part of Streams development to do quick tasks such as printing data to console for verification, or other tasks for which no operator exists.

The `BusesToAlert` operator demonstrated the following functionality:

- Using and iterating over a list
- Handling multiple input streams
- Submitting a tuple from a `Custom` operator

#### Source and sink operators

The `NextBusData_FromFile` and `POI_FromFile` operators do not take any input because they are **source operators**. They produce streams by reading data from external systems.

Conversely, the `AlertPrinter` operator does not produce any output because it is a **sink operator**. Sink operators usually send the results of a Streams application to an external system, such as another file, a database, or a messaging system.

#### Best practice: operator granularity

You might notice that the last two operators in the graph are both `Custom` operators. So you might wonder, why not print the alert in the first operator instead of sending the data to a new operator whose only job is to print the message?

The application uses two operators because it is good practice in Streams to keep operators simple by performing one task per operator. Separating the tasks improves performance because while one operator is performing the detection, the sink operator can spend time writing to the target system.

Learn about operator granularity and other Streams best practices in the [documentation](https://www.ibm.com/support/knowledgecenter/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/str_opgran.html).

## Running the application

This section guides you through the steps of building and running the application.

### Building and submitting the application

With the cloud-based development using VS Code, compilation and execution are all done in the cloud. You can build (compile) an SPL application by using the **Build** or **Build and Submit Job** commands.

- If you choose **Build**, the application is built and the resulting `.sab` (Streams Application Bundle) executable file is saved to the output folder of your project. You can then submit the `.sab` file to a Streams instance to run the application.
- If you choose **Build and Submit Job**, the application is built and run in the cloud.

For the purposes of this guide, we will be using the latter option.

1.  Right-click in the editor for the `BusAlerts.spl` file and select **Build and Submit Job**.
    <figure>
      <img src="{{ "/assets/images/spl-application-guide/bus-alerts-build.png" | relative_url }}" alt="Building the BusAlerts application" title="Building the BusAlerts application">
    </figure>
1.  If there are multiple Streams instances, you will be prompted to select a target instance.
1.  The build starts and as it progresses, notifications are displayed. Click on the **View Output** button to see detailed information about the build, including any errors that may arise.
    <figure>
      <img src="{{ "/assets/images/spl-application-guide/bus-alerts-build-success.png" | relative_url }}" alt="Successful build of the BusAlerts application" title="Successful build of the BusAlerts application">
    </figure>
1.  The next step is to submit the application to the Streams instance. The submission process will differ depending on the Streams version of the target instance. In this guide, we will use an [IBM Cloud Pak for Data 3.5 deployment]({{ site.doc.cloud_pak_for_data.general }}). You will be prompted to configure the job submission. Provide the values below and then click on the **Submit job** button.

    - **Job definition name**: The name of the job definition. Specify **BusAlerts**.
    - **Streams job name** _(optional)_: The name of the Streams job. Leave this blank.
    - **Application bundle file path**: The path to the application bundle file (`.sab`). This will be filled in with the path to your application bundle file. Leave this as is.
    - **Submission-time parameters**: Submission-time parameters are arguments that are specified at the time of application launch. This application does not have any submission-time parameters.

    **Note**: You can click on **Show all options** toggle for additional configuration properties. For example, you can import a [job configuration overlay file](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/dev_job_configuration_overlays.html).
    {: .notice--info}

    <figure>
      <img src="{{ "/assets/images/spl-application-guide/bus-alerts-submission-job-configuration.png" | relative_url }}" alt="Configuring the BusAlerts submission" title="Configuring the BusAlerts submission">
    </figure>

1.  The job is created and the job run starts. You can track the progress using the notifications that are displayed.

### Monitoring the running application

Once the job run has started successfully, you will have a few options:

- **Show Job Graph**: Opens the Streams [job graph]({{ "/docs/building-running-applications/#job-graph" | relative_url }}) for monitoring the job.
- **Open Streams Console**: Opens the [Streams Console]({{ "/docs/building-running-applications/#streams-console" | relative_url }}) in a web browser.
- **Open CPD Job Run Details**: Opens the Cloud Pak for Data job run details page in a web browser.

<figure>
  <img src="{{ "/assets/images/spl-application-guide/bus-alerts-submission-success.png" | relative_url }}" alt="Successful submission of the BusAlerts application" title="Successful submission of the BusAlerts application">
</figure>

Click on the **Show Job Graph** button to view the running job. For more information about using the job graph, see [Job graph]({{ "/docs/building-running-applications/#job-graph" | relative_url }}).

<figure>
  <img src="{{ "/assets/images/spl-application-guide/bus-alerts-job-graph.png" | relative_url }}" alt="BusAlerts job graph" title="BusAlerts job graph">
</figure>

### Viewing the application output

In the application, recall that we printed out the alerts in the `AlertPrinter` operator.

```scala
() as AlertPrinter = Custom(BusesToAlert as In)
{
  logic
    onTuple BusesToAlert:
    {
      printStringLn("Bus " + id + " is near " + poi + ", message = " + message);
    }
}
```

We can view this output by downloading the application trace logs for the job run.

1.  Bring up the [Streams Explorer]({{ "/docs/streams-explorer" | relative_url }}) by clicking on the IBM Streams icon <img src="{{ site.github_streams_icon }}" alt="IBM Streams icon" title="IBM Streams" class="editor-button"> on the side of VS Code.
1.  In the **Instances** section, find and click on the job run node in the target instance.
    <figure>
      <img src="{{ "/assets/images/spl-application-guide/streams-explorer-job-run.png" | relative_url }}" alt="BusAlerts job run" title="BusAlerts job run">
    </figure>
1.  Click on the <img src="{{ site.github_icon_prefix }}/camera.svg?raw=true" alt="Create Log Snapshot icon" title="Create Log Snapshot" class="editor-button"> icon that appears on the right to create a log snapshot.
1.  Once the snapshot has been created, expand the job run node and click on the **Application trace** node.
1.  Click on the <img src="{{ site.github_icon_prefix }}/document--download.svg?raw=true" alt="Download Job Run Log icon" title="Download Job Run Log" class="editor-button"> icon that appears on the right to download the log file.
    <figure>
      <img src="{{ "/assets/images/spl-application-guide/streams-explorer-job-run-log.png" | relative_url }}" alt="BusAlerts job run log" title="BusAlerts job run log">
    </figure>
1.  Choose a location on your local machine where the file should be saved. The file has a name with the format: `StreamsJobLogs-<instance_name>.job<job_id>-XXXXXXXXXXXXXX.tgz`.
1.  Extract the `.tgz` file and open the following file: **`app-<app-id>`** **>** **`jobs`** **>** **`<job_id>`** **>** **`pec.pe.<pe_id>.stdouterr`**.
1.  You should see the following alerts in the file:
    ```
    Bus 1544:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 5634:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1473:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1449:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1008:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 8904:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1430:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 8892:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 2035:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 5462:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 8871:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1471:sf-muni:nextbus is near Mission Dolores Park, message = Security incident near Mission Dolores Park, road and sidewalk closures in effect.
    Bus 5770:sf-muni:nextbus is near Mission Dolores Park, message = Security incident near Mission Dolores Park, road and sidewalk closures in effect.
    Bus 2037:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 5615:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1423:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 6715:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 7237:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1453:sf-muni:nextbus is near Mission Dolores Park, message = Security incident near Mission Dolores Park, road and sidewalk closures in effect.
    Bus 1490:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1444:sf-muni:nextbus is near Mission Dolores Park, message = Security incident near Mission Dolores Park, road and sidewalk closures in effect.
    Bus 1491:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 5611:sf-muni:nextbus is near Golden Gate Bridge, message = Approaching Golden Gate Bridge, pedestrian bridge is closed.
    Bus 8816:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 8809:sf-muni:nextbus is near Golden Gate Bridge, message = Approaching Golden Gate Bridge, pedestrian bridge is closed.
    Bus 1410:sf-muni:nextbus is near Mission Dolores Park, message = Security incident near Mission Dolores Park, road and sidewalk closures in effect.
    Bus 5486:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1448:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 6605:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 8751:sf-muni:nextbus is near Golden Gate Bridge, message = Approaching Golden Gate Bridge, pedestrian bridge is closed.
    Bus 1536:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 1464:sf-muni:nextbus is near AT&T Park, message = If the Giants win, show your game ticket to get a discount on a GetThere taxi after the game. Goo giants!
    Bus 8513:sf-muni:nextbus is near Mission Dolores Park, message = Security incident near Mission Dolores Park, road and sidewalk closures in effect.
    Bus 5517:sf-muni:nextbus is near Golden Gate Bridge, message = Approaching Golden Gate Bridge, pedestrian bridge is closed.
    ```

## Stopping the application

When you are finished with an application, stop it by clicking on the <img src="{{ site.github_icon_prefix }}/stop.svg?raw=true" alt="Cancel Job Run icon" title="Cancel Job Run Log" class="editor-button"> button on the job run node in the Streams Explorer.

**Important**: If you are using a Streaming Analytics service in IBM Cloud, avoid leaving an application running unnecessarily to avoid exceeding the free computation limit and incurring additional charges.
{: .notice--warning}

<figure>
  <img src="{{ "/assets/images/spl-application-guide/streams-explorer-job-run.png" | relative_url }}" alt="BusAlerts job run" title="BusAlerts job run">
</figure>

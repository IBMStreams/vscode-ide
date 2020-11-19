---
title: 'SPL application sets'
permalink: /docs/spl-application-sets/
toc: true
toc_sticky: true
---

A SPL application set is a XML file (`ApplicationSet_*.properties`) that references a collection of SPL applications. You can group a set of related SPL applications together and conveniently build and submit the related applications as a single unit. For example, this feature is especially useful when you are working with applications that export/import streams.

## Creating a SPL application set

### Procedure

1.  Bring up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and select **Create SPL Application Set**.
1.  In the panel that appears, specify the following:
    - **Location**: The location of the folder where you want to create the SPL application set.
    - **Name**: The name of the SPL application set.
1.  Click on the **Create** button to create the SPL application set.

<figure>
  <img src="{{ "/assets/images/spl-application-sets/create-spl-app-set.png" | relative_url }}" alt="Create a SPL Application Set" title="Create a SPL Application Set">
</figure>

### Results

The SPL application set is created as a `ApplicationSet_<name>.properties` file in the folder location you specified. It is a XML file with the following content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <comment>Application Set Definition</comment>
</properties>
```

## Adding a SPL application to a SPL application set

### Procedure

1.  Open a SPL application set.
1.  Right-click in the editor and select **Add SPL Application**.
1.  Select a SPL application. The application _must_ be one of the following file types: `*.spl`, `*.splmm`, or `Makefile`.
1.  Click on the **Add SPL application** button.

### Results

The selected SPL application is added to the SPL application set as a new `<entry>` node. Example:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
  <comment>Application Set Definition</comment>
  <entry key="applicationPath">/absolute/path/to/yournamespace1/YourComposite.spl</entry>
  <entry key="applicationPath">/absolute/path/to/yournamespace2/YourComposite.splmm</entry>
  <entry key="applicationPath">/absolute/path/to/yournamespace3/Makefile</entry>
</properties>
```

To remove a SPL application from the SPL application set, simply delete the `<entry>` node.

## Building and submitting SPL applications in a SPL application set

### Procedure

1.  Open a SPL application set.
1.  Right-click in the editor and select one of the following options:
    - **Build SPL Applications**: Build and download the application bundle(s) for each application.
    - **Build and Submit SPL Applications**: Submit each application to a Streams instance.
1.  If you have multiple Streams instances, you will be prompted to select an instance for each build.

### Results

All valid SPL applications included in the SPL application set are built. Applications that are not in the VS Code workspace are added.

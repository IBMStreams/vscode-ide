---
title: 'Commands'
permalink: /docs/commands/
toc: true
toc_sticky: true
---

The following commands can be executed via context menus and/or the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette).

## General commands

| Name                              | Description                                                                                                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add SPL Application               | Adds a SPL application to a SPL application set. Learn more [here]({{ "/docs/spl-application-sets/#adding-a-spl-application-to-a-spl-application-set"                                  | relative_url }}). |
| Build SPL Applications            | Builds SPL applications in a SPL application set. Learn more [here]({{ "/docs/spl-application-sets/#building-and-submitting-spl-applications-in-a-spl-application-set"                 | relative_url }}). |
| Build and Submit SPL Applications | Builds and submits SPL applications in a SPL application set. Learn more [here]({{ "/docs/spl-application-sets/#building-and-submitting-spl-applications-in-a-spl-application-set"     | relative_url }}). |
| Create SPL Application            | Creates a minimal SPL application containing a `.spl` file and an `info.xml` file. Learn more [here]({{ "/docs/developing-spl-applications/#creating-a-spl-application"                | relative_url }}). |
| Create SPL Application Set        | Creates a XML file (`ApplicationSet_*.properties`) that references a collection of SPL applications. Learn more [here]({{ "/docs/spl-application-sets/#creating-a-spl-application-set" | relative_url }}). |
| Create C++ Primitive Operator     | Creates a minimal C++ primitive operator. Learn more [here]({{ "/docs/developing-cpp-primitive-operators/#creating-a-c-primitive-operator"                                             | relative_url }}). |
| Create Java Primitive Operator    | Creates a minimal Java primitive operator. Learn more [here]({{ "/docs/developing-java-primitive-operators/#creating-a-java-primitive-operator"                                        | relative_url }}). |
| Remove Build Output Channels      | Removes build output channels that are automatically created in the OUTPUT panel after executing build commands.                                                                       |

## Build commands

{% include commands-build.html %}

## Environment commands

{% include commands-environment.html %}

## Streams Explorer commands

| Name              | Description                                            |
| ----------------- | ------------------------------------------------------ |
| Add Instance      | Add a Streams instance to the Streams Explorer.        |
| Remove Instances  | Remove a Streams instance from the Streams Explorer.   |
| Refresh Instances | Refresh the Streams instances in the Streams Explorer. |

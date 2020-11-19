---
title: 'FAQ'
permalink: /faq
toc: true
toc_sticky: true
---

Below you'll find answers to the most frequently asked questions about this extension.

## How do I import a project?

A project contains stream processing applications. An application is a collection of operators, all of which process streams of data. You may develop these applications in Visual Studio Code and run them in a Streams instance.

To import a project, refer to [Importing a project]({{ "/docs/quick-start-guide/#importing-a-project" | relative_url }}).

## How do I add a toolkit as an application dependency?

A SPL toolkit is a collection of artifacts that are organized into a package. A toolkit includes one or more namespaces, which contain the operators, functions, and types that are packaged as part of the toolkit, all of which can then be reused in other applications. Learn more about toolkits [here](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.dev.doc/doc/toolkits.html).

To add a toolkit dependency, refer to [Using a toolkit]({{ "/docs/using-toolkits#using-a-toolkit" | relative_url }}).

## How do I open the Streams Console?

The Streams Console is an integrated console that runs in your browser. You can use it to manage your instance and resources, configure security, and monitor jobs from a single location. Its sleek and efficient interface lets you quickly gain insights into the health, metrics, issues, and performance of your Streams instance.

1. Bring up the Streams Explorer by clicking on the IBM Streams icon <img src="{{ site.github_streams_icon }}" alt="IBM Streams icon" title="IBM Streams" class="editor-button"> on the side of VS Code.
1. Hover over an instance node and then click on the **Open IBM Streams Console** icon <img src="{{ site.github_icon_prefix }}/dashboard.svg?raw=true" alt="Open IBM Streams Console icon" title="Open IBM Streams Console" class="editor-button"> that appears on the right. This will open the Streams Console in your browser.

Learn more about using the Streams Console [here]({{ "/docs/building-running-applications/#streams-console" | relative_url }}).

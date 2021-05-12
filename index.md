---
title: "Home"
layout: splash
permalink: /
header:
  overlay_color: "#1593ba"
  actions:
    - label: "Install the extension"
      url: "https://marketplace.visualstudio.com/items?itemName=IBM.ibm-streams"
excerpt: "Build solutions that drive real-time business decisions by combining streaming and stored data with analytics with IBM Streams."
feature_row1:
  - image_path: /assets/images/index/streams-explorer.png
    alt: "Streams Explorer"
    title: "Streams Explorer"
    excerpt: "Easily manage your Streams instances and toolkits, and access helpful resources."
    url: "/docs/streams-explorer"
    btn_label: "Learn more"
    btn_class: "btn--primary"
feature_row2:
  - image_path: assets/images/index/develop-applications.png
    alt: "Develop applications"
    title: "Develop applications"
    excerpt: "Create Streams applications with [SPL](https://www.ibm.com/support/knowledgecenter/en/SSCRJU_5.3/com.ibm.streams.splangref.doc/doc/spl-container.html) language support included. Typical code editing features are supported, including content assist, code folding, etc."
    url: "/docs/developing-spl-applications"
    btn_label: "Learn more"
    btn_class: "btn--primary"
feature_row3:
  - image_path: /assets/images/index/build-applications-and-submit-jobs.png
    alt: "Build applications and submit jobs"
    title: "Build applications and submit jobs"
    excerpt: "Build your Streams applications and submit them directly to a Streams instance of your choice. If you already have Streams application bundles, you can submit those as well!"
    url: "/docs/building-running-applications"
    btn_label: "Learn more"
    btn_class: "btn--primary"
feature_row4:
  - image_path: /assets/images/index/job-graph.png
    alt: "Job graph"
    title: "Job graph"
    excerpt: "Visualize and monitor your Streams jobs. You can monitor metrics and flow rates, view flowing data, and much more!"
    url: "/docs/building-running-applications#job-graph"
    btn_label: "Learn more"
    btn_class: "btn--primary"
---

**Version Update**: There is a problem with the extension when running a vscode version 1.56.0 or above. Please use a version below that if a certification error appears when authenticating.

With the **IBM Streams** extension, you can work with the following Streams versions.

- [**IBM Cloud Pak for Data deployment**]({{ site.doc.cloud_pak_for_data.general }}): Delivers a platform for combining streaming and stored data with AI to build solutions that impact business decisions in real time.
- [**IBM Streams standalone deployment**]({{ site.doc.standalone.general }}) (on premises): Delivers a programming language and IDE for applications, a runtime system and analytic toolkits to speed development.
- [**IBM Streaming Analytics on IBM Cloud**]({{ site.doc.streaming_analytics.general }}): Offers most of the features of IBM Streams on an agile, cloud-based platform.

Get started by following the [Quick start guide](docs/quick-start-guide)!

<br>

{% include feature_row id="feature_row1" type="left" %}

{% include feature_row id="feature_row2" type="right" %}

{% include feature_row id="feature_row3" type="left" %}

{% include feature_row id="feature_row4" type="right" %}

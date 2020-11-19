---
title: 'Building edge applications'
permalink: /docs/building-edge-applications/
toc: true
toc_sticky: true
---

The Edge Analytics beta for IBM Cloud Pak for Data introduces the Edge Analytics service and an enhanced Streams service with development tools to enable users to develop and build edge analytic applications.

For more information, see [Moving analytics to the edge with Edge Analytics](https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/svc-edge/usage.html).

## Before you begin

Test the Streams application before you build it as an edge application. For example, you can run the application in the Cloud Pak for Data environment to ensure that it works as expected. After the job works as expected on the Cloud Pak for Data environment, you can build the application as an edge application.

## Procedure

1.  [Add your Streams 5.4.0 service instance]({{ "/docs/streams-explorer#adding-an-instance" | relative_url }}) (or above) to the Streams Explorer in VS Code if you haven't already.
1.  Right-click on a `.sab` file, `Makefile` file, or `.spl` file and select **Build Edge Application Image**.

    **Important**: If you select a `.sab` file, it must have been compiled against the Streams service for the Edge Analytics beta. Existing `.sab` files may not function properly if deployed as an edge application.
    {: .notice--warning}

1.  Follow the prompts to configure the build. Refer to the supported [build configuration properties](#build-configuration-properties). Then, submit the build.

<div class="notice--video">
  <p><strong>Watch and learn</strong>: This video demonstrates how to build an edge application.</p>
  <video class="tutorial-video" src="{{ site.videos.building_edge_applications.build_edge_application }}" controls></video>
</div>

## Results

After a build is complete, an edge application image with the specified image name and image tag is stored in the OpenShift internal registry. The image name and tag are used when you package your edge application image for deployment.

The fully qualified edge application image name has the following format, where curly braces `{}` indicate optional fields:

```
{image-registry-host/}{image-repository/}image-short-name
```

Specific information about the image can be found in the build output channel. Example:

```json
{
  "build": "https://cpd-url.com/streams-build/instances/sample-streams/yourNamespace/0",
  "id": "0",
  "imageDigest": "sha256:abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz01",
  "imageName": "your-image-name",
  "imagePrefix": "yourNamespace",
  "imageRegistry": "image-registry.openshift-image-registry.svc:5000",
  "imageTag": "your-image-tag",
  "name": "image-registry.openshift-image-registry.svc:5000/yourNamespace/yourImage: yourImageTag",
  "resourceType": "artifact",
  "restid": "0",
  "self": "https://cpd-url.com/streams-build/instances/sample-streams/yourNamespace/0/artifacts/0",
  "type": "streamsDockerImage"
}
```

The internal name of the default registry depends on the environment:

- OpenShift 3.11:
  ```
  docker-registry.default.svc:5000/project
  ```
- OpenShift 4.3:
  ```
  image-registry.openshift-image-registry.svc:5000/project
  ```

The default external route to the registry service depends on the environment:

- OpenShift 3.11:
  ```
  docker-registry-default.public_IP_of_the_machine.nip.io/project
  ```
  Where the _public_IP_of_the_machine_ is the IP address of the bastion node or the host that has access to the OpenShift cluster. The route is in the `default` project or namespace.
- OpenShift 4.3:
  ```
  default-route-openshift-image-registry.public_IP_of_the_machine.nip.io/project
  ```
  Where the _public_IP_of_the_machine_ is the IP address of the bastion node or the host that has access to the OpenShift cluster. The route is in the `openshift-image-registry` project or namespace.

## What to do next

Before you can deploy this edge application, you must either package it as:

- **An edge application package for IBM Cloud Pak for Data**: [Create a package](https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/svc-edge/usage-register-by-cpd.html) with an image reference of `{imageName}:{imageTag}`.
- **A service for IBM Edge Application Manager**: [Create a service](https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/svc-edge/usage-register-by-eam.html) where `my_image_short_name` is the `imageName`, and `my_tag` is the `imageTag`.

The image name (`imageName`) and image tag (`imageTag`) are the values provided during the build configuration and are displayed in the build output channel.

For more information, see [Packaging an Edge Analytics application or service for deployment](https://www.ibm.com/support/producthub/icpdata/docs/content/SSQNUZ_current/svc-edge/usage-register-app.html).

## Build configuration properties

Use build configuration properties in a JSON file to customize an edge application image build. Example:

```json
{
  "applicationBundles": [
    {
      "application": "sample.Main.sab"
    },
    {
      "application": "https://some.url.com/bundle",
      "applicationCredentials": {
        "user": "user",
        "password": "password",
        "bearerToken": "token"
      }
    }
  ],
  "baseImage": "image-registry.openshift-image-registry.svc:5000/imagePrefix/baseImageName:baseImageTag",
  "image": "image-registry.openshift-image-registry.svc:5000/imagePrefix/imageName:imageTag",
  "pipPackages": ["package-name-1", "package-name-2"],
  "rpms": ["rpm-name-1", "rpm-name-2"],
  "locales": ["en_US", "fr_FR"],
  "imageLabels": {
    "label1": "value1",
    "label2": "value2"
  }
}
```

| Property             | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applicationBundles` | Identifies one or more application bundles (`.sab`) that are to be included in the Docker image. An application can be a URL that can be used to download the application bundle or a relative path in the build archive (if one is provided).                                                                                                                                                                                                                                                                                                |
| `baseImage`          | Specifies the complete base image path instead of using all the individual pieces.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `buildArguments`     | Identifies arguments to be sent to the `Dockerfile`. This is only useful if you are providing your own `Dockerfile` in the build archive.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `defaultApplication` | Indicates what the default application in the image is if there are multiple application bundles (`.sab`). The value is the name of the `.sab` file without the `.sab` extension. Setting it to an application that is not built into the image or not setting it when there are multiple application bundles will cause the build to fail. If it is not set and there are no application bundles, the image will not have a default application. If it is not set and there is one application bundle, that application will be the default. |
| `image`              | Specifies the complete image path instead of using all the individual pieces.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `imageLabels`        | Identifies labels that are to be added to the image being created.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `locales`            | Identifies one or more locales that are to be included in the image. The first item in the list is the "default" locale. The locales are identified in the Java format: `<language>_<country>_<variant>`.                                                                                                                                                                                                                                                                                                                                     |
| `noCache`            | Indicates whether cache is turned off when building the image. The default value is: `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pipPackages`        | Identifies one or more Python install packages that are to be included in the image.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `rpms`               | Identifies one or more Linux RPM packages that are to be included in the image.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `squash`             | Indicates whether layers should be squashed in the final image. The default value is: `true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

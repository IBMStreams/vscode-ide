---
title: 'Troubleshooting'
permalink: /docs/troubleshooting/
---

<!-- Initializing problem -->

{% capture initializing-problem %}

The _Initializing SPL language features_ message in the [Status Bar](https://code.visualstudio.com/docs/getstarted/userinterface) at the bottom of VS Code does not go away after some time.

{% endcapture %}

{% capture initializing-try %}

Update the **Server: Mode** setting to `socket`. Refer to the [setting description]({{ "/docs/settings/" | relative_url }}) for important usage information.

{% endcapture %}

<!-- Features problem -->

{% capture features-problem %}

Certain features, such as content assist, are not working.

{% endcapture %}

{% capture features-try %}

Restart VS Code by bringing up the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and selecting **Reload Window**.

{% endcapture %}

<!-- Table -->

<table class="troubleshooting-table">
  <thead>
    <tr>
      <th>Problem</th>
      <th>Try</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        {{ initializing-problem | markdownify }}
        <figure>
          <img src="{{ "/assets/images/troubleshooting/initializingLanguageFeatures.gif" | relative_url }}" alt="Initializing SPL language features" title="Initializing SPL language features">
        </figure>
      </td>
      <td>{{ initializing-try | markdownify }}</td>
    </tr>
    <tr>
      <td>{{ features-problem | markdownify }}</td>
      <td>{{ features-try | markdownify }}</td>
    </tr>
  </tbody>
</table>

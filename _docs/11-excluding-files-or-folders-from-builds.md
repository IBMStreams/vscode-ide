---
title: 'Excluding files or folders from builds'
permalink: /docs/excluding-files-or-folders-from-builds/
---

To exclude files or folders when building a SPL application or toolkit, create a `.buildignore` file in the root of your SPL application or toolkit folder. `.buildignore` uses [gitignore](https://git-scm.com/docs/gitignore#_pattern_format) syntax. Each line in the file is a pattern that specifies file(s) or folder(s) to ignore during the build process.

The following patterns are ignored by default:

```
// Files
.buildignore
.classpath
.DS_Store
.project
toolkit.xml
*___bundle.zip
*.build*zip
*.sab
// Folders
___bundle
.apt_generated
.build*
.git
.settings
doc
opt/client
output
samples
```

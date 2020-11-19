# IBM Streams extension for Visual Studio Code

This is a [GitHub Pages](https://pages.github.com) site that contains documentation and guides for the [IBM Streams](https://marketplace.visualstudio.com/items?itemName=IBM.ibm-streams) extension for Visual Studio Code. It is based on the [Minimal Mistakes Jekyll theme](https://github.com/mmistakes/minimal-mistakes).

https://ibmstreams.github.io/vscode-ide/

## Setup instructions

### macOS

1.  Install [`rbenv`](https://github.com/rbenv/rbenv) via [Homebrew](https://brew.sh).
    ```
    brew install rbenv ruby-build
    ```
1.  Add `rbenv` to bash (`~/.zshrc`, `~/.bash_profile`, `~/.bashrc`, etc.) so that it loads every time you open a terminal. Open a new terminal session after adding the following.
    ```
    export PATH="$PATH:$HOME/.rbenv/bin"
    if which rbenv > /dev/null; then eval "$(rbenv init -)"; fi
    ```
1.  Install the latest [Ruby](https://www.ruby-lang.org/en/) version through `rbenv` and set it as the default.
    ```
    rbenv install 2.7.2
    rbenv global 2.7.2
    ```
1.  Install [Jekyll](https://jekyllrb.com).
    ```
    gem install bundler jekyll
    ```
1.  Install gems.
    ```
    bundle install
    ```
1.  Serve the site locally at http://127.0.0.1:4000.
    ```
    bundle exec jekyll serve
    ```

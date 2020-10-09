This is the repo for the Khameleon Project.

### Developing

* Make sure to disable cache in the browser debugging tools


## Contributing

To contribute to this repository, please read and follow these instructions.

Setup

* Fork this repository, so that all of your edits are private to your copy
* We recommend creating a branch for each feature or task that you are working on.  Once you are done, you can merge it into your fork's main branch
* When you have completed a feature, you may submit a pull request.


Pull Requests

* Code development should happen in a private fork.  Changes should not be directly pushed to master, but should be submitted as a pull request 
  * For instance, Eugene primarily uses the "wu" branch for development.
  * Github has a [nice interface](https://github.com/cudbg/khameleon-server/pulls) for creating new pull requests from a branch's most recent commits.
* When submitting a pull request, ensure there is at least one reviewer to look over and provide comments on the code.
* Strive to have small pull requests that contain the minimum number of new features/fixes/changes.  Massive pull requests are likely to be rejected.
* A quick checklist
  * [ ] Create an issue describing the contribution, how to use it, and perhaps some use cases.
  * [ ] Is the code is well commented and does it follow the coding style in the rest of the codebase?
  * [ ] The code is properly using existing APIs.  If the code changes APIs, first create an issue to propose an API change and achieve consensus.
  * [ ] Have you updated the appropriate READMEs or documentation?
  * [ ] If the PR is large, break it into several smaller pull requests

Communication

* Github Issues: We use github issues to track features/bugs that need to be addressed.   
  * Create a new issue when you notice a bug that cannot be immediately fixed, and before working on a feature.  Describe the context of the issue, the intended effects, and the design for how to address the issue, so that you can solicit feedback from the others.
  * Include the relevant pull requests 
* Slack: we use slack to coordinate and alert folks about updates on an issue.  
  * Since slack is not persistent, try not to use slack to make design decisions.  If you do, summarize the discussion in the relevant github issue.


## Khameleon Backend

khameleon backend implementation in Rust.

To start the server run:

$ make

The address for the server: localhost:8080


## API: 

Each application is encapsulated in an `app` struct which must implement the following AppTrait in src/apps/mod.rs

## Setting up

apt install cargo


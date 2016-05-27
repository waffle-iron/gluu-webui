[![Stories in Ready](https://badge.waffle.io/GluuFederation/gluu-webui.png?label=ready&title=Ready)](https://waffle.io/GluuFederation/gluu-webui)
# gluu-webui

[![Build Status](https://travis-ci.org/GluuFederation/gluu-webui.svg?branch=master)](https://travis-ci.org/GluuFederation/gluu-webui)

The Web UI for the Gluu Cluster REST API

> This should be run on the same server as [gluu-engine](https://github.com/GluuFederation/gluu-engine)

## Development

Start the development server using the following commands.

```bash
$ git clone https://github.com/GluuFederation/gluu-webui
$ cd gluu-webui
$ virtualenv env
$ source env/bin/activate
$ pip install -r requirements/dev.txt
$ python run.py
```

The Web UI should now be available at http://127.0.0.1:5000/

### Tests

The unit tests can be run for both the backend Python code

```bash
$ nosetests
```
and the front-end JavaScript AngularJS, install NodeJS

```bash
$ npm test # for a single run of all tests
$ npm run-script karma # to run the test-runner continuously
```

## Deployment

Refer installation docs at [Gluu Cluster Docs](http://www.gluu.org/docs-cluster/admin-guide/webui/#installation)

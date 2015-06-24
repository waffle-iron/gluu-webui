from nose.tools import assert_equal, with_setup
from mock import MagicMock

import gluuwebui
import requests

gluuwebui.app.config['TESTING'] = True
app = gluuwebui.app.test_client()

resources = ['/provider', '/cluster', '/node', '/license',
             '/license_credential']


def setup_empty_get():
    requests.get = MagicMock()
    requests.get.return_value.status_code = 200
    requests.get.return_value.json.return_value = {}


@with_setup(setup_empty_get)
def test_index():
    res = app.get('/')
    assert_equal(200, res.status_code)


def check_status(item):
    res = app.get(item)
    assert_equal(200, res.status_code)


@with_setup(setup_empty_get)
def test_resources_get():
    for item in resources:
        yield check_status, item


@with_setup(setup_empty_get)
def test_resource_with_id_get():
    for item in resources:
        yield check_status, item+"/some_id"

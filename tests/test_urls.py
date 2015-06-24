from nose.tools import assert_equal, assert_is_instance, with_setup
from mock import MagicMock

import gluuwebui
import requests
import json

gluuwebui.app.config['TESTING'] = True
app = gluuwebui.app.test_client()

resources = ['/provider', '/cluster', '/node', '/license',
             '/license_credential']

##############################################################################
#   Handling GET requests and ensuring all /resource /resource/id are answered


def setup_empty_get():
    """Mocks the API server by patching all GET requests with
     status_code=200, json() = {} response"""
    requests.get = MagicMock()
    requests.get.return_value.status_code = 200
    requests.get.return_value.json.return_value = {}


@with_setup(setup_empty_get)
def test_index():
    res = app.get('/')
    assert_equal(200, res.status_code)


def check_ok(item):
    res = app.get(item)
    assert_equal(200, res.status_code)


@with_setup(setup_empty_get)
def test_resources_get():
    """Tests gluuwebui responses for GET /resource and /resource/id and makes
    sure whenever the API server sents a 200, browser recieves a 200"""
    for item in resources:
        yield check_ok, item
        yield check_ok, item+"/some_id"

##############################################################################
#  Make sure whenever API returns error response, browser gets a 400 with msg


def mock_request_error():
    """Mocks the API server gets with a non-200 response"""
    requests.get = MagicMock()
    requests.get.return_value.status_code = 400


def check_error(item):
    res = app.get(item)
    assert_equal(res.status_code, 400)
    assert_is_instance(json.loads(res.data)['message'], unicode)


@with_setup(mock_request_error)
def test_error_page():
    """Tests that whenever the API server errors out, a status_code=400
    and json response with a message is sent to the browser"""
    for item in resources:
        yield check_error, item
        yield check_error, item+"/dummy_id"

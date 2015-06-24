from nose.tools import assert_equal, assert_is_instance, assert_in
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


def mock_get(code):
    """Mocks the API server by patching all GET requests with
     status_code=200, json() = {} response"""
    requests.get = MagicMock()
    requests.get.return_value.status_code = code
    if code == 200:
        requests.get.return_value.json.return_value = {}
    else:
        requests.get.return_value.json.return_value = {'message': 'MockError'}
    requests.get.return_value.reason = "Mock Reason"


def check_get_ok(item):
    res = app.get(item)
    assert_equal(200, res.status_code)


def check_get_error(item):
    res = app.get(item)
    assert_equal(res.status_code, 400)
    assert_is_instance(json.loads(res.data)['message'], unicode)


def test_resources_get():
    """Tests gluuwebui responses for GET /resource and /resource/id"""
    mock_get(200)
    check_get_ok('/')
    for item in resources:
        yield check_get_ok, item
        yield check_get_ok, item+"/some_id"

    mock_get(400)
    for item in resources:
        yield check_get_error, item
        yield check_get_error, item+"/dummy_id"


##############################################################################
#   Test POST requests to /resource returns a json
#   Success: resource_id or logfile, code 200
#   Failure: message, code 400


def mock_post(code):
    """Mocks API server POST response"""
    requests.post = MagicMock(name='post')
    requests.post.return_value.status_code = code
    if code == 204:
        requests.post.return_value.json.return_value = {'id': 'mock_id',
                                                        'log': '/tmp/mock.log'}
    else:
        requests.post.return_value.json.return_value = {'message': 'MockError'}
    requests.post.return_value.reason = "Mock Reason"


def check_post_success(item):
    p = app.post(item, data='{}')
    assert_equal(p.status_code, 200)
    if item == '/node':
        assert_is_instance(json.loads(p.data)['log'], unicode)
    else:
        assert_is_instance(json.loads(p.data)['id'], unicode)


def check_post_error(item):
    p = app.post(item, data="{}")
    assert_equal(p.status_code, 400)
    assert_is_instance(json.loads(p.data)['message'], unicode)


def test_resources_post():
    mock_post(204)
    for item in resources:
        yield check_post_success, item

    mock_post(400)
    for item in resources:
        yield check_post_error, item


##############################################################################
#   Check for static file redirects


def test_static_redirects():
    statics = ['js', 'css', 'img']
    for folder in statics:
        ro = app.get("/{0}/{1}".format(folder, 'somefile.ext'))
        assert_equal(ro.status_code, 302)


def test_templates():
    ro = app.get("templates/new_provider.html")  # existing file
    assert_equal(ro.status_code, 200)
    assert_in('form', ro.data)

    ro = app.get("templates/non_existant_file.html")
    assert_equal(ro.status_code, 200)
    assert_in('No such file or directory', ro.data)

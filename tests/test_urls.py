from nose.tools import *

import gluuwebui


gluuwebui.app.config['TESTING'] = True
app = gluuwebui.app.test_client()


def test_index():
    res = app.get('/')
    assert_equal(200, res.status_code)


def test_resources_get():
    resources = ['/provider', '/cluster', '/node', '/license',
                 '/license_credential']

    def check_status(item):
        res = app.get(item)
        assert_equal(200, res.status_code)

    for item in resources:
        yield check_status, item

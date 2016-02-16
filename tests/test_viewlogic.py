from nose.tools import assert_equal
from mock import MagicMock

import gluuwebui
import json

gluuwebui.app.config['TESTING'] = True
gluuwebui.app.config['NODE_LOG_LIST'] = './tests/data/nodelogs_sample.csv'
app = gluuwebui.app.test_client()

resources = ['/providers', '/clusters', '/nodes', '/license_keys']

##############################################################################
# Test for app.get(/dashboard)


def test_dashboard_get():
    """Test which verifies the data returned by the /dashboard call matches
    the API response data from gluuapi"""
    nodeData = [{'type': 'ldap', 'state': 'IN_PROGRESS'},
                {'type': 'httpd', 'state': 'SUCCESS'},
                {'type': 'httpd', 'state': 'SUCCESS'},
                {'type': 'oxtrust', 'state': 'DISABLED'},
                {'type': 'oxauth', 'state': 'FAILED'},
                {'type': 'nginx', 'state': 'FAILED'},
                {'type': 'nginx', 'state': 'SUCCESS'},
                {'type': 'oxidp', 'state': 'DISABLED'},
                {'type': 'ldap', 'state': 'DISABLED'}]
    providerData = [{'type': 'master'}, {'type': 'consumer'},
                    {'type': 'consumer'}]
    licenseData = [{'valid': True}, {'valid': False}, {'valid': True}]
    clusterData = [{}, {}, {}]

    returnData = {'nodes': nodeData, 'providers': providerData,
                  'license_keys': licenseData, 'clusters': clusterData}

    def choose_return_data(url):
        return returnData[url.split('/')[-1]]

    gluuwebui.views.api_get = MagicMock('api_get')
    gluuwebui.views.api_get.side_effect = choose_return_data

    res = json.loads(app.get('/dashboard').data)
    # check node data
    assert_equal(res['nodes']['count'], 9)
    assert_equal(res['nodes'],
                 {'count': 9,
                  'type': {'ldap': 2, 'httpd': 2, 'oxtrust': 1, 'oxauth': 1,
                           'nginx': 2, 'oxidp': 1},
                  'state': {'IN_PROGRESS': 1, 'SUCCESS': 3, 'DISABLED': 3,
                            'FAILED': 2}
                  })
    # check provider data
    assert_equal(res['providers'], {'count': 3,
                                    'type': {'master': 1, 'consumer': 2}})
    # check License data
    assert_equal(res['license_keys'], {'count': 3, 'type': {'valid': 2,
                                                            'invalid': 1}})
    # check cluster dat a
    assert_equal(res['clusters'], 3)


##############################################################################
#   Tests for other util functions

def test_clean_keystring():
    """Tests utility function clean_keystring from views.py"""
    fn = gluuwebui.views.clean_keystring

    assert_equal(fn('this has only spaces'), 'thishasonlyspaces')
    assert_equal(fn('this\nhas\nonly\nnew\nlines\n'), 'thishasonlynewlines')
    assert_equal(fn('this is \n+aKeyString'), 'thisis+aKeyString')


def test_generate_curl():
    fn = gluuwebui.views.generate_curl
    api = gluuwebui.app.config['API_SERVER_URL']

    cmd = fn('clusters', 'POST', data={'a': 'b'})
    assert_equal(cmd, "curl %s -X POST -d a='b'" % (api+'clusters'))

    cmd = fn('clusters', 'POST', data="a=b")
    assert_equal(cmd, "curl %s -X POST -d a=b" % (api+'clusters'))

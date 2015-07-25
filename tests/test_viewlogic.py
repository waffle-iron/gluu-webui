from nose.tools import assert_equal
from mock import MagicMock

import gluuwebui
import json

gluuwebui.app.config['TESTING'] = True
app = gluuwebui.app.test_client()

resources = ['/providers', '/clusters', '/nodes', '/licenses',
             '/license_keys']

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
                {'type': 'ldap', 'state': 'DISABLED'}]
    providerData = [{'type': 'master'}, {'type': 'consumer'},
                    {'type': 'consumer'}]
    licenseData = [{'valid': True}, {'valid': False}, {'valid': True}]
    clusterData = [{}, {}, {}]

    returnData = {'nodes': nodeData, 'providers': providerData,
                  'licenses': licenseData, 'clusters': clusterData}

    def choose_return_data(url):
        return returnData[url.split('/')[-1]]

    gluuwebui.views.api_get = MagicMock('api_get')
    gluuwebui.views.api_get.side_effect = choose_return_data

    res = json.loads(app.get('/dashboard').data)
    # check node data
    assert_equal(res['nodes']['count'], 6)
    assert_equal(res['nodes'],
                 {'count': 6,
                  'type': {'ldap': 2, 'httpd': 2, 'oxtrust': 1, 'oxauth': 1},
                  'state': {'IN_PROGRESS': 1, 'SUCCESS': 2, 'DISABLED': 2,
                            'FAILED': 1}
                  })
    # check provider data
    assert_equal(res['providers'], {'count': 3,
                                    'type': {'master': 1, 'consumer': 2}})
    # check License data
    assert_equal(res['licenses'], {'count': 3, 'type': {'valid': 2,
                                                        'invalid': 1}})
    # check cluster data
    assert_equal(res['clusters'], 3)

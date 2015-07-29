from nose.tools import assert_equal, assert_multi_line_equal
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
    assert_equal(res['license_keys'], {'count': 3, 'type': {'valid': 2,
                                                            'invalid': 1}})
    # check cluster dat a
    assert_equal(res['clusters'], 3)


##############################################################################
#   Tests related to the node deploy log handling

def test_get_node_log():
    """Tests for the get_node_log function that will return the proper logfile
    contents for the given nodename or a NOT found error msg"""

    get_node = gluuwebui.views.get_node_log

    log = get_node('node_name_1')
    assert_equal(log, 'INFO: Node name: node_name_1\n')

    log = get_node('node_name_2')
    expected = """another dummy log here for Node 2\nNothing fancy.\n"""
    assert_multi_line_equal(log, expected)

    log = get_node('node_name_3')
    expected = 'Could not find logfile for: node_name_3'
    assert_equal(log, expected)

    log = get_node('non existant node')
    expected = 'Could not find logfile for: non existant node'
    assert_equal(log, expected)

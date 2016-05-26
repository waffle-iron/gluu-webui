from nose.tools import assert_equal

import gluuwebui

gluuwebui.app.config['TESTING'] = True
gluuwebui.app.config['NODE_LOG_LIST'] = './tests/data/nodelogs_sample.csv'
app = gluuwebui.app.test_client()

resources = ['/providers', '/clusters', '/nodes', '/license_keys']

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

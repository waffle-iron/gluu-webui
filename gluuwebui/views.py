from gluuwebui import app
from flask import request, redirect, url_for, Response

import json
import requests
import os

api_base = app.config["API_SERVER_URL"]


class APIError(Exception):
    """Raise an exception whenever the API returns an error code"""
    def __init__(self, msg, code, reason, params=""):
        Exception.__init__(self)
        self.msg = msg
        self.code = code
        self.reason = reason
        self.params = params  # a dict of invalid parameters from API response

    def __str__(self):
        return "{0} API server returned Code: {1} Reason: {2} {3}".format(
            self.msg, self.code, self.reason, self.params)


@app.errorhandler(APIError)
def api_error(error):
    resp = dict({'message': str(error)})
    return Response(json.dumps(resp), status=400, mimetype="application/json")


def root_dir():  # pragma: no cover
    return os.path.abspath(os.path.dirname(__file__))


def get_file(filename):  # pragma: no cover
    try:
        src = os.path.join(root_dir(), filename)
        return open(src).read()
    except IOError as exc:
        return str(exc)


def api_get(req):
    try:
        r = requests.get(api_base + req)
        if r.status_code != 200:
            raise APIError('There was an issue fetching your data',
                           r.status_code, reason(r))
        return r.json()
    except requests.ConnectionError:
        raise APIError('No response from API Server', 500, 'Connection Error')


def api_post(req, data):
    """Function to send post requests to the API
    @param req (string) the resource name to request
    @param data (dict) the post form data as a dict from json
    """
    r = requests.post(api_base + req, data=data)
    if r.status_code > 210:
        try:
            params = r.json()['params']
            invalidParams = "=>  "+"    ".join("{0}: {1}".format(k, v)
                                               for k, v in params.items())
        except KeyError:
            invalidParams = ""
        raise APIError('Could not create a new {0}'.format(req),
                       r.status_code, reason(r), invalidParams)
    return r.json()


def reason(res):
    try:
        return res.json()['message']
    except (AttributeError, TypeError):
        return res.reason


def json_response(data, status=200):
    return Response(json.dumps(data), status=status,
                    mimetype="application/json")


@app.route("/")
def index():
    content = get_file('static/index.html')
    return Response(content, mimetype="text/html")


@app.route("/templates/<filename>")
def template(filename):
    content = get_file('static/templates/{0}'.format(filename))
    return Response(content, mimetype="text/html")


@app.route("/js/<filename>")
def js(filename):
    return redirect(url_for('static', filename="js/{0}".format(filename)))


@app.route("/css/<filename>")
def css(filename):
    return redirect(url_for('static', filename="css/{0}".format(filename)))


@app.route("/img/<filename>")
def img(filename):
    return redirect(url_for('static', filename="img/{0}".format(filename)))


@app.route("/nodes", methods=['GET', 'POST'])
def represent_node():
    if request.method == 'POST':  # Initiate create new node
        resp = api_post('nodes', json.loads(request.data))
        return Response(json.dumps(resp), 200, mimetype="application/json")

    resp = api_get("nodes")
    return json_response(resp)


@app.route("/providers", methods=['GET', 'POST'])
def represent_provider():
    if request.method == 'POST':  # Add new provider
        resp = api_post('providers', json.loads(request.data))
        return json_response(resp)

    resp = api_get('providers')
    return json_response(resp)


@app.route("/clusters", methods=['GET', 'POST'])
def represent_cluster():
    if request.method == 'POST':  # Add a new cluster
        resp = api_post('clusters', json.loads(request.data))
        return json_response(resp)

    resp = api_get('clusters')
    return json_response(resp)


def clean_keystring(key):
    '''Helper function to remove white spaces from the copy-pasted license
    keys in the webform'''
    return key.strip().replace('\n', '').replace(' ', '')


@app.route("/license_keys", methods=['GET', 'POST'])
def represent_keys():
    if request.method == 'POST':  # Add a new credential
        data = json.loads(request.data)
        data['public_key'] = clean_keystring(data['public_key'])
        resp = api_post('license_keys', data)
        return json_response(resp)

    res = api_get('license_keys')
    return json_response(res)


@app.route("/<resource>/<id>", methods=['GET', 'POST', 'DELETE'])
def give_resource(resource, id):
    if request.method == 'GET':
        resp = api_get("{0}/{1}".format(resource, id))
        return json_response(resp)

    elif request.method == 'POST':
        # For now only provider and license_credential have put requests
        if resource != 'providers' and resource != 'license_keys':
            data = {'message': 'Invalid resoure to update.'}
            return json_response(data, 400)

        url = api_base + "{0}/{1}".format(resource, id)
        newdata = json.loads(request.data)
        if 'id' in newdata.keys():
            del newdata['id']
        r = requests.put(url, data=newdata)
        if r.status_code != 200:
            raise APIError("The {0} with ID {1} couldnot be updated".format(
                           resource, id), r.status_code, reason(r))
        return json_response(r.json())

    elif request.method == 'DELETE':
        url = api_base + '{0}/{1}'.format(resource, id)
        if resource == 'nodes' and request.args.get('force_rm'):
            url += '?force_rm={0}'.format(request.args.get('force_rm'))
        r = requests.delete(url)
        if r.status_code != 204:
            raise APIError("The {0} with id {1} couldn't be deleted.".format(
                           resource, id), r.status_code, reason(r))
        data = {'message': 'Deleted {0} with id {1}'.format(resource, id)}
        return json_response(data)


@app.route('/dashboard')
def dashboard_data():
    """View that processess the cluster information and sends key metrics for
    the dashboard"""
    clusterData = api_get('clusters')
    nodeData = api_get('nodes')
    providerData = api_get('providers')
    licenseData = api_get('license_keys')

    # process and collect the nodes data
    nodetypes = {'ldap': 0, 'oxauth': 0, 'oxtrust': 0, 'httpd': 0, 'nginx': 0,
                 'oxidp': 0}
    nodestate = {'SUCCESS': 0, 'IN_PROGRESS': 0, 'FAILED': 0, 'DISABLED': 0}
    for node in nodeData:
        if node['type'] == 'ldap':
            nodetypes['ldap'] += 1
        if node['type'] == 'oxauth':
            nodetypes['oxauth'] += 1
        if node['type'] == 'oxtrust':
            nodetypes['oxtrust'] += 1
        if node['type'] == 'httpd':
            nodetypes['httpd'] += 1
        if node['type'] == 'nginx':
            nodetypes['nginx'] += 1
        if node['type'] == 'oxidp':
            nodetypes['oxidp'] += 1

        if node['state'] == 'SUCCESS':
            nodestate['SUCCESS'] += 1
        if node['state'] == 'IN_PROGRESS':
            nodestate['IN_PROGRESS'] += 1
        if node['state'] == 'FAILED':
            nodestate['FAILED'] += 1
        if node['state'] == 'DISABLED':
            nodestate['DISABLED'] += 1

    # Process and collec the providers data
    providertypes = {'master': 0, 'consumer': 0}
    for provider in providerData:
        if provider['type'] == 'master':
            providertypes['master'] += 1
        if provider['type'] == 'consumer':
            providertypes['consumer'] += 1

    # process and collect license data
    licensetypes = {'valid': 0, 'invalid': 0}
    for license in licenseData:
        if license['valid']:
            licensetypes['valid'] += 1
        else:
            licensetypes['invalid'] += 1

    dashboardData = {'clusters': len(clusterData),
                     'nodes': {
                         'count': len(nodeData),
                         'type': nodetypes,
                         'state': nodestate
                         },
                     'providers': {
                         'count':  len(providerData),
                         'type': providertypes
                         },
                     'license_keys': {
                         'count': len(licenseData),
                         'type': licensetypes
                         }
                     }
    return json_response(dashboardData)


@app.route('/node/log/<node_name>')
def get_deployment_log(node_name):
    """returns the log data for a node with node_name"""
    logfile = '/var/log/gluu/{0}-setup.log'.format(node_name)
    content = get_file(logfile)
    return Response(content, mimetype="text/html")

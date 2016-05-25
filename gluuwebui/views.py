from gluuwebui import app
from flask import request, redirect, url_for, Response

import json
import requests
import os
import datetime

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


def generate_curl(req, method, data=None):
    """Function that will generate a curl command for the input request object

    Params:
        req (requests.request) object for which curl command is to be generated

    Returns:
        command (string) - a string which forms the curl command of the request
    """
    command = "curl {uri} -X {method} -d {data}"
    uri = api_base + req
    if isinstance(data, dict):
        data_str = " -d ".join(["%s='%s'" % (k, v) for k, v in data.items()])
    else:
        data_str = str(data)

    return command.format(uri=uri, method=method, data=data_str)


def append_history(req, method, data, status):
    """Function that would append the command to the config-history.log file"""
    history = os.path.join(root_dir(), "static/config-history.log")
    with open(history, 'a') as logfile:
        dt = datetime.datetime.now()
        logfile.write(dt.strftime('%d %b %Y, %H:%M:%S\n'))
        logfile.write(generate_curl(req, method, data))
        logfile.write("\n")
        logfile.write("RESPONSE CODE: {0} \n".format(status))


def api_post(req, data):
    """Function to send post requests to the API
    @param req (string) the resource name to request
    @param data (dict) the post form data as a dict from json
    """
    r = requests.post(api_base + req, data=data)
    append_history(req, 'POST', data, r.status_code)
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


def api_delete(resource, id, forced=None):
    """Fucntion that sends the delete requests to the API.
    @param resource (string) the resource to request
    @param id (string) the id of the resource to be deleted
    """
    url = api_base + '{0}/{1}'.format(resource, id)
    if forced:
        url += "?force_rm={0}".format(forced)
    r = requests.delete(url)
    append_history(resource, 'DELETE', None, r.status_code)
    if r.status_code != 204:
        raise APIError("The {0} with id {1} couldn't be deleted.".format(
                       resource, id), r.status_code, reason(r))
    data = {'message': 'Deleted {0} with id {1}'.format(resource, id)}
    return data


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
    content = get_file('static/templates/index.html')
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


@app.route("/nodes", methods=['GET'])
@app.route("/nodes/<node_type>", methods=['GET', 'POST', 'DELETE'])
def represent_node(node_type=None):
    if request.method == 'POST':  # Initiate create new node
        resp = api_post('nodes/{0}'.format(node_type),
                        json.loads(request.data))
        return json_response(resp)
    elif request.method == 'DELETE':
        name = node_type  # node_type for a delete request actually has name
        resp = api_delete('nodes', name)
        return json_response(resp)

    if node_type:
        resp = api_get("nodes/{0}".format(node_type))
    else:
        resp = api_get("nodes")
    return json_response(resp)


@app.route("/providers", methods=['GET'])
@app.route("/providers/<driver>", methods=['GET', 'POST', 'DELETE'])
def represent_provider(driver=None):
    if request.method == 'POST':
        resp = api_post('providers/{0}'.format(driver),
                        json.loads(request.data))
        return json_response(resp)
    elif request.method == 'DELETE':
        pro_id = driver
        resp = api_delete('providers', pro_id)
        return json_response(resp)

    if driver:  # for GETthe driver acts as the id
        resp = api_get('providers/{0}'.format(driver))
    else:
        resp = api_get('providers')
    return json_response(resp)


@app.route("/clusters", methods=['GET', 'POST'])
@app.route("/clusters/<cluster_id>", methods=['GET', 'DELETE'])
def represent_cluster(cluster_id=None):
    if request.method == 'POST':
        resp = api_post('clusters', json.loads(request.data))
        return json_response(resp)
    elif request.method == 'DELETE':
        resp = api_delete('clusters', cluster_id)
        return json_response(resp)

    if cluster_id:
        resp = api_get('clusters/{0}'.format(cluster_id))
    else:
        resp = api_get('clusters')
    return json_response(resp)


@app.route('/containers', methods=['GET'])
@app.route('/containers/<ctype>', methods=['GET', 'POST', 'DELETE'])
def represent_containers(ctype=None):
    if request.method == 'POST':
        resp = api_post('containers/{0}'.format(ctype),
                        json.loads(request.data))
        return json_response(resp)
    elif request.method == 'DELETE':
        id = ctype  # for DELETE the ctype is the id
        force_rm = request.args.get('force_rm')
        resp = api_delete('containers', id, force_rm)
        return json_response(resp)

    if ctype:  # for GET ctype acts as the id
        resp = api_get('containers/{0}'.format(ctype))
    else:
        resp = api_get('containers')
    return json_response(resp)


def clean_keystring(key):
    '''Helper function to remove white spaces from the copy-pasted license
    keys in the webform'''
    return key.strip().replace('\n', '').replace(' ', '')


@app.route("/license_keys", methods=['GET', 'POST'])
@app.route("/license_keys/<lic_id>", methods=['GET', 'PUT', 'DELETE'])
def represent_keys(lic_id=None):
    if request.method == 'POST':  # Add a new credential
        data = json.loads(request.data)
        data['public_key'] = clean_keystring(data['public_key'])
        resp = api_post('license_keys', data)
        return json_response(resp)
    elif request.method == 'PUT':
        url = api_base + "license_keys/{0}".format(lic_id)
        newdata = json.loads(request.data)
        if 'id' in newdata.keys():
            del newdata['id']

        # Clean the License keys during update time too
        if 'public_key' in newdata:
            newdata['public_key'] = clean_keystring(newdata['public_key'])

        r = requests.put(url, data=newdata)
        if r.status_code != 200:
            raise APIError("License update failed for ID: {0}".format(lic_id),
                           r.status_code, reason(r))
        return json_response(r.json())
    elif request.method == 'DELETE':
        resp = api_delete('license_keys', lic_id)
        return json_response(resp)

    if lic_id:
        res = api_get('license_keys/{0}'.format(lic_id))
    else:
        res = api_get('license_keys')
    return json_response(res)


@app.route('/container_logs', methods=['GET'])
@app.route('/container_logs/<log_id>', methods=['GET', 'DELETE'])
@app.route('/container_logs/<log_id>/<action>', methods=['GET'])
def represent_container_logs(log_id=None, action=None):
    if request.method == 'DELETE':
        resp = api_delete('container_logs', log_id)
        return json_response(resp)

    if log_id and action:
        resp = api_get('container_logs/{0}/{1}'.format(log_id, action))
    elif log_id:
        resp = api_get('container_logs/{0}'.format(log_id))
    else:
        resp = api_get('container_logs')
    return json_response(resp)


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

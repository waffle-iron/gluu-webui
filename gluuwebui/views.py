from gluuwebui import app
from flask import request, redirect, url_for, Response

import json
import requests
import os

api_base = app.config["API_SERVER_URL"]


class APIError(Exception):
    """Raise an exception whenever the API returns an error code"""
    def __init__(self, msg, code, reason):
        Exception.__init__(self)
        self.msg = msg
        self.code = code
        self.reason = reason

    def __str__(self):
        return "{0} API server returned Code: {1} Reason: {2}".format(
            self.msg, self.code, self.reason)


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
    r = requests.get(api_base + req)
    if r.status_code != 200:
        raise APIError('There was an issue fetching your data',
                       r.status_code, reason(r))
    return r.json()


def api_post(req, data):
    """Function to send post requests to the API
    @param req (string) the resource name to request
    @param data (dict) the post form data as a dict from json
    """
    r = requests.post(api_base + req, data=data)
    if r.status_code > 210:
        raise APIError('Could not create a new {0}'.format(req),
                       r.status_code, reason(r))
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


@app.route("/node", methods=['GET', 'POST'])
def represent_node():
    if request.method == 'POST':  # Initiate create new node
        resp = api_post('node', json.loads(request.data))
        return Response(json.dumps(resp), 200, mimetype="application/json")

    resp = api_get("node")
    data = []
    for node in resp:
        provider = api_get('provider/{0}'.format(node['provider_id']))
        cluster = api_get('cluster/{0}'.format(node['cluster_id']))
        data.append({u'ID': node['id'],
                     u'Name': node['name'],
                     u'Type': node['type'],
                     u'IP': node['ip'],
                     u'Provider': "/".join([provider['type'],
                                           provider['hostname']]),
                     u'Cluster': cluster['name']})
    return json_response(data)


@app.route("/provider", methods=['GET', 'POST'])
def represent_provider():
    if request.method == 'POST':  # Add new provider
        resp = api_post('provider', json.loads(request.data))
        return json_response(resp)

    resp = api_get('provider')
    data = [{u'Host Name': provider['hostname'],
             u'Type': provider['type'],
             u'ID': provider['id']}
            for provider in resp]
    return json_response(data)


@app.route("/cluster", methods=['GET', 'POST'])
def represent_cluster():
    if request.method == 'POST':  # Add a new cluster
        resp = api_post('cluster', json.loads(request.data))
        return json_response(resp)

    resp = api_get('cluster')
    data = [{u'ID': cluster['id'],
             u'Name': cluster['name'],
             u'Organization': cluster['org_short_name'],
             u'City': cluster['city'],
             u'OX Cluster Host': cluster['ox_cluster_hostname'],
             u'Httpd Nodes': len(cluster['httpd_nodes']),
             u'LDAP Nodes': len(cluster['ldap_nodes']),
             u'OxAuth Nodes': len(cluster['oxauth_nodes']),
             u'OxTrust Nodes': len(cluster['oxtrust_nodes'])}
            for cluster in resp]
    return json_response(data)


@app.route("/license", methods=['GET', 'POST'])
def represent_license():
    if request.method == 'POST':  # Add a new license
        resp = api_post('license', json.loads(request.data))
        return json_response(resp)

    res = api_get('license')
    data = [{u'ID': lic['id'],
             u'Credential Name': api_get("license_credential/" +
                                         lic['credential_id'])['name'],
             u'Credential ID': lic['credential_id'],
             u'Code': lic['code'],
             u'Valid': lic['valid'],
             u'Metadata': lic['metadata']} for lic in res]
    return json_response(data)


@app.route("/license_credential", methods=['GET', 'POST'])
def represent_credential():
    if request.method == 'POST':  # Add a new credential
        resp = api_post('license_credential', json.loads(request.data))
        return json_response(resp)

    res = api_get('license_credential')
    data = [{u'Name': cred['name'],
             u'ID': cred['id'],
             u'Public Key': cred['public_key']}
            for cred in res]
    return json_response(data)


@app.route("/<resource>/<id>", methods=['GET', 'POST', 'DELETE'])
def give_resource(resource, id):
    if request.method == 'GET':
        resp = api_get("{0}/{1}".format(resource, id))
        return json_response(resp)

    elif request.method == 'POST':
        # For now only provider and license_credential have put requests
        if resource != 'provider' and resource != 'license_credential':
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
        r = requests.delete(api_base + '{0}/{1}'.format(resource, id))
        if r.status_code != 204:
            raise APIError("The {0} with id {1} couldn't be deleted.".format(
                           resource, id), r.status_code, reason(r))
        return json_response(r.json())

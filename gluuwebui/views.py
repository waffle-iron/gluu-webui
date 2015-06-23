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
                       r.status_code, r.reason)
    return r.json()


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


@app.route("/node")
def represent_node():
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
    return Response(json.dumps(data), status=200, mimetype='application/json')


@app.route("/provider")
def represent_provider():
    resp = api_get('provider')
    data = [{u'Host Name': provider['hostname'],
             u'Type': provider['type'],
             u'ID': provider['id']}
            for provider in resp]
    return Response(json.dumps(data), status=200, mimetype='application/json')


@app.route("/cluster")
def represent_cluster():
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
    return Response(json.dumps(data), status=200, mimetype='application/json')


@app.route("/license")
def represent_license():
    pass


@app.route("/license_credential")
def represent_credential():
    res = api_get('license_credential')
    data = [{u'Name': cred['name'],
             u'ID': cred['id'],
             u'Public Key': cred['public_key']}
            for cred in res]
    return Response(json.dumps(data), status=200, mimetype='application/json')


@app.route("/<resource>/<id>", methods=['GET', 'POST'])
def give_resource(resource, id):
    if request.method == 'GET':
        resp = api_get("{0}/{1}".format(resource, id))
        return Response(json.dumps(resp), status=200,
                        mimetype='application/json')

    # handling post requests with id => PUT in API
    # For now only provider and license_credential have put requests
    if resource != 'provider' and resource != 'license_credential':
        return Response(json.dumps({'msg': 'Invalid resource updata'}),
                        status=400, mimetype='application/json')

    url = api_base + "{0}/{1}".format(resource, id)
    newdata = json.loads(request.data)
    del newdata['id']
    r = requests.put(url, data=newdata)
    if r.status_code != 200:
        reason = r.reason
        if r.json()['message']:
            reason = r.json()['message']
        raise APIError("The {0} with ID {1} couldnot be updated".format(
                       resource, id), r.status_code, reason)
    return Response("Success", status=200)

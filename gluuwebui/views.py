from gluuwebui import app
from flask import render_template, request, flash, redirect, url_for, \
    Response

import json
import requests
import os

api_base = app.config["API_SERVER_URL"]


class APIError(Exception):
    """Raise an exception whenever the API returns an error code"""
    def __init__(self, msg, code, reason):
        self.msg = msg
        self.code = code
        self.msg = reason

    def __str__(self):
        return "{0} API server returned Code: {1} Reason: {2}".format(
            self.msg, self.code, self.reason)


@app.errorhandler(APIError)
def api_error(error):
    return error, 500


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
    data = []
    for provider in resp:
        data.append({u'Host Name': provider['hostname'],
                     u'Type': provider['type'],
                     u'ID': provider['id']})
    return Response(json.dumps(data), status=200, mimetype='application/json')


@app.route("/cluster")
def represent_cluster():
    resp = api_get('cluster')
    data = []
    for cluster in resp:
        data.append({u'ID': cluster['id'],
                     u'Name': cluster['name'],
                     u'Organization': cluster['org_short_name'],
                     u'City': cluster['city'],
                     u'OX Cluster Host': cluster['ox_cluster_hostname'],
                     u'Httpd Nodes': len(cluster['httpd_nodes']),
                     u'LDAP Nodes': len(cluster['ldap_nodes']),
                     u'OxAuth Nodes': len(cluster['oxauth_nodes']),
                     u'OxTrust Nodes': len(cluster['oxtrust_nodes'])
                     })
    return Response(json.dumps(data), status=200, mimetype='application/json')


@app.route("/license")
def represent_license():
    pass


@app.route("/license_credential")
def represent_credential():
    res = api_get('license_credential')
    data = []
    for cred in res:
        data.append({u'Name': cred['name'],
                     u'ID': cred['id'],
                     u'Public Key': cred['public_key']})
    return Response(json.dumps(data), status=200, mimetype='application/json')


def entity():
    """The function that does the API work and renders the page"""
    entity = request.url.split("/")[-1]
    url = api_base + entity

    if request.method == "GET":
        # call the API and get the list
        r = requests.get(url)
        if r.status_code != 200:
            raise APIError("Could not get the list of available {0}.".format(
                entity), r.status_code, r.json()['message'])
        return render_template("entity_status.html", data=r.json(),
                               entity=entity.title())

    elif request.method == "POST":
        # if it is a delete request then send DELETE to the api
        if 'deleteEntity' in request.form.keys():
            r = requests.delete(url + "/" + request.form["deleteEntity"])
            if r.status_code == 204:
                flash("The provider ID '" + request.form['deleteEntity'] +
                      "' was deleted successfully", 'success')
            else:
                flash("The provider could not be removed. Reason: {0}".format(
                    r.json()['message']), 'danger')
        # otherwise the post request is for creating a new provider
        else:
            r = requests.post(url, data=request.form)
            if r.status_code == 201:  # Created
                flash("Successfully added {0} with ID: {1}".format(entity,
                      r.json()['id']), 'success')
            elif r.status_code == 202:  # Accepted
                flash("You request to create new {0} is accepted.".format(
                    entity), 'info')
            else:
                flash("Sorry! the {0} wasn't added. Reason: {1}".format(entity,
                      r.json()['message']), 'danger')
        return redirect("/{0}".format(entity))


@app.route("/edit/<entity>/<id>", methods=['POST'])
def edit_entity(entity, id):
    url = api_base + entity + "/" + id
    r = requests.put(url, data=request.form)
    if r.status_code == 200:
        flash("The {0} with ID {1} was sucessfully updated.".format(entity,
              id), 'success')
    else:
        flash("Sorry! couldn't update the {0} with ID {1}".format(entity, id),
              'info')
    return redirect("/{0}".format(entity))

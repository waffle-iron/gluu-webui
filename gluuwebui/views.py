from gluuwebui import app
from flask import render_template, request, flash, redirect, url_for

import requests

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
    flash(error)
    return render_template("api_error.html")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/node")
def list_nodes():
    # TODO call the API and get the list
    return render_template("entity_list.html", name="Nodes")


@app.route("/provider", methods=['GET', 'POST'])
def list_providers():
    """Render a web page that will have a list of providers and their details
    listed. So this fucntion has to call GET /provider and then using the
    returned result to call /provider/<provider_id> for each id listed. Then
    pass the complete data to the template to render."""

    url = api_base+"provider"

    if request.method == "GET":
        # call the API and get the list
        r = requests.get(url)
        return render_template("provider.html", data=r.json())

    elif request.method == "POST":
        # if it is a delete request then send DELETE to the api
        if 'deleteProvider' in request.form.keys():
            r = requests.delete(url + "/" + request.form["deleteProvider"])
            if r.status_code == 204:
                flash("The provider ID '" + request.form['deleteProvider'] +
                      "' was deleted successfully", 'success')
            else:
                flash("The provider could not be removed. Reason: "+r.reason,
                      'danger')
        # otherwise the post request is for creating a new provider
        else:
            # TODO form validation as required
            r = requests.post(url, data=request.form)
            if r.status_code == 201:  # TODO improve response handling
                flash("Provider successfully added with ID: " + r.json()['id'],
                      'success')
            else:
                flash("Sorry! the provider was not added. Reason: " + r.reason,
                      'danger')
        return redirect(url_for('list_providers'))


@app.route("/cluster", methods=['GET', 'POST'])
def list_clusters():
    url = api_base+"cluster"
    if request.method == 'GET':
        r = requests.get(url)
        if r.status_code != 200:
            raise APIError("Could not obtain the list of clusters.",
                           r.status_code, r.reason)
        return render_template("clusters.html", data=r.json())

    elif request.method == 'POST':
        if 'deleteCluster' in request.form.keys():
            r = requests.delte(url + "/" + request.form['deleteCluster'])
            if r.status_code == 204:
                flash("Successfully removed the cluster with ID: {0}".format(
                    request.form['deleteCluster']), "success")
            else:
                flash("Couldn't delete the node you specified. API Server"
                      " Reason: {0}".format(r.json()['message']), "danger")
        else:
            r = requests.post(url, data=request.form)
            if r.status_code == 201:
                flash("Successfully created a new cluster with id {0}".format(
                      r.json()["id"]), "success")
            else:
                flash("Could not create a cluster. API Server Reason:{0}"
                      .format(r.json()['message']), "danger")
        return redirect(url_for('list_clusters'))

from gluuwebui import app
from flask import render_template, request, flash, redirect

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
    return render_template("interface.html")


@app.route("/node", methods=['GET', 'POST'])
@app.route("/provider", methods=['GET', 'POST'])
@app.route("/cluster", methods=['GET', 'POST'])
@app.route("/license", methods=['GET', 'POST'])
@app.route("/license_credential", methods=['GET', 'POST'])
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

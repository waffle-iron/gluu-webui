from gluuwebui import app
from flask import render_template

@app.route("/")
def index():
    return render_template( "index.html" )

@app.route("/node")
def list_nodes():
    # TODO call the API and get the list
    return render_template( "entity_list.html", name="Nodes" )

@app.route("/provider")
def list_providers():
    # TODO call the API and get the list
    return render_template( "entity_list.html", name="Providers" )

@app.route("/cluster")
def list_clusters():
    # TODO call the API and get the list
    return render_template( "entity_list.html", name="Clusters" )

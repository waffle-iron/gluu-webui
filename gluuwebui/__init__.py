"""The gluuwebui is a Flask application to manage Gluu Cluster using its API"""
from flask import Flask

app = Flask(__name__)


app.config['DEBUG'] = True
app.config['SECRET_KEY'] = "development key"
app.config['API_SERVER_URL'] = "http://127.0.0.1:8080/"
app.config['NODE_LOG_LIST'] = "nodelogs.csv"

import gluuwebui.views

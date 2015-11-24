"""The gluuwebui is a Flask application to manage Gluu Cluster using its API"""
from flask import Flask

app = Flask(__name__)
app.config.from_object('gluuwebui.config.ProductionConfig')

import gluuwebui.views

# gluu-webui
The Web UI for the Gluu Cluster REST API

> This should be run on the same server as [gluu-flask](https://github.com/GluuFederation/gluu-flask)

## Development

Start the development server using the following commands.

```
git clone https://github.com/GluuFederation/gluu-webui
cd gluu-webui
virtualenv env
source env/bin/activate
pip install -r requirements.txt
python run.py
```

The Web UI should now be available at http://127.0.0.1:5000/

## Deployment

__Apache2 with mod_wsgi__:

Install required tools
```
apt-get install apache2 python-setuptools libapache2-mod-wsgi git python-virtualenv
```

Get the app source and set up its run environment
```
cd /var/www/
git clone https://github.com/GluuFederation/gluu-webui
cd gluu-webui
virtualenv env
source env/bin/activate
pip install -r requirements.txt
```

Add the Apache2 configuration file and activate the site
```
cp config/gluuwebui_apache.conf /etc/apache2/sites-available/gluuwebui.conf
a2ensite gluuwebui
a2dissite 000-default
service apache2 reload
```

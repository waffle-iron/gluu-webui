activate_this = '/path/to/env/bin/activate_this.py'
execfile(activate_this, dict(__file__=activate_this))

import sys
path = '/path/to/gluu-webui/'
if path not in sys.path:
    sys.path.insert(0, path)

from gluuwebui import app as application


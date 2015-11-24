
class Config(object):
    DEBUG = False
    TESTING = False
    SECRET_KEY = 'secret_key'
    API_SERVER_URL = 'http://127.0.0.1:8080/'


class ProductionConfig(Config):
    SECRET_KEY = 'production_secret'


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True

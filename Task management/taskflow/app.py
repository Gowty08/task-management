from flask import Flask
from config import Config
from flask_pymongo import PyMongo
from flask_cors import CORS
import utils as utils_module

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, supports_credentials=True, origins="*")  # For dev; tighten in prod

    # attach utils and other modules so blueprints can import auth_required with access to app
    app.utils = utils_module
    app.pymongo = PyMongo(app)

    # import and register blueprints
    from auth import auth_bp, bcrypt as auth_bcrypt
    from tasks import tasks_bp
    # we already created bcrypt in auth.py; ensure it's configured to use the app
    auth_bcrypt.init_app(app)  # binds Bcrypt to current app

    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)

    # simple root
    @app.route('/')
    def index():
        return {"info": "TaskFlow API running"}

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)

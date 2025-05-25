from flask import Flask
from config import Config
from routes.user_routes import user_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Register blueprints
    # app.register_blueprint(admin_routes.admin_bp)
    app.register_blueprint(user_bp)

    return app
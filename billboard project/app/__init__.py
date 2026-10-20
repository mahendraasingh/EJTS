import os
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import DevelopmentConfig, Config

db = SQLAlchemy()

def create_app(config_class=DevelopmentConfig):
    """Application factory for Smart Billboard AI Analytics."""
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)

    # Ensure directories exist
    os.makedirs(app.config.get("INSTANCE_PATH", app.instance_path), exist_ok=True)
    os.makedirs(app.config.get("UPLOAD_FOLDER"), exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    CORS(app)

    # Register blueprints
    from app.routes.main import main_bp
    app.register_blueprint(main_bp)

    # Global error handlers
    @app.errorhandler(400)
    def bad_request(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Bad Request", "message": str(error)}), 400
        return f"<h1>400 Bad Request</h1><p>{error}</p>", 400

    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Not Found", "message": "The requested resource was not found."}), 404
        return f"<h1>404 Not Found</h1><p>The page requested could not be found.</p>", 404

    @app.errorhandler(413)
    def request_entity_too_large(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Payload Too Large", "message": "File exceeds maximum upload size (100MB)."}), 413
        return "<h1>413 Payload Too Large</h1>", 413

    @app.errorhandler(500)
    def internal_server_error(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred."}), 500
        return "<h1>500 Internal Server Error</h1>", 500

    return app

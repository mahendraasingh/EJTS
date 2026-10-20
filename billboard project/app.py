import os
from dotenv import load_dotenv
from app import create_app
from config import DevelopmentConfig, ProductionConfig

# Load environment variables if present
load_dotenv()

config_class = ProductionConfig if os.getenv("FLASK_ENV") == "production" else DevelopmentConfig
app = create_app(config_class)

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    
    print(f" * Starting Smart Billboard AI Analytics on http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)

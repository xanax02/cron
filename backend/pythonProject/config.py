import os
from pathlib import Path

class Config:
    # Flask Core Settings (Required)
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-for-prototype-only')  # For session security

    # Navigation Graph Settings (Custom for your prototype)
    GRAPH_DATA_PATH = str(Path(__file__).parent / 'graph_data.json')  # Optional: For saving/loading graph state

    # File Uploads (If needed for map images)
    UPLOAD_FOLDER = str(Path(__file__).parent / 'uploads')  # Directory for uploaded files
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}  # Allowed map image formats
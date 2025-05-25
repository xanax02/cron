from flask import Blueprint, request, jsonify
from services.path_service import PathService
from demo_data import init_demo_graph

user_bp = Blueprint('user', __name__, url_prefix='/api')
path_service = PathService(init_demo_graph())  # Initialize with demo data

@user_bp.route('/qr/lookup', methods=['GET'])
def lookup_qr():
    qr_id = request.args.get('qr_id')

    if not qr_id:
        return jsonify({"error": "Missing qr_id parameter"}), 400

    try:
        landmark = path_service.get_landmark(qr_id)
        return jsonify({"landmark": landmark}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404

@user_bp.route('/path', methods=['GET'])
def get_path():
    """
    Returns the shortest path between two points.
    Parameters:
    - start_qr: Starting QR code ID
    - end_landmark: Destination landmark name
    """
    start_qr = request.args.get('start_qr')
    end_landmark = request.args.get('end_landmark')

    if not start_qr or not end_landmark:
        return jsonify({"error": "Missing start_qr or end_landmark"}), 400

    try:
        path = path_service.get_shortest_path(start_qr, end_landmark)

        # Optional: Convert QR IDs to landmark names for readability
        path_landmarks = [
            path_service.get_landmark(qr_id) for qr_id in path
        ]

        return jsonify({
            "path": path,
            "landmarks": path_landmarks,
            "path_length": len(path)
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
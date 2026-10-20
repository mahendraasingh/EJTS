from flask import Blueprint, request, jsonify, current_app, send_from_directory
from app import db
from app.models import Advertisement, SystemEvent
from app.services.ad_service import save_media_file, create_ad, parse_iso_datetime

ads_bp = Blueprint("advertisements", __name__)

@ads_bp.route("/media/advertisements/<path:filename>")
def serve_media(filename):
    """Serve uploaded advertisement media files safely."""
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    return send_from_directory(upload_folder, filename)

@ads_bp.route("/api/advertisements", methods=["GET"])
def list_advertisements():
    """List all advertisements with optional category, active, and archive filters."""
    include_archived = request.args.get("include_archived", "false").lower() == "true"
    active_only = request.args.get("active_only", "false").lower() == "true"
    category = request.args.get("category")

    query = Advertisement.query
    if not include_archived:
        query = query.filter_by(is_archived=False)
    if active_only:
        query = query.filter_by(is_active=True)
    if category:
        query = query.filter_by(category=category)

    ads = query.order_by(Advertisement.order_index.asc(), Advertisement.created_at.desc()).all()
    return jsonify({
        "count": len(ads),
        "advertisements": [ad.to_dict() for ad in ads]
    }), 200

@ads_bp.route("/api/advertisements", methods=["POST"])
def add_advertisement():
    """Create a new advertisement campaign with media upload."""
    try:
        # Check if multipart form with file upload
        if "file" in request.files and request.files["file"].filename != "":
            file = request.files["file"]
            upload_folder = current_app.config["UPLOAD_FOLDER"]
            unique_name, media_type = save_media_file(file, upload_folder)
            
            name = request.form.get("name", "").strip() or file.filename.rsplit(".", 1)[0]
            description = request.form.get("description", "")
            category = request.form.get("category", "General")
            duration = int(request.form.get("duration", 10))
            is_active = request.form.get("is_active", "true").lower() in ["true", "1", "yes"]
            campaign_start = parse_iso_datetime(request.form.get("campaign_start"))
            campaign_end = parse_iso_datetime(request.form.get("campaign_end"))

        elif request.is_json:
            data = request.get_json() or {}
            name = data.get("name")
            description = data.get("description")
            category = data.get("category", "General")
            unique_name = data.get("media_filename")
            media_type = data.get("media_type", "image")
            duration = int(data.get("duration", 10))
            is_active = bool(data.get("is_active", True))
            campaign_start = parse_iso_datetime(data.get("campaign_start"))
            campaign_end = parse_iso_datetime(data.get("campaign_end"))
            if not unique_name:
                return jsonify({"error": "media_filename is required when JSON payload is provided."}), 400
        else:
            return jsonify({"error": "Invalid request. Provide multipart/form-data with 'file' or JSON payload."}), 400

        ad = create_ad(
            name=name,
            description=description,
            category=category,
            media_filename=unique_name,
            media_type=media_type,
            duration=duration,
            is_active=is_active,
            campaign_start=campaign_start,
            campaign_end=campaign_end
        )
        return jsonify({
            "message": "Advertisement created successfully.",
            "advertisement": ad.to_dict()
        }), 201

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create advertisement: {str(e)}"}), 500

@ads_bp.route("/api/advertisements/<int:ad_id>", methods=["GET"])
def get_advertisement(ad_id):
    """Retrieve details for a single advertisement including session counts."""
    ad = db.session.get(Advertisement, ad_id)
    if not ad:
        return jsonify({"error": "Advertisement not found."}), 404
    ad_dict = ad.to_dict()
    ad_dict["total_sessions"] = ad.sessions.count()
    return jsonify(ad_dict), 200

@ads_bp.route("/api/advertisements/<int:ad_id>", methods=["PUT"])
def update_advertisement(ad_id):
    """Update fields on an existing advertisement."""
    ad = db.session.get(Advertisement, ad_id)
    if not ad:
        return jsonify({"error": "Advertisement not found."}), 404
    data = request.get_json(silent=True) or {}

    if "name" in data and data["name"].strip():
        ad.name = data["name"].strip()
    if "description" in data:
        ad.description = data["description"]
    if "category" in data and data["category"].strip():
        ad.category = data["category"].strip()
    if "duration" in data:
        ad.duration = max(1, int(data["duration"]))
    if "is_active" in data:
        ad.is_active = bool(data["is_active"])
    if "order_index" in data:
        ad.order_index = int(data["order_index"])
    if "campaign_start" in data:
        ad.campaign_start = parse_iso_datetime(data["campaign_start"])
    if "campaign_end" in data:
        ad.campaign_end = parse_iso_datetime(data["campaign_end"])

    db.session.commit()
    SystemEvent.log("billboard", f"Updated advertisement '{ad.name}' (ID: {ad.id})")
    return jsonify({
        "message": "Advertisement updated successfully.",
        "advertisement": ad.to_dict()
    }), 200

@ads_bp.route("/api/advertisements/<int:ad_id>/activate", methods=["POST"])
def toggle_activation(ad_id):
    """Toggle or set the active status of an advertisement."""
    ad = db.session.get(Advertisement, ad_id)
    if not ad:
        return jsonify({"error": "Advertisement not found."}), 404
    data = request.get_json(silent=True) or {}
    
    if "is_active" in data:
        ad.is_active = bool(data["is_active"])
    else:
        ad.is_active = not ad.is_active

    db.session.commit()
    status_str = "activated" if ad.is_active else "deactivated"
    SystemEvent.log("billboard", f"Advertisement '{ad.name}' (ID: {ad.id}) {status_str}.")
    return jsonify({
        "message": f"Advertisement {status_str}.",
        "advertisement": ad.to_dict()
    }), 200

@ads_bp.route("/api/advertisements/<int:ad_id>", methods=["DELETE"])
def delete_advertisement(ad_id):
    """Soft-delete (archive) advertisement to preserve historical analytics."""
    ad = db.session.get(Advertisement, ad_id)
    if not ad:
        return jsonify({"error": "Advertisement not found."}), 404
    hard_delete = request.args.get("hard", "false").lower() == "true"

    if hard_delete and ad.sessions.count() == 0:
        db.session.delete(ad)
        action = "permanently deleted"
    else:
        ad.is_archived = True
        ad.is_active = False
        action = "archived"

    db.session.commit()
    SystemEvent.log("billboard", f"Advertisement '{ad.name}' (ID: {ad_id}) {action}.")
    return jsonify({"message": f"Advertisement {action} successfully.", "id": ad_id}), 200

@ads_bp.route("/api/advertisements/reorder", methods=["POST"])
def reorder_playlist():
    """Update order_index for a list of advertisements."""
    data = request.get_json(silent=True) or {}
    order_list = data.get("order", [])
    if not isinstance(order_list, list):
        return jsonify({"error": "Expected 'order' as a list of {id, order_index}."}), 400

    for item in order_list:
        ad_id = item.get("id")
        idx = item.get("order_index")
        if ad_id is not None and idx is not None:
            ad = db.session.get(Advertisement, ad_id)
            if ad:
                ad.order_index = int(idx)

    db.session.commit()
    return jsonify({"message": "Playlist order updated successfully."}), 200

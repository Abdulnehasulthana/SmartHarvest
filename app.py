from flask import Flask, render_template, request, jsonify
import pandas as pd
import joblib
import json
import os
import math
import logging
import re
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "crop_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "model", "label_encoder.pkl")
JSON_PATH = os.path.join(BASE_DIR, "data", "crops.json")

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

# Wide plausibility limits. These are not substitutes for local soil-test guidance.
INPUT_LIMITS = {
    "N": (0, 300), "P": (0, 300), "K": (0, 300),
    "temperature": (-10, 60), "humidity": (0, 100),
    "ph": (0, 14), "rainfall": (0, 1000)
}
MAX_CONTENT_LENGTH = 16 * 1024

app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def normalize_crop_name(name):
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


# Load model and encoder
if not os.path.isfile(MODEL_PATH):
    raise FileNotFoundError(f"Crop model file not found: {MODEL_PATH}")
if not os.path.isfile(ENCODER_PATH):
    raise FileNotFoundError(f"Label encoder file not found: {ENCODER_PATH}")

model = joblib.load(MODEL_PATH)
label_encoder = joblib.load(ENCODER_PATH)

if not hasattr(model, "predict") or not hasattr(model, "predict_proba"):
    raise TypeError("The saved crop model must support predict() and predict_proba().")
if not hasattr(label_encoder, "inverse_transform"):
    raise TypeError("Invalid label encoder: inverse_transform() is required.")
if hasattr(model, "n_features_in_") and model.n_features_in_ != len(FEATURES):
    raise ValueError("Model feature count does not match the seven application inputs.")

if hasattr(model, "feature_names_in_"):
    model_features = list(model.feature_names_in_)
    if set(model_features) != set(FEATURES):
        raise ValueError(f"Model feature mismatch: {model_features}")
    FEATURES = model_features

# Load crop metadata
if not os.path.isfile(JSON_PATH):
    raise FileNotFoundError(f"Crop metadata file not found: {JSON_PATH}")
with open(JSON_PATH, "r", encoding="utf-8") as file:
    crop_database = json.load(file)
if not isinstance(crop_database, dict):
    raise ValueError("crops.json must contain a JSON object.")

normalized_database = {
    normalize_crop_name(key): value for key, value in crop_database.items()
}


def validate_input(data):
    if not isinstance(data, dict):
        raise ValueError("Input must be a JSON object.")

    missing = [field for field in FEATURES if field not in data]
    if missing:
        raise ValueError("Missing required fields: " + ", ".join(missing))

    validated = {}
    for field in FEATURES:
        value = data[field]
        if isinstance(value, bool):
            raise ValueError(f"{field} must be numeric.")
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ValueError(f"{field} must contain a valid number.")
        if not math.isfinite(number):
            raise ValueError(f"{field} must be a finite number.")
        minimum, maximum = INPUT_LIMITS[field]
        if not minimum <= number <= maximum:
            raise ValueError(f"{field} must be between {minimum} and {maximum}.")
        validated[field] = number
    return validated


def get_crop_details(crop_name):
    details = normalized_database.get(normalize_crop_name(crop_name))
    if details is not None:
        return details
    return {
        "name": crop_name,
        "description": "Crop information unavailable.",
        "image": "/static/images/default.jpg",
        "season": "-", "harvest": "-", "soil_type": "-",
        "water_requirement": "-", "fertilizer": "-",
        "market_demand": "-", "temperature": "-", "humidity": "-",
        "ph": "-", "rainfall": "-", "suitable_regions": [],
        "common_uses": [], "growing_tips": []
    }


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/health")
def health():
    return jsonify({
        "status": "Running",
        "model": "Loaded",
        "total_crops": len(label_encoder.classes_),
        "recommendations_per_prediction": 5
    }), 200


@app.route("/predict", methods=["POST"])
def predict():
    try:
        if not request.is_json:
            return jsonify({"success": False, "error": "Please send data in JSON format."}), 415

        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"success": False, "error": "Invalid or empty JSON request."}), 400

        validated = validate_input(data)
        sample = pd.DataFrame([[validated[field] for field in FEATURES]], columns=FEATURES)

        # Probability columns follow model.classes_; decode those encoded class IDs.
        probability_row = np.asarray(model.predict_proba(sample), dtype=float)[0]
        model_classes = np.asarray(model.classes_)

        if len(probability_row) != len(model_classes):
            raise RuntimeError("Model probability columns do not match its classes.")
        if not np.all(np.isfinite(probability_row)):
            raise RuntimeError("Model returned invalid probability values.")

        ranked_indices = np.argsort(probability_row)[::-1][:5]
        recommendations = []

        for index in ranked_indices:
            encoded_class = int(model_classes[index])
            crop_name = str(label_encoder.inverse_transform([encoded_class])[0])
            score = round(float(probability_row[index]) * 100, 2)
            recommendations.append({
                "rank": len(recommendations) + 1,
                "crop": crop_name,
                "score": score,
                "details": get_crop_details(crop_name)
            })

        if not recommendations:
            raise RuntimeError("The model did not return any crop recommendations.")

        best = recommendations[0]
        return jsonify({
            "success": True,
            "recommended_crop": best["crop"],
            "confidence": best["score"],
            "details": best["details"],
            "recommendations": recommendations
        }), 200

    except ValueError as error:
        return jsonify({"success": False, "error": str(error)}), 400
    except Exception:
        logger.exception("Crop prediction failed.")
        return jsonify({
            "success": False,
            "error": "Prediction service encountered an error. Check the Flask terminal for details."
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "error": "Page not found."}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"success": False, "error": "HTTP method not allowed."}), 405


@app.errorhandler(413)
def request_too_large(error):
    return jsonify({"success": False, "error": "Request payload is too large."}), 413


if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    print("SmartHarvest API starting...")
    print("Model:", MODEL_PATH)
    print("Crop metadata:", JSON_PATH)
    app.run(host="127.0.0.1", port=5000, debug=debug_mode)

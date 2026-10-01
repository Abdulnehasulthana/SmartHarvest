from flask import Flask, render_template, request, jsonify
import pandas as pd
import joblib
import json
import os


# ==========================================================
# PATH CONFIGURATION
# ==========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "model",
    "crop_model.pkl"
)

ENCODER_PATH = os.path.join(
    BASE_DIR,
    "model",
    "label_encoder.pkl"
)

JSON_PATH = os.path.join(
    BASE_DIR,
    "data",
    "crops.json"
)


# ==========================================================
# FLASK APPLICATION
# ==========================================================

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)


# ==========================================================
# LOAD MACHINE LEARNING MODEL
# ==========================================================

try:
    model = joblib.load(MODEL_PATH)
    label_encoder = joblib.load(ENCODER_PATH)

    print("✅ Crop Recommendation Model Loaded")

except Exception as e:
    print(f"❌ Failed to load model: {e}")
    raise


# ==========================================================
# LOAD CROP DATABASE
# ==========================================================

try:
    with open(JSON_PATH, "r", encoding="utf-8") as file:
        crop_database = json.load(file)

    print(f"✅ Loaded {len(crop_database)} Crops")

except Exception as e:
    print(f"❌ Failed to load crops.json: {e}")
    raise


# ==========================================================
# HOME PAGE
# ==========================================================

@app.route("/")
def home():
    return render_template("index.html")


# ==========================================================
# HEALTH CHECK
# ==========================================================

@app.route("/health")
def health():
    return jsonify({
        "status": "Running",
        "model": "Loaded",
        "total_crops": len(crop_database)
    })


# ==========================================================
# PREDICTION API
# ==========================================================

@app.route("/predict", methods=["POST"])
def predict():

    try:

        # --------------------------------------------------
        # GET JSON DATA FROM FRONTEND
        # --------------------------------------------------

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "No input data received."
            }), 400


        # --------------------------------------------------
        # CHECK REQUIRED INPUTS
        # --------------------------------------------------

        required_fields = [
            "N",
            "P",
            "K",
            "temperature",
            "humidity",
            "ph",
            "rainfall"
        ]

        missing_fields = [
            field
            for field in required_fields
            if field not in data
        ]

        if missing_fields:
            return jsonify({
                "success": False,
                "error": (
                    "Missing input fields: "
                    + ", ".join(missing_fields)
                )
            }), 400


        # --------------------------------------------------
        # CONVERT INPUT VALUES TO FLOAT
        # --------------------------------------------------

        N = float(data["N"])
        P = float(data["P"])
        K = float(data["K"])

        temperature = float(data["temperature"])
        humidity = float(data["humidity"])

        ph = float(data["ph"])
        rainfall = float(data["rainfall"])


        # --------------------------------------------------
        # CREATE MODEL INPUT
        # --------------------------------------------------

        sample = pd.DataFrame([{
            "N": N,
            "P": P,
            "K": K,
            "temperature": temperature,
            "humidity": humidity,
            "ph": ph,
            "rainfall": rainfall
        }])


        # --------------------------------------------------
        # MACHINE LEARNING PREDICTION
        # --------------------------------------------------

        prediction = model.predict(sample)


        # --------------------------------------------------
        # CONVERT PREDICTION TO CROP NAME
        # --------------------------------------------------

        crop_name = label_encoder.inverse_transform(
            prediction
        )[0]


        # --------------------------------------------------
        # FIND CROP DETAILS
        # --------------------------------------------------

        crop_key = (
            str(crop_name)
            .lower()
            .replace(" ", "")
        )

        crop_details = crop_database.get(crop_key)


        # --------------------------------------------------
        # FALLBACK IF CROP DETAILS ARE NOT FOUND
        # --------------------------------------------------

        if crop_details is None:

            crop_details = {
                "name": str(crop_name),
                "description": (
                    "Detailed information for this crop "
                    "is currently unavailable."
                ),
                "image": "/static/images/default.jpg",

                "season": "-",
                "harvest": "-",
                "soil": "-",
                "water": "-",
                "fertilizer": "-",
                "market": "-",

                "temperature": "-",
                "humidity": "-",
                "ph": "-",
                "rainfall": "-",

                "suitable_regions": [],
                "common_uses": [],
                "growing_tips": []
            }


        # --------------------------------------------------
        # CALCULATE CONFIDENCE
        # --------------------------------------------------

        if hasattr(model, "predict_proba"):

            probability = model.predict_proba(sample)

            confidence = round(
                float(probability.max()) * 100,
                2
            )

        else:

            confidence = 95.0


        # --------------------------------------------------
        # RETURN RESULT
        # --------------------------------------------------

        return jsonify({

            "success": True,

            "recommended_crop": str(crop_name),

            "confidence": confidence,

            "details": crop_details

        })


    # ======================================================
    # HANDLE PREDICTION ERRORS
    # ======================================================

    except ValueError as e:

        return jsonify({
            "success": False,
            "error": (
                "Please enter valid numeric values "
                "for all fields."
            )
        }), 400


    except KeyError as e:

        return jsonify({
            "success": False,
            "error": (
                f"Missing required input: {str(e)}"
            )
        }), 400


    except Exception as e:

        print(f"❌ Prediction Error: {e}")

        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


# ==========================================================
# ERROR HANDLERS
# ==========================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({
        "success": False,
        "error": "Page Not Found"
    }), 404


@app.errorhandler(500)
def server_error(error):

    return jsonify({
        "success": False,
        "error": "Internal Server Error"
    }), 500


# ==========================================================
# LOCAL DEVELOPMENT
# ==========================================================

if __name__ == "__main__":

    print("=" * 60)
    print("🌱 SmartHarvest AI")
    print("=" * 60)

    print("Model     :", MODEL_PATH)
    print("Encoder   :", ENCODER_PATH)
    print("Crop JSON :", JSON_PATH)

    print("=" * 60)

    app.run(
        debug=True
    )
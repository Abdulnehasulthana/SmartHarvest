"""
Train and evaluate the SmartHarvest crop recommendation model.

Expected CSV columns:
N, P, K, temperature, humidity, ph, rainfall, label

Run from the project folder:
    python train_model.py

The script evaluates on a stratified hold-out test set, performs 5-fold
cross-validation on the development data, then fits the final model on all
available rows and saves model/crop_model.pkl and model/label_encoder.pkl.
"""
from pathlib import Path
import json
import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import LabelEncoder

BASE_DIR = Path(__file__).resolve().parent
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"
DATASET_CANDIDATES = [
    BASE_DIR / "Crop_recommendation.csv",
    BASE_DIR / "recommendation.csv",
    BASE_DIR / "data" / "Crop_recommendation.csv",
    BASE_DIR / "data" / "recommendation.csv",
]
MODEL_DIR = BASE_DIR / "model"


def find_dataset():
    for path in DATASET_CANDIDATES:
        if path.is_file():
            return path
    raise FileNotFoundError(
        "Dataset not found. Put Crop_recommendation.csv or recommendation.csv "
        "in the project root or data/ folder."
    )


def main():
    dataset_path = find_dataset()
    data = pd.read_csv(dataset_path)

    required = FEATURES + [TARGET]
    missing = [column for column in required if column not in data.columns]
    if missing:
        raise ValueError(f"Dataset is missing columns: {missing}")

    data = data[required].copy()
    data = data.dropna(subset=required)
    data[TARGET] = data[TARGET].astype(str).str.strip().str.lower()
    data = data.drop_duplicates()

    for column in FEATURES:
        data[column] = pd.to_numeric(data[column], errors="coerce")
    data = data.dropna(subset=FEATURES)

    if data[TARGET].nunique() < 2:
        raise ValueError("At least two crop classes are required.")

    X = data[FEATURES]
    encoder = LabelEncoder()
    y = encoder.fit_transform(data[TARGET])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    candidate = RandomForestClassifier(
        n_estimators=400,
        max_features="sqrt",
        min_samples_leaf=1,
        class_weight=None,
        random_state=42,
        n_jobs=-1
    )

    print(f"Dataset: {dataset_path}")
    print(f"Rows after cleaning: {len(data)}")
    print(f"Crop classes: {len(encoder.classes_)}")
    print(f"Training rows: {len(X_train)} | Test rows: {len(X_test)}")

    candidate.fit(X_train, y_train)
    predictions = candidate.predict(X_test)

    print("\n--- Hold-out test evaluation ---")
    print(f"Accuracy: {accuracy_score(y_test, predictions) * 100:.2f}%")
    print(f"Macro F1: {f1_score(y_test, predictions, average='macro') * 100:.2f}%")
    print("\nClassification report:")
    print(classification_report(
        y_test, predictions, target_names=encoder.classes_, zero_division=0
    ))
    print("Confusion matrix:")
    print(confusion_matrix(y_test, predictions))

    print("\n--- 5-fold cross-validation ---")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_result = cross_validate(
        candidate, X, y, cv=cv,
        scoring={"accuracy": "accuracy", "macro_f1": "f1_macro"},
        n_jobs=-1
    )
    print(
        f"Accuracy: {cv_result['test_accuracy'].mean() * 100:.2f}% "
        f"(std {cv_result['test_accuracy'].std() * 100:.2f}%)"
    )
    print(
        f"Macro F1: {cv_result['test_macro_f1'].mean() * 100:.2f}% "
        f"(std {cv_result['test_macro_f1'].std() * 100:.2f}%)"
    )

    # Save a final model trained on all cleaned rows.
    final_model = RandomForestClassifier(
        n_estimators=400,
        max_features="sqrt",
        min_samples_leaf=1,
        class_weight=None,
        random_state=42,
        n_jobs=-1
    )
    final_model.fit(X, y)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_model, MODEL_DIR / "crop_model.pkl")
    joblib.dump(encoder, MODEL_DIR / "label_encoder.pkl")

    metrics = {
        "dataset": dataset_path.name,
        "rows": int(len(data)),
        "classes": int(len(encoder.classes_)),
        "holdout_accuracy_percent": round(accuracy_score(y_test, predictions) * 100, 2),
        "holdout_macro_f1_percent": round(f1_score(y_test, predictions, average="macro") * 100, 2),
        "cv_accuracy_mean_percent": round(cv_result["test_accuracy"].mean() * 100, 2),
        "cv_accuracy_std_percent": round(cv_result["test_accuracy"].std() * 100, 2),
    }
    with open(MODEL_DIR / "evaluation_metrics.json", "w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)

    print("\nSaved:")
    print(MODEL_DIR / "crop_model.pkl")
    print(MODEL_DIR / "label_encoder.pkl")
    print(MODEL_DIR / "evaluation_metrics.json")
    print("\nNote: hold-out metrics describe the evaluated split; real-world farm performance may differ.")


if __name__ == "__main__":
    main()

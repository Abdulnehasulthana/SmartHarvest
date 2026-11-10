// ==========================================================
// SmartHarvest - Frontend JavaScript
// Top 5 Crop Recommendations
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("🌱 SmartHarvest Loaded Successfully");

    // Navbar shadow
    const navbar = document.querySelector(".navbar");
    if (navbar) {
        window.addEventListener("scroll", () => {
            navbar.style.boxShadow = window.scrollY > 30
                ? "0 10px 30px rgba(0, 0, 0, 0.15)"
                : "0 5px 20px rgba(0, 0, 0, 0.08)";
        });
    }

    // Scroll to top
    const topBtn = document.getElementById("topBtn");
    if (topBtn) {
        window.addEventListener("scroll", () => {
            topBtn.style.display = window.scrollY > 500 ? "block" : "none";
        });

        topBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    const form = document.getElementById("predictionForm");
    const predictBtn = document.querySelector(".predict-btn");

    if (!form) {
        console.error("Prediction form not found.");
        return;
    }

    // Existing result fields
    const cropName = document.getElementById("cropName");
    const cropDescription = document.getElementById("cropDescription");
    const cropImage = document.getElementById("cropImage");
    const confidence = document.getElementById("confidence");
    const confidenceUnit = document.getElementById("confidenceUnit");

    const fields = {
        season: "season",
        harvest: "harvest",
        soil_type: "soil",
        water_requirement: "water",
        fertilizer: "fertilizer",
        market_demand: "market",
        temperature: "temperatureRange",
        humidity: "humidityRange",
        ph: "phRange",
        rainfall: "rainfallRange"
    };

    const regions = document.getElementById("regions");
    const uses = document.getElementById("uses");
    const tipsList = document.getElementById("tipsList");

    const alternativesSection = document.getElementById("alternativesSection");
    const alternativesGrid = document.getElementById("alternativesGrid");

    const errorMessage = document.getElementById("errorMessage");

    function displayValue(value, fallback = "--") {
        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return fallback;
        }

        return value;
    }

    function displayArray(value, separator = ", ") {
        if (Array.isArray(value)) {
            const items = value.filter(item =>
                item !== null &&
                item !== undefined &&
                String(item).trim() !== ""
            );

            return items.length ? items.join(separator) : "--";
        }

        return displayValue(value);
    }

    function getInputValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : null;
    }

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.hidden = false;
        } else {
            alert(message);
        }
    }

    function clearError() {
        if (errorMessage) {
            errorMessage.textContent = "";
            errorMessage.hidden = true;
        }
    }

    // ======================================================
    // DISPLAY TOP 5 CROP RECOMMENDATIONS
    // ======================================================

    function renderAlternatives(recommendations) {
        if (!alternativesSection || !alternativesGrid) return;

        alternativesGrid.replaceChildren();

        if (!Array.isArray(recommendations) || recommendations.length === 0) {
            alternativesSection.hidden = true;
            return;
        }

        recommendations.slice(0, 5).forEach((item, index) => {

            const card = document.createElement("article");

            card.className =
                "alternative-card" +
                (index === 0 ? " best" : "");

            const rank = document.createElement("span");

            rank.className = "alternative-rank";

            rank.textContent = index === 0
                ? "Best match · Rank 1"
                : `Alternative · Rank ${index + 1}`;

            const name = document.createElement("h4");

            name.textContent = displayValue(
                item.crop,
                "Unknown crop"
            );

            const scoreRow = document.createElement("div");

            scoreRow.className = "alternative-score-row";

            const scoreLabel = document.createElement("span");

            scoreLabel.textContent = "Model score";

            const scoreValue = document.createElement("strong");

            const score = Number(item.score);

            scoreValue.textContent = Number.isFinite(score)
                ? `${score.toFixed(2)}%`
                : "Unavailable";

            const bar = document.createElement("div");

            bar.className = "alternative-bar";

            const fill = document.createElement("div");

            fill.className = "alternative-bar-fill";

            fill.style.width =
                `${Number.isFinite(score)
                    ? Math.max(0, Math.min(100, score))
                    : 0}%`;

            scoreRow.append(scoreLabel, scoreValue);

            bar.appendChild(fill);

            card.append(rank, name, scoreRow, bar);

            alternativesGrid.appendChild(card);
        });

        alternativesSection.hidden = false;
    }

    // ======================================================
    // UPDATE CROP DETAILS
    // ======================================================

    function updateCropDetails(details) {

        details = details || {};

        Object.entries(fields).forEach(([key, id]) => {

            const element = document.getElementById(id);

            if (element) {
                element.textContent = displayValue(details[key]);
            }
        });

        if (regions) {
            regions.textContent = displayArray(
                details.suitable_regions
            );
        }

        if (uses) {
            uses.textContent = displayArray(
                details.common_uses,
                " • "
            );
        }

        if (tipsList) {

            tipsList.replaceChildren();

            let tips = details.growing_tips;

            if (typeof tips === "string") {
                tips = [tips];
            }

            if (!Array.isArray(tips) || tips.length === 0) {
                tips = ["No growing tips available."];
            }

            tips
                .filter(tip =>
                    tip !== null &&
                    tip !== undefined &&
                    String(tip).trim()
                )
                .forEach(tip => {

                    const li = document.createElement("li");

                    li.textContent = String(tip);

                    tipsList.appendChild(li);
                });
        }
    }

    // ======================================================
    // PREDICTION FORM SUBMISSION
    // ======================================================

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        clearError();

        const inputData = {};

        const requiredFields = [
            "N",
            "P",
            "K",
            "temperature",
            "humidity",
            "ph",
            "rainfall"
        ];

        for (const id of requiredFields) {

            const raw = getInputValue(id);

            if (raw === null || raw === "") {
                showError(
                    "Please enter all soil and environmental values."
                );
                return;
            }

            const value = Number(raw);

            if (!Number.isFinite(value)) {
                showError(`Please enter a valid number for ${id}.`);
                return;
            }

            inputData[id] = value;
        }

        if (predictBtn) {
            predictBtn.disabled = true;

            predictBtn.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Predicting...';
        }

        try {

            const response = await fetch("/predict", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(inputData)
            });

            // Parse response even when server returns an error
            const result = await response.json().catch(() => ({}));

            if (
                !response.ok ||
                result.success === false ||
                result.error
            ) {
                throw new Error(
                    result.error ||
                    `Server error (${response.status}).`
                );
            }

            if (!result.recommended_crop || !result.details) {
                throw new Error(
                    "The server returned an incomplete prediction response."
                );
            }

            // Main recommended crop
            if (cropName) {
                cropName.textContent = result.recommended_crop;
            }

            // Crop description
            if (cropDescription) {
                cropDescription.textContent = displayValue(
                    result.details.description,
                    "Crop information is available below."
                );
            }

            // Confidence score
            const confidenceValue = Number(result.confidence);

            if (
                confidence &&
                result.confidence !== null &&
                result.confidence !== undefined &&
                Number.isFinite(confidenceValue)
            ) {

                confidence.textContent =
                    confidenceValue.toFixed(2);

                if (confidenceUnit) {
                    confidenceUnit.hidden = false;
                }

            } else {

                if (confidence) {
                    confidence.textContent = "Unavailable";
                }

                if (confidenceUnit) {
                    confidenceUnit.hidden = true;
                }
            }

            // Crop image
            if (cropImage) {

                cropImage.src = displayValue(
                    result.details.image,
                    "/static/images/default.jpg"
                );

                cropImage.alt =
                    `${result.recommended_crop} image`;
            }

            // Update crop information
            updateCropDetails(result.details);

            // Display Top 5 recommendations
            renderAlternatives(result.recommendations);

            // Scroll to results
            const resultSection =
                document.getElementById("resultSection");

            if (resultSection) {
                resultSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            console.log(
                "✅ Prediction successful:",
                result.recommended_crop
            );

        } catch (error) {

            console.error("❌ Prediction Error:", error);

            showError(
                error.message ||
                "Prediction failed. Please try again."
            );

        } finally {

            if (predictBtn) {

                predictBtn.disabled = false;

                predictBtn.innerHTML =
                    '<i class="fa-solid fa-seedling"></i> Predict Best Crop';
            }
        }
    });

    // ======================================================
    // FADE-IN ANIMATION
    // ======================================================

    if ("IntersectionObserver" in window) {

        const observer = new IntersectionObserver(
            (entries) => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {
                        entry.target.classList.add("show");
                    }
                });

            },
            { threshold: 0.15 }
        );

        document.querySelectorAll(
            ".detail-card, .condition-card, .workflow-card, .dataset-card, .tips-card, .result-card"
        ).forEach(element => observer.observe(element));
    }

    // ======================================================
    // IMAGE FALLBACK
    // ======================================================

    if (cropImage) {

        cropImage.addEventListener("error", () => {

            if (!cropImage.src.includes("default.jpg")) {
                cropImage.src = "/static/images/default.jpg";
            }
        });
    }

    // ======================================================
    // ENTER KEY SUPPORT
    // ======================================================

    document.querySelectorAll(
        "#predictionForm input"
    ).forEach(input => {

        input.addEventListener("keydown", event => {

            if (event.key === "Enter") {

                event.preventDefault();

                form.requestSubmit();
            }
        });
    });

    console.log(
        "%c🌱 SmartHarvest Ready!",
        "color:green;font-size:18px;font-weight:bold;"
    );

});

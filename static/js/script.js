// ==========================================================
// SmartHarvest
// Frontend JavaScript
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🌱 SmartHarvest Loaded Successfully");


    // ==========================================================
    // Navbar Shadow
    // ==========================================================

    const navbar = document.querySelector(".navbar");

    if (navbar) {
        window.addEventListener("scroll", () => {

            if (window.scrollY > 30) {
                navbar.style.boxShadow =
                    "0 10px 30px rgba(0, 0, 0, 0.15)";
            } else {
                navbar.style.boxShadow =
                    "0 5px 20px rgba(0, 0, 0, 0.08)";
            }

        });
    }


    // ==========================================================
    // Scroll To Top Button
    // ==========================================================

    const topBtn = document.getElementById("topBtn");

    if (topBtn) {

        window.addEventListener("scroll", () => {

            if (window.scrollY > 500) {
                topBtn.style.display = "block";
            } else {
                topBtn.style.display = "none";
            }

        });


        topBtn.addEventListener("click", () => {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        });

    }


    // ==========================================================
    // Form Elements
    // ==========================================================

    const form =
        document.getElementById("predictionForm");

    const predictBtn =
        document.querySelector(".predict-btn");


    if (!form) {

        console.error(
            "Prediction form not found."
        );

        return;
    }


    // ==========================================================
    // Result Elements
    // ==========================================================

    const cropName =
        document.getElementById("cropName");

    const cropDescription =
        document.getElementById("cropDescription");

    const cropImage =
        document.getElementById("cropImage");

    const confidence =
        document.getElementById("confidence");


    // ==========================================================
    // Crop Details
    // ==========================================================

    const season =
        document.getElementById("season");

    const harvest =
        document.getElementById("harvest");

    const soil =
        document.getElementById("soil");

    const water =
        document.getElementById("water");

    const fertilizer =
        document.getElementById("fertilizer");

    const market =
        document.getElementById("market");

    const regions =
        document.getElementById("regions");

    const uses =
        document.getElementById("uses");


    // ==========================================================
    // Growing Conditions
    // ==========================================================

    const temperatureRange =
        document.getElementById("temperatureRange");

    const humidityRange =
        document.getElementById("humidityRange");

    const phRange =
        document.getElementById("phRange");

    const rainfallRange =
        document.getElementById("rainfallRange");


    // ==========================================================
    // Growing Tips
    // ==========================================================

    const tipsList =
        document.getElementById("tipsList");


    // ==========================================================
    // Helper Function
    // ==========================================================

    function displayValue(value, defaultValue = "--") {

        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return defaultValue;
        }

        return value;
    }


    // ==========================================================
    // Array Display Helper
    // ==========================================================

    function displayArray(value, separator = ", ") {

        if (Array.isArray(value)) {

            const filteredValues = value.filter(
                item =>
                    item !== null &&
                    item !== undefined &&
                    String(item).trim() !== ""
            );

            if (filteredValues.length === 0) {
                return "--";
            }

            return filteredValues.join(separator);
        }

        return displayValue(value);
    }


    // ==========================================================
    // Collect Input Values
    // ==========================================================

    function getInputValue(id) {

        const element =
            document.getElementById(id);

        if (!element) {
            return null;
        }

        return element.value.trim();
    }


    // ==========================================================
    // Prediction Form Submit
    // ==========================================================

    form.addEventListener("submit", async (event) => {

        event.preventDefault();


        // ======================================================
        // Read Input Values
        // ======================================================

        const N = getInputValue("N");
        const P = getInputValue("P");
        const K = getInputValue("K");
        const temperature = getInputValue("temperature");
        const humidity = getInputValue("humidity");
        const ph = getInputValue("ph");
        const rainfall = getInputValue("rainfall");


        // ======================================================
        // Validate Input Values
        // ======================================================

        const values = [
            N,
            P,
            K,
            temperature,
            humidity,
            ph,
            rainfall
        ];


        const hasEmptyValue =
            values.some(
                value =>
                    value === null ||
                    value === ""
            );


        if (hasEmptyValue) {

            alert(
                "Please enter all soil and environmental values."
            );

            return;
        }


        // ======================================================
        // Convert Values To Numbers
        // ======================================================

        const inputData = {

            N: Number(N),

            P: Number(P),

            K: Number(K),

            temperature: Number(temperature),

            humidity: Number(humidity),

            ph: Number(ph),

            rainfall: Number(rainfall)

        };


        // ======================================================
        // Validate Numeric Values
        // ======================================================

        const containsInvalidNumber =
            Object.values(inputData).some(
                value => !Number.isFinite(value)
            );


        if (containsInvalidNumber) {

            alert(
                "Please enter valid numerical values."
            );

            return;
        }


        // ======================================================
        // Loading State
        // ======================================================

        if (predictBtn) {

            predictBtn.disabled = true;

            predictBtn.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Predicting...';

        }


        try {

            // ==================================================
            // Send Prediction Request
            // ==================================================

            const response = await fetch(
                "/predict",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(inputData)
                }
            );


            // ==================================================
            // Check HTTP Response
            // ==================================================

            if (!response.ok) {

                throw new Error(
                    `Server error: ${response.status}`
                );

            }


            // ==================================================
            // Convert Response To JSON
            // ==================================================

            const result =
                await response.json();


            // ==================================================
            // Check API Error
            // ==================================================

            if (result.error) {

                throw new Error(
                    result.error
                );

            }


            // ==================================================
            // Check Prediction Response
            // ==================================================

            if (
                !result.recommended_crop ||
                !result.details
            ) {

                throw new Error(
                    "Incomplete prediction response received."
                );

            }


            // ==================================================
            // Scroll To Result
            // ==================================================

            const resultSection =
                document.getElementById(
                    "resultSection"
                );


            if (resultSection) {

                resultSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }


            // ==================================================
            // Main Prediction Result
            // ==================================================

            if (cropName) {

                cropName.textContent =
                    displayValue(
                        result.recommended_crop
                    );

            }


            if (cropDescription) {

                cropDescription.textContent =
                    displayValue(
                        result.details.description,
                        "Crop information is available below."
                    );

            }


            // ==================================================
            // Prediction Confidence
            // ==================================================

            if (confidence) {

                let confidenceValue =
                    result.confidence;


                if (
                    confidenceValue !== null &&
                    confidenceValue !== undefined
                ) {

                    confidenceValue =
                        Number(confidenceValue);


                    if (Number.isFinite(confidenceValue)) {

                        confidence.textContent =
                            confidenceValue.toFixed(2);

                    } else {

                        confidence.textContent =
                            displayValue(
                                result.confidence
                            );

                    }

                } else {

                    confidence.textContent = "--";

                }

            }


            // ==================================================
            // Crop Image
            // ==================================================

            if (cropImage) {

                cropImage.src =
                    displayValue(
                        result.details.image,
                        "/static/images/default.jpg"
                    );


                cropImage.alt =
                    `${displayValue(
                        result.recommended_crop,
                        "Recommended Crop"
                    )} Image`;

            }


            // ==================================================
            // Crop Information
            // ==========================================================

            // Season
            if (season) {

                season.textContent =
                    displayValue(
                        result.details.season
                    );

            }


            // Harvest Time
            if (harvest) {

                harvest.textContent =
                    displayValue(
                        result.details.harvest
                    );

            }


            // Soil Type
            if (soil) {

                soil.textContent =
                    displayValue(
                        result.details.soil_type
                    );

            }


            // Water Requirement
            if (water) {

                water.textContent =
                    displayValue(
                        result.details.water_requirement
                    );

            }


            // Fertilizer
            if (fertilizer) {

                fertilizer.textContent =
                    displayValue(
                        result.details.fertilizer
                    );

            }


            // Market Demand
            if (market) {

                market.textContent =
                    displayValue(
                        result.details.market_demand
                    );

            }


            // ==================================================
            // Suitable Regions
            // ==================================================

            if (regions) {

                regions.textContent =
                    displayArray(
                        result.details.suitable_regions,
                        ", "
                    );

            }


            // ==================================================
            // Common Uses
            // ==================================================

            if (uses) {

                uses.textContent =
                    displayArray(
                        result.details.common_uses,
                        " • "
                    );

            }


            // ==================================================
            // Growing Conditions
            // ==================================================

            if (temperatureRange) {

                temperatureRange.textContent =
                    displayValue(
                        result.details.temperature
                    );

            }


            if (humidityRange) {

                humidityRange.textContent =
                    displayValue(
                        result.details.humidity
                    );

            }


            if (phRange) {

                phRange.textContent =
                    displayValue(
                        result.details.ph
                    );

            }


            if (rainfallRange) {

                rainfallRange.textContent =
                    displayValue(
                        result.details.rainfall
                    );

            }


            // ==================================================
            // Growing Tips
            // ==================================================

            if (tipsList) {

                // Clear previous tips
                tipsList.innerHTML = "";


                const growingTips =
                    result.details.growing_tips;


                // ------------------------------------------------
                // Case 1: Array
                // ------------------------------------------------

                if (Array.isArray(growingTips)) {

                    growingTips.forEach((tip) => {

                        if (
                            tip !== null &&
                            tip !== undefined &&
                            String(tip).trim() !== ""
                        ) {

                            const li =
                                document.createElement("li");

                            li.textContent =
                                tip;

                            tipsList.appendChild(li);

                        }

                    });

                }


                // ------------------------------------------------
                // Case 2: String
                // ------------------------------------------------

                else if (
                    typeof growingTips === "string" &&
                    growingTips.trim() !== ""
                ) {

                    const li =
                        document.createElement("li");

                    li.textContent =
                        growingTips;

                    tipsList.appendChild(li);

                }


                // ------------------------------------------------
                // Case 3: No Tips
                // ------------------------------------------------

                else {

                    const li =
                        document.createElement("li");

                    li.textContent =
                        "No growing tips available.";

                    tipsList.appendChild(li);

                }

            }


            // ==================================================
            // Success Message
            // ==================================================

            console.log(
                "✅ Prediction successful:",
                result.recommended_crop
            );

        }


        // ======================================================
        // Error Handling
        // ======================================================

        catch (error) {

            console.error(
                "❌ Prediction Error:",
                error
            );


            alert(
                "Prediction Failed!\n\n" +
                error.message
            );

        }


        // ======================================================
        // Restore Prediction Button
        // ======================================================

        finally {

            if (predictBtn) {

                predictBtn.disabled = false;

                predictBtn.innerHTML =
                    '<i class="fa-solid fa-seedling"></i> Predict Best Crop';

            }

        }

    });


    // ==========================================================
    // Fade-in Animation
    // ==========================================================

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target.classList.add(
                            "show"
                        );

                    }

                });

            },
            {
                threshold: 0.15
            }
        );


    document.querySelectorAll(
        ".detail-card, " +
        ".condition-card, " +
        ".workflow-card, " +
        ".dataset-card, " +
        ".tips-card, " +
        ".result-card"
    ).forEach((element) => {

        observer.observe(element);

    });


    // ==========================================================
    // Default Image Fallback
    // ==========================================================

    if (cropImage) {

        cropImage.addEventListener(
            "error",
            () => {

                if (
                    !cropImage.src.includes(
                        "default.jpg"
                    )
                ) {

                    cropImage.src =
                        "/static/images/default.jpg";

                }

            }
        );

    }


    // ==========================================================
    // Enter Key Support
    // ==========================================================

    document.querySelectorAll(
        "input"
    ).forEach((input) => {

        input.addEventListener(
            "keypress",
            (event) => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    form.requestSubmit();

                }

            }
        );

    });


    // ==========================================================
    // Final Console Message
    // ==========================================================

    console.log(
        "%c🌱 SmartHarvest Ready!",
        "color:green;font-size:18px;font-weight:bold;"
    );

});
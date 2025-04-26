document.addEventListener("DOMContentLoaded", function () {
    // DOM Elements
    const otpRequestForm = document.getElementById("otpRequestForm");
    const otpVerificationForm = document.getElementById("otpVerificationForm");
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    const sendOtpButton = document.getElementById("sendOtp");
    const verifyOtpButton = document.getElementById("verifyOtp");
    const resendOtpButton = document.getElementById("resendOtp");
    const otpTimer = document.getElementById("otpTimer");
    const statusMessage = document.getElementById("statusMessage");
    const otpBoxes = document.querySelectorAll(".otp-box");

    // State variables
    let currentFacultyId = "";
    let countdownInterval;
    const OTP_EXPIRY_TIME = 5 * 60; // 5 minutes in seconds

    /* ====================== */
    /* === TIMER FUNCTIONS === */
    /* ====================== */

    /**
     * Starts the OTP countdown timer
     */
    function startOtpCountdown() {
        let timeLeft = OTP_EXPIRY_TIME;
        resendOtpButton.disabled = true;
        
        // Clear any existing interval
        clearInterval(countdownInterval);
        
        countdownInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            otpTimer.textContent = `OTP expires in: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                otpTimer.textContent = "OTP has expired";
                resendOtpButton.disabled = false;
            } else {
                timeLeft--;
            }
        }, 1000);
    }

    /**
     * Clears the OTP countdown timer
     */
    function clearOtpCountdown() {
        clearInterval(countdownInterval);
        otpTimer.textContent = "";
    }

    /* ====================== */
    /* === OTP FUNCTIONS ==== */
    /* ====================== */

    /**
     * Handles sending OTP to faculty
     */
    async function sendOtp() {
        currentFacultyId = getValue("otp_faculty_id");
        if (!currentFacultyId) {
            return showError("❌ Faculty ID is required!");
        }

        sendOtpButton.disabled = true;
        sendOtpButton.textContent = "Sending...";

        try {
            const data = await sendRequest("POST", "/faculty/send-otp", { 
                faculty_id: currentFacultyId 
            });

            if (data.success) {
                showSuccess("✅ OTP sent to your email!");
                showElement(otpVerificationForm);
                hideElement(otpRequestForm);
                focusOtpBox(0);
                startOtpCountdown();
            } else {
                showError("❌ " + (data.message || "Failed to send OTP"));
            }
        } catch (error) {
            showError("❌ Network error. Please try again.");
            console.error("OTP send error:", error);
        } finally {
            sendOtpButton.disabled = false;
            sendOtpButton.textContent = "Send OTP";
        }
    }

    /**
     * Handles resending OTP
     */
    async function resendOtp() {
        if (!currentFacultyId) return;

        resendOtpButton.disabled = true;
        resendOtpButton.textContent = "Sending...";
        clearOtpCountdown();

        try {
            const data = await sendRequest("POST", "/faculty/send-otp", { 
                faculty_id: currentFacultyId 
            });

            if (data.success) {
                showSuccess("✅ New OTP sent to your email!");
                // Clear existing OTP inputs
                otpBoxes.forEach(box => box.value = '');
                focusOtpBox(0);
                startOtpCountdown();
            } else {
                showError("❌ " + (data.message || "Failed to resend OTP"));
                resendOtpButton.disabled = false;
            }
        } catch (error) {
            showError("❌ Network error. Please try again.");
            console.error("OTP resend error:", error);
            resendOtpButton.disabled = false;
        } finally {
            resendOtpButton.textContent = "Resend OTP";
        }
    }

    /**
     * Handles OTP verification
     */
    async function verifyOtp() {
        const otp = Array.from(otpBoxes).map(input => input.value).join("").trim();

        if (otp.length !== 6) {
            return showError("❌ Please enter the full 6-digit OTP!");
        }

        verifyOtpButton.disabled = true;
        verifyOtpButton.textContent = "Verifying...";

        try {
            const data = await sendRequest("POST", "/faculty/verify-otp", { 
                faculty_id: currentFacultyId, 
                otp 
            });

            if (data.success) {
                showSuccess("✅ OTP Verified! Enter a new password.");
                showElement(resetPasswordForm);
                hideElement(otpVerificationForm);
                clearOtpCountdown();
                
                // Store the verified OTP in the hidden field
                const verifiedOtpField = document.getElementById("verified_otp");
                if (verifiedOtpField) {
                    verifiedOtpField.value = otp;
                } else {
                    console.error("Verified OTP field not found");
                    showError("❌ System error. Please try again.");
                    return;
                }
            } else {
                showError("❌ " + (data.message || "Invalid OTP"));
                otpBoxes.forEach(input => input.value = "");
                focusOtpBox(0);
            }
        } catch (error) {
            showError("❌ Verification failed. Please try again.");
            console.error("OTP verify error:", error);
        } finally {
            verifyOtpButton.disabled = false;
            verifyOtpButton.textContent = "Verify OTP";
        }
    }

    /* ====================== */
    /* === PASSWORD RESET === */
    /* ====================== */

    /**
     * Handles password reset
     */
    async function resetPassword(event) {
        event.preventDefault();
        const newPassword = getValue("new_password");
        const verifiedOtp = getValue("verified_otp");
        
        if (!newPassword) {
            return showError("❌ New password is required!");
        }

        if (!verifiedOtp) {
            return showError("❌ OTP verification required!");
        }

        const submitButton = resetPasswordForm.querySelector("button[type='submit']");
        submitButton.disabled = true;
        submitButton.textContent = "Processing...";

        try {
            const data = await sendRequest("POST", "/faculty/reset-password", { 
                faculty_id: currentFacultyId, 
                new_password: newPassword,
                otp: verifiedOtp
            });

            if (data.success) {
                showSuccess("✅ Password Reset Successful! Redirecting...");
                setTimeout(() => window.location.href = "login.html", 2000);
            } else {
                showError("❌ " + (data.message || "Password reset failed"));
            }
        } catch (error) {
            showError("❌ Reset failed. Please try again.");
            console.error("Reset error:", error);
            
            // More detailed error logging
            if (error.response) {
                try {
                    const errorData = await error.response.json();
                    console.error("Server error details:", errorData);
                } catch (e) {
                    console.error("Failed to parse error response:", e);
                }
            }
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Reset Password";
        }
    }

    /* ====================== */
    /* === HELPER FUNCTIONS = */
    /* ====================== */

    /**
     * Focuses on a specific OTP input box
     * @param {number} index - Index of the OTP box to focus
     */
    function focusOtpBox(index) {
        if (otpBoxes[index]) otpBoxes[index].focus();
    }

    /**
     * Shows elements by setting display to block
     * @param {...HTMLElement} elements - Elements to show
     */
    function showElement(...elements) {
        elements.forEach(el => el.style.display = "block");
    }

    /**
     * Hides elements by setting display to none
     * @param {...HTMLElement} elements - Elements to hide
     */
    function hideElement(...elements) {
        elements.forEach(el => el.style.display = "none");
    }

    /**
     * Shows a success message
     * @param {string} message - Success message to display
     */
    function showSuccess(message) {
        statusMessage.innerText = message;
        statusMessage.style.color = "green";
    }

    /**
     * Shows an error message
     * @param {string} message - Error message to display
     */
    function showError(message) {
        statusMessage.innerText = message;
        statusMessage.style.color = "red";
    }

    /**
     * Gets the value of an element by ID
     * @param {string} id - Element ID
     * @returns {string} Trimmed value of the element
     */
    function getValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : "";
    }

    /**
     * Sends a request to the server
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} url - Endpoint URL
     * @param {object} body - Request body
     * @returns {Promise} Promise that resolves to the response data
     */
    async function sendRequest(method, url, body) {
        const response = await fetch(`http://localhost:5000${url}`, {
            method,
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = new Error(`HTTP error! status: ${response.status}`);
            error.response = response;
            throw error;
        }

        return await response.json();
    }

    /* ====================== */
    /* === EVENT LISTENERS == */
    /* ====================== */

    // OTP Box Auto-focus and Navigation
    otpBoxes.forEach((box, index) => {
        box.addEventListener("input", () => {
            if (box.value.length === 1 && index < otpBoxes.length - 1) {
                otpBoxes[index + 1].focus();
            }
        });

        box.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !box.value && index > 0) {
                otpBoxes[index - 1].focus();
            }
        });
    });

    // Button Event Listeners
    sendOtpButton.addEventListener("click", sendOtp);
    resendOtpButton.addEventListener("click", resendOtp);
    verifyOtpButton.addEventListener("click", verifyOtp);
    resetPasswordForm.addEventListener("submit", resetPassword);

    /* ====================== */
    /* === INITIALIZATION === */
    /* ====================== */

    // Initialize particles.js
    particlesJS("particles-js", {
        particles: {
            number: { value: 50 },
            color: { value: "#ffffff" },
            shape: { type: "circle" },
            opacity: { value: 0.5 },
            size: { value: 3, random: true },
            line_linked: {
                enable: true,
                distance: 120,
                color: "#ffffff",
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: "none",
                out_mode: "out"
            }
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: { enable: true, mode: "repulse" },
                onclick: { enable: true, mode: "push" }
            },
            modes: {
                repulse: { distance: 100 },
                push: { particles_nb: 4 }
            }
        },
        retina_detect: true
    });
});
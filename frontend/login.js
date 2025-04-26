document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const statusMessage = document.getElementById("statusMessage");
    const qrImage = document.getElementById("qrImage");
    const qrSection = document.getElementById("qrSection");
    const forgotPassword = document.getElementById("forgotPassword");

    /** 🔹 Handle Login */
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const faculty_id = getValue("faculty_id");
        const password = getValue("password");

        if (!faculty_id || !password) return showError("❌ Faculty ID and password are required!");

        sendRequest("POST", "/faculty/login", { faculty_id, password })
            .then(data => {
                if (data.success) {
                    showSuccess("✅ Login Successful!");
                    qrImage.src = data.qr_code;
                    showElement(qrSection);
                } else {
                    showError("❌ " + data.message);
                    hideElement(qrSection);
                }
            });
    });

    /** 🔹 Redirect to Reset Password Page */
    if (forgotPassword) {
        forgotPassword.addEventListener("click", function () {
            window.location.href = "reset.html";
        });
    }

    /** 🔹 Utility Functions */
    function showElement(...elements) {
        elements.forEach(el => el.style.display = "block");
    }

    function hideElement(...elements) {
        elements.forEach(el => el.style.display = "none");
    }

    function showSuccess(message) {
        statusMessage.innerText = message;
        statusMessage.style.color = "green";
    }

    function showError(message) {
        statusMessage.innerText = message;
        statusMessage.style.color = "red";
    }

    function getValue(id) {
        return document.getElementById(id)?.value.trim();
    }

    function sendRequest(method, url, body) {
        return fetch(`http://localhost:5000${url}`, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then(response => response.json());
    }

    /** 🔹 Initialize Particles.js */
    initParticles();
});

function initParticles() {
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
}
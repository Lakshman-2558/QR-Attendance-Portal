document.addEventListener("DOMContentLoaded", function () {
    // DOM Elements
    const registerForm = document.getElementById("registerForm");
    const statusMessage = document.getElementById("statusMessage");
    const registerButton = document.getElementById("registerButton");
    const facultyIdError = document.getElementById("facultyIdError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");

    // Client-side validation functions
    function validateFacultyId(facultyId) {
        if (!facultyId) {
            facultyIdError.textContent = "Faculty ID is required";
            facultyIdError.style.display = "block";
            return false;
        }
        if (facultyId.length < 4) {
            facultyIdError.textContent = "Faculty ID must be at least 4 characters";
            facultyIdError.style.display = "block";
            return false;
        }
        facultyIdError.style.display = "none";
        return true;
    }

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            emailError.textContent = "Email is required";
            emailError.style.display = "block";
            return false;
        }
        if (!emailRegex.test(email)) {
            emailError.textContent = "Please enter a valid email address";
            emailError.style.display = "block";
            return false;
        }
        emailError.style.display = "none";
        return true;
    }

    function validatePassword(password) {
        if (!password) {
            passwordError.textContent = "Password is required";
            passwordError.style.display = "block";
            return false;
        }
        if (password.length < 4) {
            passwordError.textContent = "Password must be at least 4 characters";
            passwordError.style.display = "block";
            return false;
        }
        passwordError.style.display = "none";
        return true;
    }

    // Form submission handler
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        
        // Get form values
        const faculty_id = getValue("reg_faculty_id");
        const email = getValue("reg_email");
        const password = getValue("reg_password");

        // Validate inputs
        const isFacultyIdValid = validateFacultyId(faculty_id);
        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);

        if (!isFacultyIdValid || !isEmailValid || !isPasswordValid) {
            return;
        }

        // Disable button during request
        registerButton.disabled = true;
        registerButton.textContent = "Registering...";
        clearStatus();

        try {
            const response = await fetch("http://localhost:5000/faculty/register", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ faculty_id, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle server-side validation errors
                if (data.errors) {
                    handleServerErrors(data.errors);
                    throw new Error("Validation failed");
                }
                throw new Error(data.message || "Registration failed");
            }

            // Registration successful
            showSuccess("✅ Registration successful! Redirecting to login...");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);

        } catch (error) {
            console.error("Registration error:", error);
            showError(`❌ ${error.message || "Registration failed. Please try again."}`);
        } finally {
            registerButton.disabled = false;
            registerButton.textContent = "Register";
        }
    });

    // Helper functions
    function handleServerErrors(errors) {
        if (errors.faculty_id) {
            facultyIdError.textContent = errors.faculty_id;
            facultyIdError.style.display = "block";
        }
        if (errors.email) {
            emailError.textContent = errors.email;
            emailError.style.display = "block";
        }
        if (errors.password) {
            passwordError.textContent = errors.password;
            passwordError.style.display = "block";
        }
    }

    function getValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : "";
    }

    function showSuccess(message) {
        statusMessage.textContent = message;
        statusMessage.style.color = "#4CAF50";
    }

    function showError(message) {
        statusMessage.textContent = message;
        statusMessage.style.color = "#FF5252";
    }

    function clearStatus() {
        statusMessage.textContent = "";
    }

    // Input validation on blur
    document.getElementById("reg_faculty_id").addEventListener("blur", function() {
        validateFacultyId(this.value.trim());
    });

    document.getElementById("reg_email").addEventListener("blur", function() {
        validateEmail(this.value.trim());
    });

    document.getElementById("reg_password").addEventListener("blur", function() {
        validatePassword(this.value.trim());
    });
});
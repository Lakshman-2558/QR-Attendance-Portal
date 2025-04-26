document.addEventListener("DOMContentLoaded", function () {
    // Initialize variables
    let html5QrCode;
    let selectedSection = "";
    let selectedSubject = "";
    let studentAttendance = {};
    let currentFaculty = null;

    // DOM Elements
    const elements = {
        scannerSection: document.getElementById("scanner-section"),
        facultyInfo: document.getElementById("facultyInfo"),
        sectionSubjectSelection: document.getElementById("section-subject-selection"),
        attendanceSection: document.getElementById("attendance"),
        summarySection: document.getElementById("summary"),
        individualAttendanceList: document.getElementById("individual-attendance-list"),
        studentAttendanceDetails: document.getElementById("student-attendance-details"),
        sectionName: document.getElementById("section-name"),
        subjectName: document.getElementById("subject-name"),
        attendanceForm: document.getElementById("attendanceForm"),
        submitAttendanceBtn: document.getElementById("submitAttendanceButton"),
        notificationContainer: document.getElementById("notificationContainer"),
        studentList: document.getElementById("studentList"),
        studentName: document.getElementById("student-name"),
        totalAttendance: document.getElementById("totalAttendance"),
        subjectAttendanceList: document.getElementById("subjectAttendanceList"),
        backToStudentList: document.getElementById("backToStudentList"),
        viewIndividualAttendance: document.getElementById("viewIndividualAttendance"),
        newAttendanceSession: document.getElementById("newAttendanceSession")
    };

    // Verify all required elements exist
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element not found: ${key}`);
        }
    }

    // Notification system
    function showNotification(type, message) {
        if (!elements.notificationContainer) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        notification.innerHTML = `${icons[type] || ''} ${message}`;
        elements.notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Initialize QR Scanner
    function initializeScanner() {
        const qrReader = document.getElementById("reader");
        if (!qrReader) {
            showNotification('error', 'QR Scanner element not found');
            return null;
        }

        try {
            return new Html5Qrcode("reader");
        } catch (error) {
            showNotification('error', 'Failed to initialize QR scanner');
            console.error("Scanner initialization error:", error);
            return null;
        }
    }

    // Main QR validation function
    async function validateQRCode(decodedText) {
        try {
            // Parse QR data
            let qrData;
            try {
                qrData = JSON.parse(decodedText);
                if (!qrData.faculty_id || !qrData.hashed_password) {
                    throw new Error("Invalid QR format - missing fields");
                }
            } catch (e) {
                showNotification('error', 'Invalid QR code format');
                return false;
            }

            // Validate with backend
            const response = await fetch('/faculty/validate_qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scanned_qr: decodedText })
            });

            const result = await response.json();
            if (!result.success) {
                showNotification('error', result.message || 'QR validation failed');
                return false;
            }

            // Get faculty details
            const facultyResponse = await fetch(`/faculty/details?faculty_id=${encodeURIComponent(qrData.faculty_id)}`);
            const facultyData = await facultyResponse.json();
            
            if (!facultyData.success) {
                showNotification('error', facultyData.message || 'Failed to load faculty details');
                return false;
            }

            // Update UI with faculty data
            currentFaculty = facultyData.faculty;
            showNotification('success', 'Login successful!');
            
            if (elements.facultyInfo) {
                const nameElement = elements.facultyInfo.querySelector('.faculty-name');
                if (nameElement) {
                    nameElement.textContent = currentFaculty.name;
                }
                elements.facultyInfo.classList.remove('hidden');
            }
            
            // Update section-subject selection
            updateSectionSubjectSelection(currentFaculty.section_subjects);
            
            // Update visibility
            if (elements.scannerSection) elements.scannerSection.classList.add("hidden");
            if (elements.sectionSubjectSelection) elements.sectionSubjectSelection.classList.remove("hidden");
            
            if (html5QrCode) html5QrCode.stop();
            return true;

        } catch (error) {
            console.error("Validation error:", error);
            showNotification('error', `Error validating QR code: ${error.message}`);
            return false;
        }
    }

    // Update section-subject selection UI
    function updateSectionSubjectSelection(sectionSubjects) {
        if (!elements.sectionSubjectSelection) {
            console.error("Section-subject selection element not found");
            return;
        }

        // Clear existing content
        elements.sectionSubjectSelection.innerHTML = "";
        
        // Handle empty case
        if (!sectionSubjects || sectionSubjects.length === 0) {
            elements.sectionSubjectSelection.innerHTML = `
                <div class="no-sections">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No sections/subjects assigned to you.</p>
                    <p>Please contact admin.</p>
                </div>
            `;
            return;
        }

        // Create section-subject UI
        sectionSubjects.forEach((sectionItem) => {
            const sectionDiv = document.createElement("div");
            sectionDiv.className = "section-group";
            
            const sectionHeader = document.createElement("h3");
            sectionHeader.textContent = sectionItem.section;
            sectionDiv.appendChild(sectionHeader);
            
            const subjectButtonsDiv = document.createElement("div");
            subjectButtonsDiv.className = "subject-buttons";
            
            sectionItem.subjects.forEach(subject => {
                const button = document.createElement("button");
                button.className = "subject-btn";
                button.textContent = subject;
                button.dataset.section = sectionItem.section;
                button.dataset.subject = subject;
                subjectButtonsDiv.appendChild(button);
            });
            
            sectionDiv.appendChild(subjectButtonsDiv);
            elements.sectionSubjectSelection.appendChild(sectionDiv);
        });

        // Add click handler for subject buttons
        elements.sectionSubjectSelection.addEventListener("click", (event) => {
            if (event.target.classList.contains("subject-btn")) {
                selectedSection = event.target.dataset.section;
                selectedSubject = event.target.dataset.subject;
                
                if (elements.sectionName) elements.sectionName.textContent = selectedSection;
                if (elements.subjectName) elements.subjectName.textContent = selectedSubject;
                
                elements.sectionSubjectSelection.classList.add("hidden");
                if (elements.attendanceSection) elements.attendanceSection.classList.remove("hidden");
                
                generateStudentList(selectedSection);
            }
        });
    }

    // Generate student list for attendance
    function generateStudentList(section) {
        if (!elements.attendanceForm) {
            console.error("Attendance form element not found");
            return;
        }

        elements.attendanceForm.innerHTML = "";
        
        // Generate 50 student placeholders (for demo)
        for (let i = 1; i <= 50; i++) {
            const studentRegNo = `${section}-${i.toString().padStart(3, "0")}`;
            
            // Initialize student record if not exists
            if (!studentAttendance[studentRegNo]) {
                studentAttendance[studentRegNo] = { 
                    total: 100, 
                    subjects: {} 
                };
            }

            const container = document.createElement("div");
            container.className = "reg-no-container";
            container.innerHTML = `
                <input type="checkbox" name="student" value="${studentRegNo}" id="student-${studentRegNo}">
                <label for="student-${studentRegNo}">${studentRegNo}</label>
            `;
            
            container.querySelector('input').addEventListener('change', updateAttendanceCount);
            elements.attendanceForm.appendChild(container);
        }
        
        updateAttendanceCount();
    }

    // Update attendance count display
    function updateAttendanceCount() {
        const totalCount = document.getElementById('totalCount');
        const markedCount = document.getElementById('markedCount');
        
        if (totalCount && markedCount) {
            const checkboxes = document.querySelectorAll('#attendanceForm input[type="checkbox"]');
            totalCount.textContent = checkboxes.length;
            markedCount.textContent = Array.from(checkboxes).filter(cb => cb.checked).length;
        }
    }

    // Submit attendance
    async function submitAttendance() {
        // Verify authorization
        const isAuthorized = currentFaculty?.section_subjects?.some(item => 
            item.section === selectedSection && 
            item.subjects.includes(selectedSubject)
        );
        
        if (!isAuthorized) {
            showNotification('error', 'You are not authorized for this section/subject');
            return;
        }

        const students = document.querySelectorAll("#attendanceForm input[type='checkbox']");
        let presentCount = 0;
        let absentCount = 0;

        students.forEach(student => {
            const regNo = student.value;
            
            if (student.checked) {
                absentCount++;
                // Initialize subject attendance if not exists
                if (!studentAttendance[regNo].subjects[selectedSubject]) {
                    studentAttendance[regNo].subjects[selectedSubject] = 100;
                }
                // Deduct attendance points
                studentAttendance[regNo].total = Math.max(0, studentAttendance[regNo].total - 5);
                studentAttendance[regNo].subjects[selectedSubject] = Math.max(0, studentAttendance[regNo].subjects[selectedSubject] - 2);
            } else {
                presentCount++;
            }
        });

        // Update UI
        const presentCountEl = document.getElementById("presentCount");
        const absentCountEl = document.getElementById("absentCount");
        if (presentCountEl) presentCountEl.textContent = presentCount;
        if (absentCountEl) absentCountEl.textContent = absentCount;
        
        showNotification('success', `Attendance recorded for ${selectedSubject} in ${selectedSection}`);
        
        // Show summary
        if (elements.attendanceSection) elements.attendanceSection.classList.add("hidden");
        if (elements.summarySection) elements.summarySection.classList.remove("hidden");
    }

    // View individual attendance
    function viewStudentAttendance(regNo) {
        if (!elements.studentAttendanceDetails || !elements.individualAttendanceList) return;
        
        elements.individualAttendanceList.classList.add("hidden");
        elements.studentAttendanceDetails.classList.remove("hidden");

        if (elements.studentName) elements.studentName.textContent = regNo;
        
        const student = studentAttendance[regNo];
        const subjects = Object.values(student.subjects);
        const averageAttendance = subjects.length > 0 
            ? Math.round(subjects.reduce((a, b) => a + b, 0) / subjects.length)
            : 0;
        
        // Update circular progress
        const circle = document.querySelector('.progress-ring-circle');
        if (circle) {
            const radius = 52;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (averageAttendance / 100) * circumference;
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = offset;
        }
        
        if (elements.totalAttendance) elements.totalAttendance.textContent = `${averageAttendance}%`;
        
        // Update subject list
        if (elements.subjectAttendanceList) {
            elements.subjectAttendanceList.innerHTML = "";
            
            for (const subject in student.subjects) {
                const li = document.createElement("li");
                li.innerHTML = `
                    <span class="subject-name">${subject}</span>
                    <span class="subject-percentage">${student.subjects[subject]}%</span>
                `;
                elements.subjectAttendanceList.appendChild(li);
            }
        }
    }

    // Initialize event listeners
    function initializeEventListeners() {
        // Submit attendance
        if (elements.submitAttendanceBtn) {
            elements.submitAttendanceBtn.addEventListener("click", submitAttendance);
        }

        // View individual attendance
        if (elements.viewIndividualAttendance) {
            elements.viewIndividualAttendance.addEventListener("click", () => {
                if (!elements.summarySection || !elements.individualAttendanceList) return;
                
                elements.summarySection.classList.add("hidden");
                elements.individualAttendanceList.classList.remove("hidden");
                
                // Populate student list
                if (elements.studentList) {
                    elements.studentList.innerHTML = "";
                    
                    for (const studentRegNo in studentAttendance) {
                        if (studentRegNo.startsWith(selectedSection)) {
                            const studentButton = document.createElement("button");
                            studentButton.className = "student-btn";
                            studentButton.innerHTML = `
                                ${studentRegNo}
                                <span class="attendance-percentage">${studentAttendance[studentRegNo].total}%</span>
                            `;
                            studentButton.onclick = () => viewStudentAttendance(studentRegNo);
                            elements.studentList.appendChild(studentButton);
                        }
                    }
                }
            });
        }

        // Back to student list
        if (elements.backToStudentList) {
            elements.backToStudentList.addEventListener("click", () => {
                if (!elements.studentAttendanceDetails || !elements.individualAttendanceList) return;
                
                elements.studentAttendanceDetails.classList.add("hidden");
                elements.individualAttendanceList.classList.remove("hidden");
            });
        }

        // New attendance session
        if (elements.newAttendanceSession) {
            elements.newAttendanceSession.addEventListener("click", () => {
                if (!elements.summarySection || !elements.sectionSubjectSelection) return;
                
                elements.summarySection.classList.add("hidden");
                elements.sectionSubjectSelection.classList.remove("hidden");
            });
        }
    }

    // Initialize and start scanner
    function initializeApp() {
        initializeEventListeners();
        html5QrCode = initializeScanner();
        
        if (html5QrCode) {
            html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 }, disableFlip: true },
                validateQRCode,
                (error) => console.error("QR Scan Error:", error)
            ).catch(err => {
                showNotification('error', 'Failed to start scanner');
                console.error("Scanner start error:", err);
            });
        }
    }

    // Start the application
    initializeApp();
});
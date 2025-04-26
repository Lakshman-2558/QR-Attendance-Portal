document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const facultyTableBody = document.getElementById('facultyTableBody');
    const addFacultyBtn = document.getElementById('addFacultyBtn');
    const facultyModal = document.getElementById('facultyModal');
    const modalTitle = document.getElementById('modalTitle');
    const facultyForm = document.getElementById('facultyForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const addSectionSubjectBtn = document.getElementById('addSectionSubjectBtn');
    const sectionSubjectsContainer = document.getElementById('sectionSubjectsContainer');
    const notification = document.getElementById('notification');
    
    // Current faculty being edited
    let currentFacultyId = null;
    
    // Load faculty data
    function loadFacultyData() {
        showLoading(facultyTableBody, "Loading faculty data...");
        
        fetch('/faculty/all')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    renderFacultyTable(data.faculty);
                } else {
                    showNotification('error', data.message || 'Failed to load faculty data');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('error', 'Error loading faculty data');
                facultyTableBody.innerHTML = '<tr><td colspan="6" class="error-message">Failed to load data. Please try again.</td></tr>';
            });
    }
    
    // Render faculty table
    function renderFacultyTable(facultyList) {
        facultyTableBody.innerHTML = '';
        
        if (!facultyList || facultyList.length === 0) {
            facultyTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No faculty found</td></tr>';
            return;
        }
        
        facultyList.forEach(faculty => {
            const row = document.createElement('tr');
            
            // Format sections and subjects
            let sectionsSubjects = 'None assigned';
            if (faculty.section_subjects && faculty.section_subjects.length > 0) {
                sectionsSubjects = faculty.section_subjects.map(item => 
                    `<strong>${item.section}</strong>: ${item.subjects.join(', ')}`
                ).join('<br>');
            }
            
            row.innerHTML = `
                <td>${faculty.name}</td>
                <td>${faculty.faculty_id}</td>
                <td>${faculty.email}</td>
                <td>${faculty.department || '-'}</td>
                <td>${sectionsSubjects}</td>
                <td class="actions">
                    <button class="btn btn-primary edit-btn" data-id="${faculty._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger delete-btn" data-id="${faculty._id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            
            facultyTableBody.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        addFacultyRowEventListeners();
    }
    
    function addFacultyRowEventListeners() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const facultyId = this.getAttribute('data-id');
                editFaculty(facultyId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const facultyId = this.getAttribute('data-id');
                confirmDeleteFaculty(facultyId);
            });
        });
    }
    
    // Add new section-subject pair
    function addSectionSubject(section = '', subjects = []) {
        const sectionSubjectDiv = document.createElement('div');
        sectionSubjectDiv.className = 'section-subject-item';
        sectionSubjectDiv.innerHTML = `
            <div class="subject-item">
                <input type="text" placeholder="Section" class="section-input" value="${section}" required>
                <input type="text" placeholder="Subjects (comma separated)" class="subjects-input" value="${subjects.join(', ')}" required>
                <button type="button" class="btn btn-danger remove-section-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        sectionSubjectsContainer.appendChild(sectionSubjectDiv);
        
        // Add event listener to remove button
        sectionSubjectDiv.querySelector('.remove-section-btn').addEventListener('click', function() {
            sectionSubjectDiv.remove();
        });
    }
    
    // Open modal for adding new faculty
    function openAddFacultyModal() {
        currentFacultyId = null;
        modalTitle.textContent = 'Add New Faculty';
        facultyForm.reset();
        sectionSubjectsContainer.innerHTML = '';
        facultyModal.style.display = 'block';
        addSectionSubject(); // Add one empty section-subject pair by default
    }
    
    // Open modal for editing faculty
    function editFaculty(facultyId) {
        showLoading(facultyModal, "Loading faculty data...");
        
        fetch(`/faculty/details?id=${facultyId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    currentFacultyId = facultyId;
                    modalTitle.textContent = 'Edit Faculty';
                    
                    // Fill form with faculty data
                    document.getElementById('name').value = data.faculty.name;
                    document.getElementById('faculty_id').value = data.faculty.faculty_id;
                    document.getElementById('email').value = data.faculty.email;
                    document.getElementById('department').value = data.faculty.department || '';
                    
                    // Clear and add section-subject pairs
                    sectionSubjectsContainer.innerHTML = '';
                    if (data.faculty.section_subjects && data.faculty.section_subjects.length > 0) {
                        data.faculty.section_subjects.forEach(item => {
                            addSectionSubject(item.section, item.subjects);
                        });
                    } else {
                        addSectionSubject(); // Add empty if none exist
                    }
                    
                    facultyModal.style.display = 'block';
                } else {
                    throw new Error(data.message || 'Failed to load faculty data');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('error', error.message || 'Error loading faculty data');
                facultyModal.style.display = 'none';
            });
    }
    
    // Confirm before deleting faculty
    function confirmDeleteFaculty(facultyId) {
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.innerHTML = `
            <div class="confirmation-content">
                <h3>Confirm Deletion</h3>
                <p>Are you sure you want to delete this faculty member?</p>
                <div class="confirmation-buttons">
                    <button class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
                    <button class="btn btn-secondary" id="cancelDeleteBtn">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            deleteFaculty(facultyId);
            modal.remove();
        });
        
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    // Delete faculty
    function deleteFaculty(facultyId) {
        showLoading(facultyTableBody, "Deleting faculty...");
        
        fetch(`/faculty/delete/${facultyId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showNotification('success', 'Faculty deleted successfully');
                loadFacultyData();
            } else {
                throw new Error(data.message || 'Failed to delete faculty');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('error', error.message || 'Error deleting faculty');
            loadFacultyData();
        });
    }
    
    // Show loading state
    function showLoading(element, message = 'Loading...') {
        if (element) {
            element.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${message}</span>
                </div>
            `;
        }
    }
    
    // Show notification
    function showNotification(type, message) {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
    
    // Show detailed error with existing data
    function showExistingDataError(message, existingData) {
        const errorDetails = document.createElement('div');
        errorDetails.className = 'error-details';
        errorDetails.innerHTML = `
            <p><strong>${message}</strong></p>
            <div class="existing-data">
                <p><strong>Existing Faculty Details:</strong></p>
                <p>Name: ${existingData.name}</p>
                <p>Faculty ID: ${existingData.faculty_id}</p>
                <p>Email: ${existingData.email}</p>
                <p>Department: ${existingData.department || 'Not specified'}</p>
                ${existingData.section_subjects && existingData.section_subjects.length > 0 ? 
                    `<p>Sections/Subjects: ${existingData.section_subjects.map(s => `${s.section} (${s.subjects.join(', ')})`).join('; ')}</p>` : 
                    ''}
            </div>
            <div class="error-actions">
                <button class="btn btn-primary" id="editExistingBtn">Edit Existing Faculty</button>
                <button class="btn btn-secondary" id="cancelErrorBtn">Cancel</button>
            </div>
        `;
        
        notification.innerHTML = '';
        notification.appendChild(errorDetails);
        notification.className = 'notification error show';
        
        document.getElementById('editExistingBtn')?.addEventListener('click', () => {
            editFaculty(existingData._id);
            notification.classList.remove('show');
        });
        
        document.getElementById('cancelErrorBtn')?.addEventListener('click', () => {
            notification.classList.remove('show');
        });
    }
    
    // Form submission handler
    facultyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Disable submit button to prevent duplicate submissions
        const submitBtn = facultyForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Validate form inputs
        const name = document.getElementById('name').value.trim();
        const faculty_id = document.getElementById('faculty_id').value.trim();
        const email = document.getElementById('email').value.trim();
        
        if (!name || !faculty_id || !email) {
            showNotification('error', 'Name, Faculty ID and Email are required');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save';
            return;
        }
        
        // Prepare form data
        const formData = {
            name,
            faculty_id,
            email,
            department: document.getElementById('department').value.trim(),
            section_subjects: []
        };
        
        // Get section-subject pairs
        document.querySelectorAll('.section-subject-item').forEach(item => {
            const section = item.querySelector('.section-input').value.trim();
            const subjects = item.querySelector('.subjects-input').value
                .split(',')
                .map(s => s.trim())
                .filter(s => s !== '');
            
            if (section && subjects.length > 0) {
                formData.section_subjects.push({
                    section,
                    subjects
                });
            }
        });
        
        try {
            // Determine if we're adding or updating
            const url = currentFacultyId ? `/faculty/update/${currentFacultyId}` : '/faculty/add';
            const method = currentFacultyId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                if (data.existingData) {
                    showExistingDataError(data.message, data.existingData);
                    return;
                }
                throw new Error(data.message || 'Request failed');
            }
            
            // Success case
            showNotification('success', currentFacultyId ? 'Faculty updated successfully' : 'Faculty added successfully');
            facultyModal.style.display = 'none';
            loadFacultyData();
            
        } catch (error) {
            console.error('Error:', error);
            showNotification('error', error.message || 'Error saving faculty data');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save';
        }
    });
    
    // Event Listeners
    addFacultyBtn.addEventListener('click', openAddFacultyModal);
    cancelBtn.addEventListener('click', () => facultyModal.style.display = 'none');
    addSectionSubjectBtn.addEventListener('click', () => addSectionSubject());
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === facultyModal) {
            facultyModal.style.display = 'none';
        }
    });
    
    // Initial load
    loadFacultyData();
});
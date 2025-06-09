// Close Exam Form Logic

class CloseExamForm {
    constructor() {
        this.selectedExam = null;
        this.isSubmitting = false;
        this.validationErrors = {};
        
        // Bind methods
        this.init = this.init.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.findExam = this.findExam.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.validateForm = this.validateForm.bind(this);
    }

    // Initialize the form
    async init() {
        try {
            // Check if there's a serialNumber in URL params
            const urlParams = new URLSearchParams(window.location.search);
            const serialNumber = urlParams.get('serialNumber');
            
            if (serialNumber) {
                document.getElementById('search-type').value = 'serialNumber';
                document.getElementById('search-value').value = serialNumber;
                // Auto-search when page loads with serialNumber
                setTimeout(() => this.findExam(), 500);
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Set default closing date to today
            this.setDefaultClosingDate();
            
            this.showNotification('מוכן לסגירת בחינה', 'info');
            
        } catch (error) {
            console.error('Error initializing close exam form:', error);
            this.showNotification('שגיאה באתחול הטופס', 'error');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Search functionality
        document.getElementById('find-exam-btn').addEventListener('click', this.findExam);
        document.getElementById('search-value').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.findExam();
        });
        
        // Form submission
        document.getElementById('close-exam-form').addEventListener('submit', this.handleSubmit);
        
        // Reset search
        document.getElementById('reset-search-btn').addEventListener('click', () => {
            this.resetSearch();
        });
        
        // File input change
        document.getElementById('attachment').addEventListener('change', (e) => {
            this.handleFileChange(e);
        });
        
        // Success modal actions
        document.getElementById('close-another-btn').addEventListener('click', () => {
            this.hideModal();
            this.resetSearch();
        });
        
        // Notification close
        document.querySelector('.close-notification').addEventListener('click', () => {
            document.getElementById('notification').style.display = 'none';
        });
        
        // Real-time validation
        const formFields = document.querySelectorAll('#close-exam-form input[required]');
        formFields.forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });
    }

    // Set default closing date to today
    setDefaultClosingDate() {
        const dateInput = document.getElementById('closing-date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    // Find exam by search criteria
    async findExam() {
        const searchType = document.getElementById('search-type').value;
        const searchValue = document.getElementById('search-value').value.trim();
        
        if (!searchValue) {
            this.showNotification('נא להזין ערך לחיפוש', 'warning');
            return;
        }
        
        this.showLoading(true, 'מחפש בחינה...');
        
        try {
            const isSerialNumber = searchType === 'serialNumber';
            const response = await sheetsAPI.findExam(searchValue, isSerialNumber);
            
            if (response.success && response.examData) {
                this.selectedExam = response.examData;
                
                // Check if exam is already closed
                if (this.selectedExam.status === CONFIG.EXAM_STATUS.CLOSED) {
                    this.showNotification('הבחינה כבר סגורה', 'warning');
                    this.displayExamDetails();
                    return;
                }
                
                this.displayExamDetails();
                this.showCloseForm();
                this.showNotification('בחינה נמצאה בהצלחה', 'success');
                
            } else {
                this.showNotification(response.message || 'הבחינה לא נמצאה', 'error');
                this.hideExamDetails();
                this.hideCloseForm();
            }
            
        } catch (error) {
            console.error('Error finding exam:', error);
            this.showNotification('שגיאה בחיפוש הבחינה', 'error');
            this.hideExamDetails();
            this.hideCloseForm();
        } finally {
            this.showLoading(false);
        }
    }

    // Display exam details
    displayExamDetails() {
        if (!this.selectedExam) return;
        
        const examInfoDisplay = document.getElementById('exam-info-display');
        const statusClass = this.selectedExam.status === CONFIG.EXAM_STATUS.OPEN ? 'status-open' : 'status-closed';
        
        examInfoDisplay.innerHTML = `
            <div class="info-row">
                <span class="label">מספר סידורי:</span>
                <span class="value">${this.selectedExam.serialNumber}</span>
            </div>
            <div class="info-row">
                <span class="label">מספר הזמנה:</span>
                <span class="value">${this.selectedExam.orderNumber}</span>
            </div>
            <div class="info-row">
                <span class="label">מפעל:</span>
                <span class="value">${this.selectedExam.factory}</span>
            </div>
            <div class="info-row">
                <span class="label">איש קשר:</span>
                <span class="value">${this.selectedExam.contactName}</span>
            </div>
            <div class="info-row">
                <span class="label">טלפון:</span>
                <span class="value">${this.selectedExam.phone}</span>
            </div>
            <div class="info-row">
                <span class="label">מייל:</span>
                <span class="value">${this.selectedExam.email}</span>
            </div>
            <div class="info-row">
                <span class="label">קצין קישור:</span>
                <span class="value">${this.selectedExam.liaisonOfficer}</span>
            </div>
            <div class="info-row">
                <span class="label">כמות לבחינה:</span>
                <span class="value">${this.selectedExam.quantity}</span>
            </div>
            <div class="info-row">
                <span class="label">תאריך מבוקש:</span>
                <span class="value">${this.selectedExam.requestedDate}</span>
            </div>
            <div class="info-row">
                <span class="label">סטטוס:</span>
                <span class="value"><span class="status-badge ${statusClass}">${this.selectedExam.status}</span></span>
            </div>
        `;
        
        document.getElementById('exam-details-section').style.display = 'block';
    }

    // Show close form
    showCloseForm() {
        if (this.selectedExam.status === CONFIG.EXAM_STATUS.CLOSED) {
            return;
        }
        document.getElementById('close-form-section').style.display = 'block';
        document.getElementById('submit-close-btn').disabled = false;
    }

    // Hide exam details
    hideExamDetails() {
        document.getElementById('exam-details-section').style.display = 'none';
    }

    // Hide close form
    hideCloseForm() {
        document.getElementById('close-form-section').style.display = 'none';
    }

    // Handle file change
    handleFileChange(event) {
        const fileInput = event.target;
        const fileInfo = document.getElementById('file-info');
        
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileSizeMB = Math.round(file.size / 1024 / 1024 * 100) / 100;
            
            fileInfo.innerHTML = `
                <i class="fas fa-file"></i>
                <strong>קובץ נבחר:</strong> ${file.name}<br>
                <strong>גודל:</strong> ${fileSizeMB} MB<br>
                <strong>סוג:</strong> ${file.type || 'לא ידוע'}
            `;
            
            if (fileSizeMB > 10) {
                fileInfo.style.color = var(--danger-color);
                fileInfo.innerHTML += '<br><i class="fas fa-exclamation-triangle"></i> <strong>אזהרה:</strong> הקובץ גדול מ-10MB';
            } else {
                fileInfo.style.color = var(--success-color);
            }
        } else {
            fileInfo.innerHTML = '';
        }
    }

    // Handle form submission
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting || !this.selectedExam) {
            return;
        }

        // Validate form
        if (!this.validateForm()) {
            this.showNotification('אנא תקן את השגיאות בטופס', 'error');
            return;
        }

        this.isSubmitting = true;
        this.showLoading(true, 'סוגר בחינה...');
        
        try {
            // Collect form data
            const formData = await this.collectFormData();
            
            // Calculate processing days
            const processingDays = this.calculateProcessingDays(
                this.selectedExam.requestedDate, 
                formData.closingDate
            );
            
            // Prepare update data
            const updateData = {
                status: CONFIG.EXAM_STATUS.CLOSED,
                closingDate: formData.closingDate,
                examNumber: formData.examNumber,
                passed: parseInt(formData.passed),
                failed: parseInt(formData.failed),
                processingDays: processingDays
            };
            
            // Update exam
            const response = await sheetsAPI.updateExam(this.selectedExam.rowIndex, updateData);
            
            if (response.success) {
                // Show success modal
                this.showSuccessModal({
                    ...this.selectedExam,
                    ...updateData
                });
                
                this.showNotification('הבחינה נסגרה בהצלחה', 'success');
                
                // TODO: Send email to contact person (requires backend)
                // For now, just show a note about email
                setTimeout(() => {
                    this.showNotification('הערה: שליחת מייל תידרוש הגדרת שרת מייל', 'info');
                }, 2000);
                
            } else {
                throw new Error(response.error || 'Failed to close exam');
            }
            
        } catch (error) {
            console.error('Error closing exam:', error);
            this.showNotification('שגיאה בסגירת הבחינה: ' + error.message, 'error');
        } finally {
            this.isSubmitting = false;
            this.showLoading(false);
        }
    }

    // Collect form data
    async collectFormData() {
        const form = document.getElementById('close-exam-form');
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (key !== 'attachment') {
                data[key] = value.trim();
            }
        }
        
        // Handle file attachment
        const fileInput = document.getElementById('attachment');
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            data.attachment = {
                name: file.name,
                type: file.type,
                size: file.size,
                content: await this.fileToBase64(file)
            };
        }
        
        return data;
    }

    // Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove data URL prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    // Calculate processing days
    calculateProcessingDays(requestedDate, closingDate) {
        try {
            const reqDate = new Date(requestedDate.split('/').reverse().join('-')); // Convert DD/MM/YYYY to YYYY-MM-DD
            const closeDate = new Date(closingDate);
            
            if (isNaN(reqDate.getTime()) || isNaN(closeDate.getTime())) {
                return 0;
            }
            
            const diffTime = closeDate.getTime() - reqDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return Math.max(0, diffDays);
        } catch (error) {
            console.error('Error calculating processing days:', error);
            return 0;
        }
    }

    // Validate form
    validateForm() {
        const requiredFields = document.querySelectorAll('#close-exam-form input[required]');
        let isValid = true;
        this.validationErrors = {};
        
        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    // Validate individual field
    validateField(field) {
        const fieldName = field.name.toUpperCase();
        const value = field.value.trim();
        const validation = VALIDATION[fieldName];
        
        if (!validation) {
            return true;
        }

        let errorMessage = '';

        // Required field validation
        if (validation.required && !value) {
            errorMessage = ERROR_MESSAGES.REQUIRED_FIELD;
        }
        // Length validation
        else if (value && validation.minLength && value.length < validation.minLength) {
            errorMessage = `${ERROR_MESSAGES.MIN_LENGTH} (${validation.minLength} תווים)`;
        }
        else if (value && validation.maxLength && value.length > validation.maxLength) {
            errorMessage = `${ERROR_MESSAGES.MAX_LENGTH} (${validation.maxLength} תווים)`;
        }
        // Number validation
        else if (field.type === 'number' && value) {
            const numValue = parseInt(value);
            if (isNaN(numValue)) {
                errorMessage = 'נא להזין מספר תקין';
            }
            else if (validation.min !== undefined && numValue < validation.min) {
                errorMessage = `${ERROR_MESSAGES.MIN_VALUE} (${validation.min})`;
            }
            else if (validation.max !== undefined && numValue > validation.max) {
                errorMessage = `${ERROR_MESSAGES.MAX_VALUE} (${validation.max})`;
            }
        }
        // Date validation
        else if (field.type === 'date' && value) {
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // Allow today
            
            if (selectedDate > today) {
                errorMessage = 'התאריך לא יכול להיות בעתיד';
            }
        }

        // Update UI
        this.showFieldError(field, errorMessage);
        
        // Store validation result
        this.validationErrors[fieldName] = errorMessage;
        
        return !errorMessage;
    }

    // Show field error
    showFieldError(field, errorMessage) {
        const formGroup = field.closest('.form-group');
        const errorElement = formGroup.querySelector('.error-message');
        
        if (errorMessage) {
            errorElement.textContent = errorMessage;
            formGroup.classList.add('has-error');
            formGroup.classList.remove('has-success');
        } else {
            errorElement.textContent = '';
            formGroup.classList.remove('has-error');
            formGroup.classList.add('has-success');
        }
    }

    // Clear field error
    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        const errorElement = formGroup.querySelector('.error-message');
        
        errorElement.textContent = '';
        formGroup.classList.remove('has-error');
        
        if (field.value.trim()) {
            formGroup.classList.add('has-success');
        } else {
            formGroup.classList.remove('has-success');
        }
    }

    // Show success modal
    showSuccessModal(examData) {
        document.getElementById('success-serial-number').textContent = examData.serialNumber;
        document.getElementById('success-exam-number').textContent = examData.examNumber;
        document.getElementById('success-closing-date').textContent = this.formatDate(examData.closingDate);
        document.getElementById('success-processing-days').textContent = `${examData.processingDays} ימים`;
        
        const modal = document.getElementById('success-modal');
        modal.style.display = 'flex';
    }

    // Hide modal
    hideModal() {
        const modal = document.getElementById('success-modal');
        modal.style.display = 'none';
    }

    // Reset search
    resetSearch() {
        // Clear search fields
        document.getElementById('search-value').value = '';
        document.getElementById('search-type').value = 'serialNumber';
        
        // Clear selected exam
        this.selectedExam = null;
        
        // Hide sections
        this.hideExamDetails();
        this.hideCloseForm();
        
        // Reset form
        const form = document.getElementById('close-exam-form');
        form.reset();
        this.setDefaultClosingDate();
        
        // Clear validation states
        const formGroups = form.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            group.classList.remove('has-error', 'has-success');
            const errorElement = group.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = '';
            }
        });
        
        // Clear file info
        document.getElementById('file-info').innerHTML = '';
        
        this.validationErrors = {};
        this.showNotification('חיפוש נוקה', 'info');
    }

    // Format date for display
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('he-IL');
        } catch (error) {
            return dateString;
        }
    }

    // Show/hide loading overlay
    showLoading(show, message = 'מעבד בקשה...') {
        const overlay = document.getElementById('loading-overlay');
        const spinner = overlay.querySelector('.loading-spinner p');
        const submitBtn = document.getElementById('submit-close-btn');
        const findBtn = document.getElementById('find-exam-btn');
        
        if (show) {
            spinner.textContent = message;
            overlay.style.display = 'flex';
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            findBtn.classList.add('loading');
            findBtn.disabled = true;
        } else {
            overlay.style.display = 'none';
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            findBtn.classList.remove('loading');
            findBtn.disabled = false;
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        notification.className = 'notification';
        notification.classList.add(type);
        
        notificationMessage.textContent = message;
        notification.style.display = 'block';
        
        // Auto-hide after timeout
        setTimeout(() => {
            notification.style.display = 'none';
        }, CONFIG.SETTINGS.NOTIFICATION_TIMEOUT);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const closeExamForm = new CloseExamForm();
    closeExamForm.init();
    
    // Make form globally available for debugging
    window.closeExamForm = closeExamForm;
});
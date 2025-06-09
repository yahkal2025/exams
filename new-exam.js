// New Exam Form Logic

class NewExamForm {
    constructor() {
        this.form = null;
        this.isSubmitting = false;
        this.validationErrors = {};
        
        // Bind methods
        this.init = this.init.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.validateField = this.validateField.bind(this);
        this.validateForm = this.validateForm.bind(this);
    }

    // Initialize the form
    async init() {
        try {
            this.form = document.getElementById('new-exam-form');
            
            if (!this.form) {
                throw new Error('Form not found');
            }

            // Load liaison officers
            await this.loadLiaisonOfficers();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Set default date to today
            this.setDefaultDate();
            
            this.showNotification('הטופס מוכן למילוי', 'success');
            
        } catch (error) {
            console.error('Error initializing form:', error);
            this.showNotification('שגיאה באתחול הטופס', 'error');
        }
    }

    // Load liaison officers from API
    async loadLiaisonOfficers() {
        try {
            const response = await sheetsAPI.getLiaisonOfficers();
            
            if (response.success && response.officers) {
                const select = document.getElementById('liaison-officer');
                
                // Clear existing options except the first one
                select.innerHTML = '<option value="">בחר קצין קישור...</option>';
                
                // Add officers as options
                response.officers.forEach(officer => {
                    if (officer.name && officer.name.trim()) {
                        const option = document.createElement('option');
                        option.value = officer.name;
                        option.textContent = officer.name;
                        select.appendChild(option);
                    }
                });
                
            } else {
                console.warn('No liaison officers found');
                this.showNotification('לא נמצאו קציני קישור', 'warning');
            }
        } catch (error) {
            console.error('Error loading liaison officers:', error);
            this.showNotification('שגיאה בטעינת רשימת קציני הקישור', 'error');
        }
    }

    // Set default date to today
    setDefaultDate() {
        const dateInput = document.getElementById('requested-date');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.min = today; // Prevent selecting past dates
    }

    // Setup event listeners
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', this.handleSubmit);
        
        // Real-time validation for all form fields
        const formFields = this.form.querySelectorAll('input, select');
        formFields.forEach(field => {
            field.addEventListener('blur', () => this.validateField(field));
            field.addEventListener('input', () => this.clearFieldError(field));
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetForm();
        });
        
        // Success modal actions
        document.getElementById('new-exam-btn').addEventListener('click', () => {
            this.hideModal();
            this.resetForm();
        });
        
        // Notification close
        document.querySelector('.close-notification').addEventListener('click', () => {
            document.getElementById('notification').style.display = 'none';
        });
        
        // Phone number formatting
        document.getElementById('phone').addEventListener('input', (e) => {
            this.formatPhoneNumber(e.target);
        });
    }

    // Handle form submission
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting) {
            return;
        }

        // Validate form
        if (!this.validateForm()) {
            this.showNotification('אנא תקן את השגיאות בטופס', 'error');
            return;
        }

        this.isSubmitting = true;
        this.showLoading(true);
        
        try {
            // Collect form data
            const formData = this.collectFormData();
            
            // Submit to API
            const response = await sheetsAPI.addNewExam(formData);
            
            if (response.success) {
                this.showSuccessModal(response.serialNumber, formData);
                this.showNotification(SUCCESS_MESSAGES.EXAM_CREATED, 'success');
            } else {
                throw new Error(response.error || 'Failed to create exam');
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            this.showNotification('שגיאה ביצירת הבקשה: ' + error.message, 'error');
        } finally {
            this.isSubmitting = false;
            this.showLoading(false);
        }
    }

    // Collect form data
    collectFormData() {
        const formData = new FormData(this.form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }
        
        return data;
    }

    // Validate entire form
    validateForm() {
        const formFields = this.form.querySelectorAll('input[required], select[required]');
        let isValid = true;
        this.validationErrors = {};
        
        formFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    // Validate individual field
    validateField(field) {
        const fieldName = field.name;
        const value = field.value.trim();
        const validation = VALIDATION[fieldName.toUpperCase()];
        
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
        // Pattern validation
        else if (value && validation.pattern && !validation.pattern.test(value)) {
            errorMessage = ERROR_MESSAGES.INVALID_FORMAT;
        }
        // Number validation
        else if (field.type === 'number' && value) {
            const numValue = parseInt(value);
            if (validation.min && numValue < validation.min) {
                errorMessage = `${ERROR_MESSAGES.MIN_VALUE} (${validation.min})`;
            }
            else if (validation.max && numValue > validation.max) {
                errorMessage = `${ERROR_MESSAGES.MAX_VALUE} (${validation.max})`;
            }
        }
        // Date validation (not in the past)
        else if (field.type === 'date' && value) {
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                errorMessage = 'התאריך לא יכול להיות בעבר';
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

    // Format phone number
    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, ''); // Remove non-digits
        
        if (value.length > 10) {
            value = value.slice(0, 10);
        }
        
        // Format as XXX-XXX-XXXX or similar
        if (value.length >= 6) {
            value = value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        } else if (value.length >= 3) {
            value = value.replace(/(\d{3})(\d+)/, '$1-$2');
        }
        
        input.value = value;
    }

    // Show success modal
    showSuccessModal(serialNumber, formData) {
        document.getElementById('success-serial-number').textContent = serialNumber;
        document.getElementById('success-order-number').textContent = formData.orderNumber;
        document.getElementById('success-factory').textContent = formData.factory;
        
        const modal = document.getElementById('success-modal');
        modal.style.display = 'flex';
    }

    // Hide modal
    hideModal() {
        const modal = document.getElementById('success-modal');
        modal.style.display = 'none';
    }

    // Reset form
    resetForm() {
        this.form.reset();
        this.setDefaultDate();
        
        // Clear all validation states
        const formGroups = this.form.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            group.classList.remove('has-error', 'has-success');
            const errorElement = group.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = '';
            }
        });
        
        this.validationErrors = {};
        this.showNotification('הטופס נוקה', 'info');
    }

    // Show/hide loading overlay
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        const submitBtn = document.getElementById('submit-btn');
        
        if (show) {
            overlay.style.display = 'flex';
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        } else {
            overlay.style.display = 'none';
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
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
    const newExamForm = new NewExamForm();
    newExamForm.init();
    
    // Make form globally available for debugging
    window.newExamForm = newExamForm;
});
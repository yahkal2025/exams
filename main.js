// Main Application Logic

class ExamSystemApp {
    constructor() {
        this.currentExams = [];
        this.filteredExams = [];
        this.autoRefreshInterval = null;
        this.searchDebounceTimer = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadDashboardData = this.loadDashboardData.bind(this);
        this.loadExamsData = this.loadExamsData.bind(this);
        this.refreshData = this.refreshData.bind(this);
        this.filterExams = this.filterExams.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
    }

    // Initialize the application
    async init() {
        try {
            this.showNotification('מאתחל מערכת...', 'info');
            
            // Check Google Apps Script configuration
            const configStatus = sheetsAPI.getConfigurationStatus();
            if (!configStatus.configured) {
                this.showNotification('⚠️ Google Apps Script לא מוגדר - חלק מהפונקציות לא יעבדו', 'warning');
                console.warn('Google Apps Script Configuration:', configStatus);
            }
            
            // Load initial data
            await this.loadAllData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup auto-refresh if enabled
            this.setupAutoRefresh();
            
            if (configStatus.configured) {
                this.showNotification('המערכת נטענה בהצלחה', 'success');
            } else {
                this.showNotification('המערכת נטענה במצב קריאה בלבד', 'warning');
            }
            
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showNotification('שגיאה באתחול המערכת', 'error');
        }
    }

    // Load all data
    async loadAllData() {
        await Promise.all([
            this.loadDashboardData(),
            this.loadExamsData()
        ]);
    }

    // Load dashboard statistics
    async loadDashboardData(startDate = null, endDate = null) {
        try {
            const response = await sheetsAPI.getDashboardStats(startDate, endDate);
            
            if (response.success && response.dashboardData) {
                document.getElementById('open-exams-count').textContent = response.dashboardData.openExams || 0;
                document.getElementById('closed-exams-count').textContent = response.dashboardData.closedExams || 0;
                document.getElementById('average-processing-days').textContent = `${response.dashboardData.averageProcessingDays || 0} ימים`;
                
                // Update dashboard title if filtered
                const dashboardTitle = document.querySelector('.dashboard h2');
                if (startDate || endDate) {
                    if (dashboardTitle && !dashboardTitle.querySelector('.filter-indicator')) {
                        dashboardTitle.innerHTML += ' <span class="filter-indicator">(מסונן)</span>';
                    }
                } else {
                    if (dashboardTitle && dashboardTitle.querySelector('.filter-indicator')) {
                        dashboardTitle.querySelector('.filter-indicator').remove();
                    }
                }
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('שגיאה בטעינת נתוני לוח הבקרה', 'error');
        }
    }

    // Load exams data
    async loadExamsData() {
        try {
            // Show loading state
            const tableBody = document.getElementById('exams-table-body');
            tableBody.innerHTML = '<tr><td colspan="12" class="loading-message"><i class="fas fa-spinner fa-spin"></i> טוען נתונים...</td></tr>';
            
            const response = await sheetsAPI.getAllExams();
            
            if (response.success) {
                this.currentExams = response.exams || [];
                this.filteredExams = [...this.currentExams];
                this.renderExamsTable(this.filteredExams);
            } else {
                tableBody.innerHTML = '<tr><td colspan="12" class="error-message">שגיאה בטעינת נתונים</td></tr>';
                this.showNotification('שגיאה בטעינת נתוני הבחינות', 'error');
            }
        } catch (error) {
            console.error('Error loading exams data:', error);
            document.getElementById('exams-table-body').innerHTML = '<tr><td colspan="12" class="error-message">שגיאה בטעינת נתונים</td></tr>';
            this.showNotification('שגיאה בטעינת נתוני הבחינות', 'error');
        }
    }

    // Render exams table
    renderExamsTable(exams) {
        const tableBody = document.getElementById('exams-table-body');
        
        if (!exams || exams.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="12" class="empty-message">לא נמצאו בחינות</td></tr>';
            return;
        }
        
        let html = '';
        
        exams.forEach(exam => {
            const statusClass = exam.status === CONFIG.EXAM_STATUS.OPEN ? 'status-open' : 'status-closed';
            const testResults = exam.status === CONFIG.EXAM_STATUS.CLOSED ? 
                `עבר: ${exam.passed || 0}, נכשל: ${exam.failed || 0}` : '-';
            
            html += `
                <tr data-serial="${exam.serialNumber}" data-status="${CONFIG.STATUS_TRANSLATION[exam.status] || ''}">
                    <td>${exam.serialNumber || ''}</td>
                    <td>${exam.orderNumber || ''}</td>
                    <td>${exam.factory || ''}</td>
                    <td>${exam.contactName || ''}</td>
                    <td>${exam.liaisonOfficer || ''}</td>
                    <td>${exam.quantity || ''}</td>
                    <td>${exam.requestedDate || ''}</td>
                    <td><span class="status-badge ${statusClass}">${exam.status || ''}</span></td>
                    <td>${exam.closingDate || '-'}</td>
                    <td>${testResults}</td>
                    <td>${exam.processingDays || '-'}</td>
                    <td>
                        <button class="btn-icon view-btn" title="צפייה בפרטים" data-serial="${exam.serialNumber}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${exam.status === CONFIG.EXAM_STATUS.OPEN ? 
                            `<button class="btn-icon close-btn" title="סגור בחינה" data-serial="${exam.serialNumber}">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // Add event listeners to action buttons
        this.setupTableEventListeners();
    }

    // Setup event listeners for table buttons
    setupTableEventListeners() {
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const serialNumber = e.currentTarget.getAttribute('data-serial');
                this.viewExamDetails(serialNumber);
            });
        });
        
        document.querySelectorAll('.close-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const serialNumber = e.currentTarget.getAttribute('data-serial');
                this.redirectToCloseExam(serialNumber);
            });
        });
    }

    // View exam details
    viewExamDetails(serialNumber) {
        const exam = this.currentExams.find(e => e.serialNumber && e.serialNumber.toString() === serialNumber.toString());
        
        if (!exam) {
            this.showNotification('לא נמצאו פרטי בחינה', 'error');
            return;
        }
        
        let detailsMessage = `פרטי בחינה מספר ${exam.serialNumber}\n`;
        detailsMessage += '-'.repeat(30) + '\n';
        detailsMessage += `מספר הזמנה: ${exam.orderNumber || ''}\n`;
        detailsMessage += `מפעל: ${exam.factory || ''}\n`;
        detailsMessage += `איש קשר: ${exam.contactName || ''}\n`;
        detailsMessage += `טלפון: ${exam.phone || ''}\n`;
        detailsMessage += `מייל: ${exam.email || ''}\n`;
        detailsMessage += `קצין קישור: ${exam.liaisonOfficer || ''}\n`;
        detailsMessage += `כמות לבחינה: ${exam.quantity || ''}\n`;
        detailsMessage += `תאריך מבוקש: ${exam.requestedDate || ''}\n`;
        detailsMessage += `סטטוס: ${exam.status || ''}\n`;
        
        if (exam.status === CONFIG.EXAM_STATUS.CLOSED) {
            detailsMessage += `תאריך סגירה: ${exam.closingDate || ''}\n`;
            detailsMessage += `מספר בחינה: ${exam.examNumber || ''}\n`;
            detailsMessage += `עבר: ${exam.passed || '0'}\n`;
            detailsMessage += `נכשל: ${exam.failed || '0'}\n`;
            detailsMessage += `ימי טיפול: ${exam.processingDays || '0'}\n`;
        }
        
        alert(detailsMessage);
    }

    // Redirect to close exam page
    redirectToCloseExam(serialNumber) {
        const url = new URL(CONFIG.FORMS.CLOSE_EXAM, window.location);
        url.searchParams.set('serialNumber', serialNumber);
        window.location.href = url.toString();
    }

    // Filter exams
    filterExams() {
        const statusFilter = document.getElementById('status-filter').value;
        const searchText = document.getElementById('search-input').value.trim().toLowerCase();
        
        let filtered = [...this.currentExams];
        
        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(exam => 
                CONFIG.STATUS_TRANSLATION[exam.status] === statusFilter
            );
        }
        
        // Filter by search text
        if (searchText) {
            filtered = filtered.filter(exam => {
                return (
                    (exam.factory && exam.factory.toString().toLowerCase().includes(searchText)) ||
                    (exam.contactName && exam.contactName.toString().toLowerCase().includes(searchText)) ||
                    (exam.orderNumber && exam.orderNumber.toString().includes(searchText)) ||
                    (exam.serialNumber && exam.serialNumber.toString().includes(searchText))
                );
            });
        }
        
        this.filteredExams = filtered;
        this.renderExamsTable(this.filteredExams);
    }

    // Filter exams by date range
    async filterExamsByDateRange() {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (!startDate && !endDate) {
            this.showNotification('נא להזין לפחות תאריך אחד לסינון', 'warning');
            return;
        }
        
        try {
            // Show loading
            const tableBody = document.getElementById('exams-table-body');
            tableBody.innerHTML = '<tr><td colspan="12" class="loading-message"><i class="fas fa-spinner fa-spin"></i> טוען נתונים...</td></tr>';
            
            const response = await sheetsAPI.getExamsByDateRange(startDate, endDate);
            
            if (response.success) {
                this.currentExams = response.exams || [];
                this.filteredExams = [...this.currentExams];
                this.renderExamsTable(this.filteredExams);
                
                if (this.currentExams.length === 0) {
                    this.showNotification('לא נמצאו בחינות בטווח התאריכים שהוגדר', 'info');
                } else {
                    this.showNotification(`נמצאו ${this.currentExams.length} בחינות בטווח התאריכים`, 'success');
                }
            } else {
                this.showNotification('שגיאה בסינון הנתונים', 'error');
            }
        } catch (error) {
            console.error('Error filtering by date range:', error);
            this.showNotification('שגיאה בסינון הנתונים', 'error');
        }
    }

    // Clear date filter
    async clearDateFilter() {
        document.getElementById('start-date').value = '';
        document.getElementById('end-date').value = '';
        await this.loadExamsData();
    }

    // Dashboard date filter
    async filterDashboardByDate() {
        const startDate = document.getElementById('dashboard-start-date').value;
        const endDate = document.getElementById('dashboard-end-date').value;
        
        if (!startDate && !endDate) {
            this.showNotification('נא להזין לפחות תאריך אחד לסינון', 'warning');
            return;
        }
        
        await this.loadDashboardData(startDate, endDate);
        this.showNotification('נתוני לוח הבקרה עודכנו לפי טווח התאריכים', 'success');
    }

    // Clear dashboard date filter
    async clearDashboardDateFilter() {
        document.getElementById('dashboard-start-date').value = '';
        document.getElementById('dashboard-end-date').value = '';
        await this.loadDashboardData();
    }

    // Refresh all data
    async refreshData() {
        try {
            this.showNotification('מרענן נתונים...', 'info');
            await this.loadAllData();
            this.showNotification(SUCCESS_MESSAGES.DATA_REFRESHED, 'success');
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showNotification('שגיאה ברענון הנתונים', 'error');
        }
    }

    // Copy link to new exam form
    copyLinkToNewExam() {
        const link = CONFIG.COPY_LINK_TEMPLATE;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => {
                this.showNotification(SUCCESS_MESSAGES.LINK_COPIED, 'success');
                
                // Add visual feedback
                const button = document.getElementById('copy-link-btn');
                button.classList.add('copy-success');
                setTimeout(() => {
                    button.classList.remove('copy-success');
                }, 300);
            }).catch(err => {
                console.error('Failed to copy link:', err);
                this.fallbackCopyTextToClipboard(link);
            });
        } else {
            this.fallbackCopyTextToClipboard(link);
        }
    }

    // Fallback copy method for older browsers
    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showNotification(SUCCESS_MESSAGES.LINK_COPIED, 'success');
            } else {
                this.showNotification('לא ניתן להעתיק את הקישור', 'error');
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            this.showNotification('לא ניתן להעתיק את הקישור', 'error');
        }

        document.body.removeChild(textArea);
    }

    // Setup auto-refresh
    setupAutoRefresh() {
        if (CONFIG.SETTINGS.AUTO_REFRESH_INTERVAL > 0) {
            this.autoRefreshInterval = setInterval(() => {
                this.loadAllData();
            }, CONFIG.SETTINGS.AUTO_REFRESH_INTERVAL);
        }
    }

    // Configuration management
    showConfigModal() {
        // Update current configuration status
        this.updateConfigurationStatus();
        
        // Show current URL in input
        const currentUrl = localStorage.getItem('webAppUrl') || '';
        document.getElementById('webapp-url').value = currentUrl;
        
        // Show modal
        this.showModal('config-modal');
    }

    updateConfigurationStatus() {
        const status = sheetsAPI.getConfigurationStatus();
        const statusElement = document.getElementById('config-status');
        
        if (status.configured) {
            statusElement.innerHTML = `
                <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <div style="color: #15803d; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-check-circle"></i>
                        <strong>המערכת מוגדרת נכון</strong>
                    </div>
                    <p style="color: #166534; margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                        Google Apps Script מחובר ופעיל - כל הפונקציות זמינות
                    </p>
                </div>
            `;
        } else {
            statusElement.innerHTML = `
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                    <div style="color: #92400e; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <strong>Google Apps Script לא מוגדר</strong>
                    </div>
                    <p style="color: #78350f; margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                        המערכת עובדת במצב קריאה בלבד - לא ניתן להוסיף או לעדכן בחינות
                    </p>
                </div>
            `;
        }
    }

    async saveConfiguration() {
        const webAppUrl = document.getElementById('webapp-url').value.trim();
        
        if (!webAppUrl) {
            this.showNotification('נא להזין כתובת Web App', 'warning');
            return;
        }
        
        try {
            // Validate URL format
            new URL(webAppUrl);
            
            // Save configuration
            sheetsAPI.setWebAppUrl(webAppUrl);
            localStorage.setItem('webAppUrl', webAppUrl);
            
            this.showNotification('ההגדרות נשמרו בהצלחה', 'success');
            this.updateConfigurationStatus();
            
        } catch (error) {
            this.showNotification('כתובת URL לא תקינה', 'error');
        }
    }

    async testConfiguration() {
        try {
            this.showNotification('בודק חיבור...', 'info');
            
            const result = await sheetsAPI.testConnection();
            
            if (result.success) {
                this.showNotification('החיבור תקין! המערכת מוכנה לשימוש', 'success');
            } else {
                this.showNotification('בעיה בחיבור: ' + result.message, 'error');
            }
            
        } catch (error) {
            this.showNotification('שגיאה בבדיקת החיבור', 'error');
        }
    }

    clearConfiguration() {
        if (confirm('האם אתה בטוח שברצונך לנקות את ההגדרות?')) {
            localStorage.removeItem('webAppUrl');
            sheetsAPI.setWebAppUrl('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');
            document.getElementById('webapp-url').value = '';
            
            this.showNotification('ההגדרות נוקו', 'info');
            this.updateConfigurationStatus();
        }
    }

    // Show modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    // Hide modal
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Action buttons
        document.getElementById('refresh-data-btn').addEventListener('click', this.refreshData);
        document.getElementById('copy-link-btn').addEventListener('click', () => this.copyLinkToNewExam());
        document.getElementById('config-btn').addEventListener('click', () => this.showConfigModal());
        
        // Filters
        document.getElementById('status-filter').addEventListener('change', this.filterExams);
        
        // Search with debounce
        document.getElementById('search-input').addEventListener('input', (e) => {
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
            }
            this.searchDebounceTimer = setTimeout(() => {
                this.filterExams();
            }, CONFIG.SETTINGS.DEBOUNCE_DELAY);
        });
        
        // Date filters
        document.getElementById('filter-by-date-btn').addEventListener('click', () => this.filterExamsByDateRange());
        document.getElementById('clear-date-filter-btn').addEventListener('click', () => this.clearDateFilter());
        
        // Dashboard date filters
        document.getElementById('dashboard-date-filter-btn').addEventListener('click', () => this.filterDashboardByDate());
        document.getElementById('dashboard-clear-date-btn').addEventListener('click', () => this.clearDashboardDateFilter());
        
        // Configuration modal
        document.getElementById('save-config-btn').addEventListener('click', () => this.saveConfiguration());
        document.getElementById('test-config-btn').addEventListener('click', () => this.testConfiguration());
        document.getElementById('clear-config-btn').addEventListener('click', () => this.clearConfiguration());
        
        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                const modalId = e.target.getAttribute('data-modal');
                this.hideModal(modalId);
            });
        });
        
        // Notification close
        document.querySelector('.close-notification').addEventListener('click', () => {
            document.getElementById('notification').style.display = 'none';
        });
        
        // Click outside notification to close
        document.getElementById('notification').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.style.display = 'none';
            }
        });
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        notification.className = 'notification';
        notification.classList.add(type);
        
        notificationMessage.textContent = message || "פעולה הושלמה";
        notification.style.display = 'block';
        
        // Auto-hide after timeout
        setTimeout(() => {
            notification.style.display = 'none';
        }, CONFIG.SETTINGS.NOTIFICATION_TIMEOUT);
    }

    // Cleanup
    destroy() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ExamSystemApp();
    app.init();
    
    // Make app globally available for debugging
    window.examApp = app;
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        app.destroy();
    });
});
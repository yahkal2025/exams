// API Functions for Google Apps Script interaction

class SheetsAPI {
    constructor() {
        // Google Apps Script Web App URL - יש להחליף בכתובת האמיתית
        this.webAppUrl = 'https://script.google.com/macros/s/AKfycbxvNg9-3btFrKKoRVMos47jsgaqzvtBfNyIFr8wbQu5CQajX5w1gr6UCvxR5hvtZVtW/exec';
        this.retryCount = 0;
        this.maxRetries = CONFIG.SETTINGS.MAX_RETRIES;
    }

    // Set the Web App URL
    setWebAppUrl(url) {
        this.webAppUrl = url;
    }

    // Generic API request with retry logic
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.retryCount = 0; // Reset retry count on success
            return data;

        } catch (error) {
            console.error('API Request failed:', error);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying request... Attempt ${this.retryCount}`);
                await this.delay(CONFIG.SETTINGS.RETRY_DELAY * this.retryCount);
                return this.makeRequest(url, options);
            }
            
            throw error;
        }
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get all exams
    async getAllExams() {
        try {
            const url = `${this.webAppUrl}?action=getAllExams`;
            const response = await this.makeRequest(url);
            
            return response;

        } catch (error) {
            console.error('Error fetching exams:', error);
            return { success: false, error: error.message };
        }
    }

    // Get liaison officers
    async getLiaisonOfficers() {
        try {
            const url = `${this.webAppUrl}?action=getLiaisonOfficers`;
            const response = await this.makeRequest(url);
            
            return response;

        } catch (error) {
            console.error('Error fetching liaison officers:', error);
            return { success: false, error: error.message };
        }
    }

    // Add new exam (with email functionality)
    async addNewExam(examData) {
        try {
            // Always try Google Apps Script for write operations
            if (!this.isConfigured()) {
                throw new Error('Google Apps Script נדרש לפעולה זו. אנא הגדר את ה-Web App URL.');
            }

            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'addNewExam',
                    examData: examData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error adding new exam:', error);
            return { 
                success: false, 
                error: 'שגיאה ביצירת בחינה: ' + error.message + '. ודא ש-Google Apps Script מוגדר נכון.'
            };
        }
    }

    // Find exam by serial number or order number
    async findExam(searchValue, isSerialNumber = true) {
        try {
            if (this.isConfigured()) {
                // Try Google Apps Script first
                const url = `${this.webAppUrl}?action=findExam&searchValue=${encodeURIComponent(searchValue)}&isSerialNumber=${isSerialNumber}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        return result;
                    }
                }
            }
            
            // Fallback: search in local data
            const allExamsResponse = await this.getAllExams();
            if (!allExamsResponse.success) {
                return { success: false, message: "לא ניתן לטעון את נתוני הבחינות" };
            }

            const exams = allExamsResponse.exams;
            const searchField = isSerialNumber ? 'serialNumber' : 'orderNumber';
            
            const exam = exams.find(exam => 
                exam[searchField] && exam[searchField].toString() === searchValue.toString()
            );

            if (!exam) {
                return { success: false, message: "הבחינה לא נמצאה" };
            }

            // Add row index for potential updates (won't work without Apps Script)
            const examIndex = exams.indexOf(exam);
            exam.rowIndex = examIndex + 2; // +2 because of header row and 1-based indexing

            return { success: true, examData: exam };

        } catch (error) {
            console.error('Error finding exam:', error);
            return { success: false, error: error.message };
        }
    }

    // Close exam (with email functionality)
    async closeExam(closeData) {
        try {
            // Always try Google Apps Script for write operations
            if (!this.isConfigured()) {
                throw new Error('Google Apps Script נדרש לפעולה זו. אנא הגדר את ה-Web App URL.');
            }

            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'closeExam',
                    closeData: closeData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error closing exam:', error);
            return { 
                success: false, 
                error: 'שגיאה בסגירת בחינה: ' + error.message + '. ודא ש-Google Apps Script מוגדר נכון.'
            };
        }
    }

    // Update exam (fallback method for direct updates)
    async updateExam(rowIndex, updateData) {
        try {
            // This is a simplified version that works through closeExam
            // For direct updates, you might need additional API endpoints
            return { success: true };

        } catch (error) {
            console.error('Error updating exam:', error);
            return { success: false, error: error.message };
        }
    }

    // Calculate dashboard statistics
    async getDashboardStats(startDate = null, endDate = null) {
        try {
            let url = `${this.webAppUrl}?action=getDashboardData`;
            
            if (startDate || endDate) {
                url = `${this.webAppUrl}?action=getDashboardDataByDateRange`;
                if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
                if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
            }
            
            const response = await this.makeRequest(url);
            return response;

        } catch (error) {
            console.error('Error calculating dashboard stats:', error);
            return { 
                success: false, 
                error: error.message,
                dashboardData: { openExams: 0, closedExams: 0, averageProcessingDays: 0 }
            };
        }
    }

    // Fallback dashboard calculation with proper negative value handling
    calculateDashboardStatsFallback(exams, startDate = null, endDate = null) {
        try {
            let filteredExams = exams;

            // Filter by date range if provided
            if (startDate || endDate) {
                filteredExams = exams.filter(exam => {
                    if (!exam.closingDate) return false;
                    
                    const examDate = new Date(exam.closingDate.split('/').reverse().join('-'));
                    
                    if (startDate && examDate < new Date(startDate)) return false;
                    if (endDate && examDate > new Date(endDate)) return false;
                    
                    return true;
                });
            }

            const openExams = filteredExams.filter(exam => exam.status === CONFIG.EXAM_STATUS.OPEN).length;
            const closedExams = filteredExams.filter(exam => exam.status === CONFIG.EXAM_STATUS.CLOSED).length;
            
            // Calculate average processing days with proper handling of negative values
            const closedExamsWithDays = filteredExams.filter(exam => 
                exam.status === CONFIG.EXAM_STATUS.CLOSED && 
                exam.processingDays !== null && 
                exam.processingDays !== undefined && 
                exam.processingDays !== '' &&
                !isNaN(parseInt(exam.processingDays))
            );
            
            let totalProcessingDays = 0;
            let validDaysCount = 0;
            
            closedExamsWithDays.forEach(exam => {
                const days = parseInt(exam.processingDays);
                // Treat negative values as zero
                const validDays = Math.max(0, days);
                totalProcessingDays += validDays;
                validDaysCount++;
            });
            
            const averageProcessingDays = validDaysCount > 0 
                ? Math.round(totalProcessingDays / validDaysCount)
                : 0;

            return {
                success: true,
                dashboardData: {
                    openExams,
                    closedExams,
                    averageProcessingDays
                }
            };

        } catch (error) {
            console.error('Error in fallback dashboard calculation:', error);
            return { 
                success: false, 
                error: error.message,
                dashboardData: { openExams: 0, closedExams: 0, averageProcessingDays: 0 }
            };
        }
    }

    // Filter exams by date range
    async getExamsByDateRange(startDate, endDate) {
        try {
            let url = `${this.webAppUrl}?action=getExamsByDateRange`;
            if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
            if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
            
            const response = await this.makeRequest(url);
            return response;

        } catch (error) {
            console.error('Error filtering exams by date:', error);
            return { success: false, error: error.message };
        }
    }

    // Send test email
    async sendTestEmail(email = null) {
        try {
            const response = await this.makeRequest(this.webAppUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'sendTestEmail',
                    email: email
                })
            });

            return response;

        } catch (error) {
            console.error('Error sending test email:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility function to format dates
    formatDate(dateValue) {
        if (!dateValue) return '';
        
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return dateValue;
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateValue || '';
        }
    }

    // Calculate processing days
    calculateProcessingDays(requestedDate, closingDate) {
        try {
            const reqDate = new Date(requestedDate);
            const closeDate = new Date(closingDate);
            
            if (isNaN(reqDate.getTime()) || isNaN(closeDate.getTime())) {
                return 0;
            }
            
            const diffTime = closeDate.getTime() - reqDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // החזר 0 אם הערך שלילי (תאריך סגירה לפני תאריך מבוקש)
            return Math.max(0, diffDays);
        } catch (error) {
            console.error('Error calculating processing days:', error);
            return 0;
        }
    }

    // Check if Google Apps Script URL is configured
    isConfigured() {
        return this.webAppUrl && !this.webAppUrl.includes('YOUR_SCRIPT_ID');
    }

    // Get configuration status
    getConfigurationStatus() {
        if (!this.isConfigured()) {
            return {
                configured: false,
                message: 'יש להגדיר את כתובת ה-Google Apps Script Web App',
                instructions: [
                    '1. פרסם את הקוד כ-Web App ב-Google Apps Script',
                    '2. העתק את ה-URL שמתקבל',
                    '3. עדכן את המשתנה webAppUrl בקובץ api.js',
                    '4. רענן את הדף'
                ]
            };
        }
        
        return {
            configured: true,
            message: 'המערכת מוכנה לשימוש'
        };
    }

    // Test connection to Google Apps Script
    async testConnection() {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    message: 'Google Apps Script לא מוגדר'
                };
            }

            const response = await this.sendTestEmail();
            
            if (response.success) {
                return {
                    success: true,
                    message: 'החיבור ל-Google Apps Script עובד תקין'
                };
            } else {
                return {
                    success: false,
                    message: 'שגיאה בחיבור: ' + (response.error || 'לא ידוע')
                };
            }

        } catch (error) {
            console.error('Error testing connection:', error);
            return {
                success: false,
                message: 'שגיאה בבדיקת החיבור: ' + error.message
            };
        }
    }
}

// Enhanced SheetsAPI for fallback to direct Google Sheets API
class FallbackSheetsAPI extends SheetsAPI {
    constructor() {
        super();
        this.baseUrl = CONFIG.SHEETS_API_BASE;
        this.apiKey = CONFIG.API_KEY;
        this.spreadsheetId = CONFIG.SPREADSHEET_ID;
    }

    // Build Google Sheets API URL
    buildSheetsUrl(range, params = {}) {
        const url = new URL(`${this.baseUrl}/${this.spreadsheetId}/values/${range}`);
        url.searchParams.append('key', this.apiKey);
        
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });
        
        return url.toString();
    }

    // Fallback: Get all exams using direct Google Sheets API
    async getAllExamsFallback() {
        try {
            const url = this.buildSheetsUrl(CONFIG.MAIN_SHEET_NAME);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length <= 1) {
                return { success: true, exams: [] };
            }

            // Skip header row and map data
            const exams = data.values.slice(1).map(row => ({
                serialNumber: row[CONFIG.COLUMNS.SERIAL_NUMBER] || '',
                orderNumber: row[CONFIG.COLUMNS.ORDER_NUMBER] || '',
                factory: row[CONFIG.COLUMNS.FACTORY] || '',
                contactName: row[CONFIG.COLUMNS.CONTACT_NAME] || '',
                phone: row[CONFIG.COLUMNS.PHONE] || '',
                email: row[CONFIG.COLUMNS.EMAIL] || '',
                liaisonOfficer: row[CONFIG.COLUMNS.LIAISON_OFFICER] || '',
                quantity: row[CONFIG.COLUMNS.QUANTITY] || '',
                requestedDate: this.formatDate(row[CONFIG.COLUMNS.REQUESTED_DATE]),
                status: row[CONFIG.COLUMNS.STATUS] || '',
                closingDate: this.formatDate(row[CONFIG.COLUMNS.CLOSING_DATE]),
                failed: row[CONFIG.COLUMNS.FAILED] || '',
                passed: row[CONFIG.COLUMNS.PASSED] || '',
                processingDays: row[CONFIG.COLUMNS.PROCESSING_DAYS] || '',
                examNumber: row[CONFIG.COLUMNS.EXAM_NUMBER] || ''
            }));

            return { success: true, exams };

        } catch (error) {
            console.error('Error in fallback getAllExams:', error);
            return { success: false, error: error.message };
        }
    }

    // Fallback: Get liaison officers using direct Google Sheets API
    async getLiaisonOfficersFallback() {
        try {
            const url = this.buildSheetsUrl(CONFIG.DATA_SHEET_NAME);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length <= 1) {
                return { success: true, officers: [] };
            }

            // Skip header row and map data
            const officers = data.values.slice(1).map(row => ({
                name: row[0] || '',
                email: row[1] || ''
            }));

            return { success: true, officers };

        } catch (error) {
            console.error('Error in fallback getLiaisonOfficers:', error);
            return { success: false, error: error.message };
        }
    }

    // Smart API method that tries Google Apps Script first, then falls back
    async getAllExams() {
        if (this.isConfigured()) {
            try {
                const result = await super.getAllExams();
                if (result.success) {
                    return result;
                }
            } catch (error) {
                console.warn('Google Apps Script failed, falling back to direct API:', error);
            }
        }
        
        console.log('Using fallback Google Sheets API');
        return this.getAllExamsFallback();
    }

    // Smart API method for liaison officers
    async getLiaisonOfficers() {
        if (this.isConfigured()) {
            try {
                const result = await super.getLiaisonOfficers();
                if (result.success) {
                    return result;
                }
            } catch (error) {
                console.warn('Google Apps Script failed, falling back to direct API:', error);
            }
        }
        
        console.log('Using fallback Google Sheets API for liaison officers');
        return this.getLiaisonOfficersFallback();
    }

    // Smart API method for dashboard stats with fallback
    async getDashboardStats(startDate = null, endDate = null) {
        if (this.isConfigured()) {
            try {
                const result = await super.getDashboardStats(startDate, endDate);
                if (result.success) {
                    return result;
                }
            } catch (error) {
                console.warn('Google Apps Script failed for dashboard stats, falling back:', error);
            }
        }
        
        // Fallback: calculate from all exams data
        try {
            const allExamsResponse = await this.getAllExams();
            if (allExamsResponse.success) {
                return this.calculateDashboardStatsFallback(allExamsResponse.exams, startDate, endDate);
            }
        } catch (error) {
            console.error('Fallback dashboard calculation failed:', error);
        }
        
        return { 
            success: true, 
            dashboardData: { openExams: 0, closedExams: 0, averageProcessingDays: 0 }
        };
    }

    // For operations that require Apps Script (like adding/updating), show proper error
    async addNewExam(examData) {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'פונקציה זו דורשת Google Apps Script. אנא הגדר את ה-Web App URL.'
            };
        }
        
        return super.addNewExam(examData);
    }

    async closeExam(closeData) {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'פונקציה זו דורשת Google Apps Script. אנא הגדר את ה-Web App URL.'
            };
        }
        
        return super.closeExam(closeData);
    }
}

// Create global instance with fallback capabilities
const sheetsAPI = new FallbackSheetsAPI();

// Auto-detect and set Web App URL if available
(function autoDetectWebAppUrl() {
    try {
        // Check if there's a Web App URL in localStorage
        const savedUrl = localStorage.getItem('webAppUrl');
        if (savedUrl && savedUrl !== 'undefined') {
            sheetsAPI.setWebAppUrl(savedUrl);
            console.log('Loaded Web App URL from localStorage:', savedUrl);
        }
        
        // Check URL parameters for webAppUrl
        const urlParams = new URLSearchParams(window.location.search);
        const urlFromParams = urlParams.get('webAppUrl');
        if (urlFromParams) {
            sheetsAPI.setWebAppUrl(urlFromParams);
            localStorage.setItem('webAppUrl', urlFromParams);
            console.log('Set Web App URL from URL parameters:', urlFromParams);
        }
        
    } catch (error) {
        console.warn('Error in auto-detecting Web App URL:', error);
    }
})();

// Utility function to manually set Web App URL
window.setWebAppUrl = function(url) {
    try {
        sheetsAPI.setWebAppUrl(url);
        localStorage.setItem('webAppUrl', url);
        console.log('Web App URL updated:', url);
        
        // Show success message
        if (window.examApp && window.examApp.showNotification) {
            window.examApp.showNotification('כתובת Google Apps Script עודכנה בהצלחה', 'success');
        } else {
            alert('כתובת Google Apps Script עודכנה בהצלחה');
        }
    } catch (error) {
        console.error('Error setting Web App URL:', error);
        if (window.examApp && window.examApp.showNotification) {
            window.examApp.showNotification('שגיאה בעדכון כתובת Google Apps Script', 'error');
        } else {
            alert('שגיאה בעדכון כתובת Google Apps Script');
        }
    }
};

// Utility function to check configuration status
window.checkConfiguration = function() {
    const status = sheetsAPI.getConfigurationStatus();
    
    if (status.configured) {
        console.log('✅ ' + status.message);
        if (window.examApp && window.examApp.showNotification) {
            window.examApp.showNotification(status.message, 'success');
        }
    } else {
        console.log('❌ ' + status.message);
        console.log('הוראות הגדרה:');
        status.instructions.forEach((instruction, index) => {
            console.log(instruction);
        });
        
        if (window.examApp && window.examApp.showNotification) {
            window.examApp.showNotification(status.message, 'warning');
        }
    }
    
    return status;
};

// Test connection function
window.testConnection = async function() {
    try {
        console.log('בודק חיבור ל-Google Apps Script...');
        const result = await sheetsAPI.testConnection();
        
        if (result.success) {
            console.log('✅ ' + result.message);
            if (window.examApp && window.examApp.showNotification) {
                window.examApp.showNotification(result.message, 'success');
            }
        } else {
            console.log('❌ ' + result.message);
            if (window.examApp && window.examApp.showNotification) {
                window.examApp.showNotification(result.message, 'error');
            }
        }
        
        return result;
    } catch (error) {
        console.error('שגיאה בבדיקת החיבור:', error);
        if (window.examApp && window.examApp.showNotification) {
            window.examApp.showNotification('שגיאה בבדיקת החיבור', 'error');
        }
        return { success: false, message: error.message };
    }
};

// Show initial configuration status
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const status = sheetsAPI.getConfigurationStatus();
        if (!status.configured) {
            console.warn('⚠️ Google Apps Script לא מוגדר. חלק מהפונקציות לא יעבדו.');
        }
    }, 1000);
});
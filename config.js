// Configuration
const CONFIG = {
    // Google Sheets API Configuration
    SPREADSHEET_ID: '1SLjCRMG03l6UyJJjCanaxqa_IrzAAa8GQhRhm4q_DT0',
    API_KEY: 'AIzaSyAkci0ByV17nQjpI0mHiTq3RRZypWlC54c',
    
    // Sheet Names
    MAIN_SHEET_NAME: 'בחינות',
    DATA_SHEET_NAME: 'DATA',
    
    // API Endpoints
    SHEETS_API_BASE: 'https://sheets.googleapis.com/v4/spreadsheets',
    
    // Column Mappings (0-based index)
    COLUMNS: {
        SERIAL_NUMBER: 0,     // מספר סידורי
        ORDER_NUMBER: 1,      // מספר הזמנה
        FACTORY: 2,           // מפעל
        CONTACT_NAME: 3,      // שם איש קשר
        PHONE: 4,             // טלפון
        EMAIL: 5,             // מייל
        LIAISON_OFFICER: 6,   // קצין קישור
        QUANTITY: 7,          // כמות לבחינה
        REQUESTED_DATE: 8,    // תאריך מבוקש
        STATUS: 9,            // סטטוס
        CLOSING_DATE: 10,     // תאריך סגירה
        FAILED: 11,           // נכשל
        PASSED: 12,           // עבר
        PROCESSING_DAYS: 13,  // ימי טיפול
        EXAM_NUMBER: 14       // מספר בחינה
    },
    
    // Status Values
    EXAM_STATUS: {
        OPEN: 'פתוח',
        CLOSED: 'סגור'
    },
    
    // Translation Maps
    STATUS_TRANSLATION: {
        'פתוח': 'open',
        'סגור': 'closed'
    },
    
    // Application Settings
    SETTINGS: {
        AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
        NOTIFICATION_TIMEOUT: 5000,   // 5 seconds
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,           // 1 second
        DEBOUNCE_DELAY: 300          // 300ms for search inputs
    },
    
    // Form URLs
    FORMS: {
        NEW_EXAM: './new-exam.html',
        CLOSE_EXAM: './close-exam.html'
    },
    
    // Copy Link Template
    COPY_LINK_TEMPLATE: window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'new-exam.html'
};

// Validation Rules
const VALIDATION = {
    ORDER_NUMBER: {
        required: true,
        minLength: 3,
        maxLength: 20
    },
    FACTORY: {
        required: true,
        minLength: 2,
        maxLength: 50
    },
    CONTACT_NAME: {
        required: true,
        minLength: 2,
        maxLength: 50
    },
    PHONE: {
        required: true,
        pattern: /^[0-9\-\+\(\)\s]+$/,
        minLength: 9,
        maxLength: 15
    },
    EMAIL: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    QUANTITY: {
        required: true,
        min: 1,
        max: 10000
    },
    EXAM_NUMBER: {
        required: true,
        minLength: 3,
        maxLength: 20
    },
    PASSED: {
        required: true,
        min: 0,
        max: 10000
    },
    FAILED: {
        required: true,
        min: 0,
        max: 10000
    }
};

// Error Messages
const ERROR_MESSAGES = {
    NETWORK_ERROR: 'שגיאת רשת - בדוק את החיבור לאינטרנט',
    API_ERROR: 'שגיאה בגישה לנתונים',
    VALIDATION_ERROR: 'שגיאה בבדיקת נתונים',
    NOT_FOUND: 'הפריט המבוקש לא נמצא',
    PERMISSION_DENIED: 'אין הרשאה לבצע פעולה זו',
    UNKNOWN_ERROR: 'שגיאה לא ידועה',
    REQUIRED_FIELD: 'שדה חובה',
    INVALID_FORMAT: 'פורמט לא תקין',
    MIN_LENGTH: 'אורך מינימלי נדרש',
    MAX_LENGTH: 'אורך מקסימלי חורג',
    MIN_VALUE: 'ערך מינימלי נדרש',
    MAX_VALUE: 'ערך מקסימלי חורג'
};

// Success Messages
const SUCCESS_MESSAGES = {
    EXAM_CREATED: 'בחינה נוצרה בהצלחה',
    EXAM_CLOSED: 'בחינה נסגרה בהצלחה',
    DATA_REFRESHED: 'הנתונים רועננו בהצלחה',
    LINK_COPIED: 'הקישור הועתק ללוח',
    EMAIL_SENT: 'המייל נשלח בהצלחה'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES };
}
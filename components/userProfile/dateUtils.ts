// utils/dateUtils.ts
export function formatDate(dateInput: any) {
    if (!dateInput) return "Unknown date";

    try {
        if (dateInput.toDate) {
            const date = dateInput.toDate();
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "Invalid date";
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return "Invalid date";
    }
}

export function formatTime(dateInput: any) {
    if (!dateInput) return "";

    try {
        if (dateInput.toDate) {
            const date = dateInput.toDate();
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return "";
    }
}
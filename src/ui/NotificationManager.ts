// src/ui/NotificationManager.ts

export class NotificationManager {
    private container: HTMLElement;

    constructor() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            console.error('Notification container not found!');
        }
    }

    /**
     * Shows a toast notification with a given message.
     * @param message The message to display.
     * @param duration The duration in milliseconds for the toast to be visible.
     */
    public showToast(message: string, duration: number = 3000): void {
        if (!this.container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;

        this.container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 100); // Short delay to allow CSS transition

        // Animate out and remove
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, duration);
    }
}

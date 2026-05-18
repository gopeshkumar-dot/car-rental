// customToast.js
import { LightningElement, api } from 'lwc';

export default class CustomToast extends LightningElement {
    @api title = 'Notification';
    @api message = 'This is a custom toast notification.';
    @api variant = 'info'; // Options: 'success', 'error', 'warning', 'info'
    @api iconName = 'utility:info';
    @api autoClose = false; // Initialize to false by default
    @api autoCloseTime = 5000; // default 5 seconds

    connectedCallback() {
        if (this.autoClose) {
            setTimeout(() => {
                this.closeToast();
            }, this.autoCloseTime);
        }
    }

    get computedClass() {
        return `slds-notify slds-notify_toast slds-theme_${this.variant}`;
    }

    closeToast() {
        this.dispatchEvent(new CustomEvent('close'));
    }
}
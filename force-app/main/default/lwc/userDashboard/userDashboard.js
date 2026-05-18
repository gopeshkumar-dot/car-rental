import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import basePath from '@salesforce/community/basePath';

export default class UserDashboard extends LightningElement {
    @track currentTab = 'profile'; // default tab
    
    // User Details
    @track userName = 'Gopesh Kumar';
    @track userEmail = 'gopesh.kumar@danocloudtechnology.com';
    @track firstName = 'Gopesh';
    @track lastName = 'Kumar';
    @track phone = '+91 9876543210';
    
    get userInitials() {
        if (!this.userName) return 'U';
        const parts = this.userName.trim().split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    }

    connectedCallback() {
        // Read URL parameter 'tab' if it exists to set the initial tab
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        if (tabParam && ['profile', 'password', 'booking', 'post_testimonial', 'my_testimonial'].includes(tabParam)) {
            this.currentTab = tabParam;
        }

        // Fetch user from session storage
        const storedLogin = sessionStorage.getItem('safar_is_logged_in');
        if (storedLogin === 'true') {
            this.userName = sessionStorage.getItem('safar_user_name') || 'Gopesh Kumar';
            const nameParts = this.userName.split(' ');
            this.firstName = nameParts[0] || '';
            this.lastName = nameParts.slice(1).join(' ') || '';
        } else {
            // Not logged in -> redirect to home
            const bp = (basePath || '/s').replace(/\/$/, '');
            window.location.assign(`${bp}/`);
        }
    }

    // Tab Getters
    get isProfileTab() { return this.currentTab === 'profile'; }
    get isPasswordTab() { return this.currentTab === 'password'; }
    get isBookingTab() { return this.currentTab === 'booking'; }
    get isPostTestimonialTab() { return this.currentTab === 'post_testimonial'; }
    get isMyTestimonialTab() { return this.currentTab === 'my_testimonial'; }

    // Tab Class Getters
    get getTabClassProfile() { return this.getTabClass('profile'); }
    get getTabClassPassword() { return this.getTabClass('password'); }
    get getTabClassBooking() { return this.getTabClass('booking'); }
    get getTabClassPostTestimonial() { return this.getTabClass('post_testimonial'); }
    get getTabClassMyTestimonial() { return this.getTabClass('my_testimonial'); }

    getTabClass(tabName) {
        return this.currentTab === tabName ? 'sidebar-tab tab-active' : 'sidebar-tab';
    }

    handleTabChange(event) {
        this.currentTab = event.currentTarget.dataset.tab;
        
        // Update URL so a refresh keeps the tab
        const url = new URL(window.location);
        url.searchParams.set('tab', this.currentTab);
        window.history.pushState({}, '', url);
    }

    handleInputChange(event) {
        const field = event.target.name;
        this[field] = event.target.value;
    }

    saveProfile() {
        this.showToast('Success', 'Profile updated successfully.', 'success');
        this.userName = `${this.firstName} ${this.lastName}`.trim();
        sessionStorage.setItem('safar_user_name', this.userName);
        window.dispatchEvent(new CustomEvent('userlogin', { detail: { name: this.userName } }));
    }

    updatePassword() {
        this.showToast('Success', 'Password updated successfully.', 'success');
    }

    postTestimonial() {
        this.showToast('Success', 'Your testimonial has been submitted for review.', 'success');
    }

    goToCars() {
        const bp = (basePath || '/s').replace(/\/$/, '');
        window.location.assign(`${bp}/`);
    }

    handleLogout() {
        sessionStorage.removeItem('safar_is_logged_in');
        sessionStorage.removeItem('safar_user_name');
        window.dispatchEvent(new CustomEvent('userlogout'));
        const bp = (basePath || '/s').replace(/\/$/, '');
        window.location.assign(`${bp}/`);
    }

    showToast(title, message, variant) {
        const evt = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }
}
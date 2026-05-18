import { LightningElement, track } from 'lwc';
import myResource1 from "@salesforce/resourceUrl/SinUp";
import createContact from '@salesforce/apex/HeaderController.createContact'; 

export default class CarRentalRegistration extends LightningElement {
    firstp1 = myResource1;
    @track firstName = '';
    @track lastName = '';
    @track phone = '';
    @track email = '';
    @track password = '';
    @track termsAccepted = false;
    @track login = true;
    @track signup = false;
    @track singUpPage = true;
    @track showPremiumModal = false;
    @track modalTitle = '';
    @track modalMessage = '';
    @track modalVariant = 'success';
    @track isSubmitting = false;
    @track submitStatusMessage = '';
    modalAction = null;
    signupTimeoutId;
   

    handleInputChange(event) {
        const fieldName = event.target.label;
        console.log('fieldName : ',JSON.stringify(fieldName));
        switch (fieldName) {
            case 'First name':
                this.firstName = event.target.value;
                break;
            case 'Last name':
                this.lastName = event.target.value;
                break;
            case 'Phone':
                this.phone = event.target.value;
                break;
            case 'E-mail':
                this.email = event.target.value;
                break;
            case 'Create Password':
                this.password = event.target.value;
                break;
            case 'I agree to the Terms and Privacy Policy':
                this.termsAccepted = event.target.checked;
                break;
            default:
                break;
        }
    }

    handleSignUp() {
        if (this.isSubmitting) {
            return;
        }
        console.log('this.firstName : ',JSON.stringify(this.firstName));
        console.log('this.lastName : ',JSON.stringify(this.lastName));
        console.log('this.phone : ',JSON.stringify(this.phone));
        console.log('this.email : ',JSON.stringify(this.email));
        console.log('this.password : ',JSON.stringify(this.password));
        if (!this.firstName || !this.lastName || !this.phone || !this.email || !this.password) {
            this.showModal('Missing Information', 'Please fill out all required fields.', 'warning');
            return;
        }

        if (!this.termsAccepted) {
            this.showModal('Action Required', 'You must agree to the Terms and Privacy Policy.', 'warning');
            return;
        }

        // Call Apex method to save data
        this.isSubmitting = true;
        this.submitStatusMessage = 'Creating your account...';
        this.signupTimeoutId = setTimeout(() => {
            if (this.isSubmitting) {
                this.showModal(
                    'Taking Longer Than Expected',
                    'Signup request is still processing. Please check internet connection and try again in a few seconds.',
                    'warning'
                );
            }
        }, 12000);
        createContact({ 
            firstName: this.firstName, 
            lastName: this.lastName, 
            phone: this.phone, 
            email: this.email, 
            password: this.password 
        })
        .then(result => {
            if (result === 'Success') {
                this.modalAction = 'goLogin';
                this.showModal('Sign Up Successful', 'Welcome aboard. Your account has been created successfully. Please log in.', 'success');
            } else if (result === 'ALREADY_EXISTS') {
                this.modalAction = 'goLogin';
                this.showModal('Account Exists', 'This email is already registered. Please log in or use another email.', 'warning');
            } else {
                this.showModal('Sign Up Response', `Unexpected response: ${result}`, 'warning');
            }
        })
        .catch(error => {
            const apexMessage = error?.body?.message || 'Unknown error';
            let userMessage = 'Error creating contact: ' + apexMessage;
            if (apexMessage.toLowerCase().includes('access') || apexMessage.toLowerCase().includes('permission')) {
                userMessage += ' (Check guest user Apex/Class/Object permissions for Experience Site.)';
            }
            this.showModal('Sign Up Failed', userMessage, 'error');
        })
        .finally(() => {
            if (this.signupTimeoutId) {
                clearTimeout(this.signupTimeoutId);
                this.signupTimeoutId = null;
            }
            this.isSubmitting = false;
            this.submitStatusMessage = '';
        });
    }


    handleLoginPage(){
        this.singUpPage = false;
        const loginEvent = new CustomEvent('login');
        this.dispatchEvent(loginEvent);
    }

    showModal(title, message, variant) {
        if (variant !== 'success') {
            this.modalAction = null;
        }
        this.modalTitle = title;
        this.modalMessage = message;
        this.modalVariant = variant;
        this.showPremiumModal = true;
    }

    handleModalClose() {
        this.showPremiumModal = false;
        if (this.modalAction === 'reload') {
            this.modalAction = null;
            window.location.reload();
            return;
        }
        if (this.modalAction === 'goLogin') {
            this.modalAction = null;
            this.handleLoginPage();
        }
    }
}
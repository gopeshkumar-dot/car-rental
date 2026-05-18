import { LightningElement, track } from 'lwc';
import registerUser from '@salesforce/apex/ContactController.registerUser';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class CreateAccount extends LightningElement {
    @track formData = {
        fullName: '',
        mobileNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false
    };

    @track validation = {
        fullNameValid: false,
        fullNameError: '',
        mobileValid: false,
        mobileError: '',
        emailValid: false,
        emailError: '',
        passwordValid: false,
        passwordError: '',
        confirmPasswordValid: false,
        confirmPasswordError: ''
    };

    @track isLoading = false;
    @track showSuccessModal = false;
    @track passwordFieldType = 'password';
    @track confirmPasswordFieldType = 'password';
    @track passwordStrength = 0;

    // Getters for password toggle icons
    get passwordToggleIcon() {
        return this.passwordFieldType === 'password' ? 'utility:hide' : 'utility:reveal';
    }

    get confirmPasswordToggleIcon() {
        return this.confirmPasswordFieldType === 'password' ? 'utility:hide' : 'utility:reveal';
    }

    // Password strength style
    get passwordStrengthStyle() {
        const strength = this.passwordStrength;
        let color = '#ff4444';
        let width = '25%';
        
        if (strength === 2) {
            color = '#ffbb33';
            width = '50%';
        } else if (strength === 3) {
            color = '#00C851';
            width = '75%';
        } else if (strength === 4) {
            color = '#007E33';
            width = '100%';
        }
        
        return `background-color: ${color}; width: ${width};`;
    }

    get passwordStrengthText() {
        const strengths = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
        return strengths[this.passwordStrength] || '';
    }

    handleInputChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.value;
        
        this.formData[field] = value;
        
        // Validate field
        this.validateField(field, value);
    }

    handlePasswordChange(event) {
        const value = event.target.value;
        this.formData.password = value;
        this.calculatePasswordStrength(value);
        this.validateField('password', value);
    }

    calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/\d/)) strength++;
        if (password.match(/[^a-zA-Z\d]/)) strength++;
        
        this.passwordStrength = strength;
    }

    validateField(field, value) {
        switch(field) {
            case 'fullName':
                this.validation.fullNameValid = value.trim().length >= 2;
                this.validation.fullNameError = value && value.trim().length < 2 ? 'Full name must be at least 2 characters' : '';
                break;
                
            case 'mobileNumber':
                const mobileRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
                this.validation.mobileValid = mobileRegex.test(value.replace(/\s/g, ''));
                this.validation.mobileError = value && !mobileRegex.test(value.replace(/\s/g, '')) ? 'Please enter a valid mobile number' : '';
                break;
                
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                this.validation.emailValid = emailRegex.test(value);
                this.validation.emailError = value && !emailRegex.test(value) ? 'Please enter a valid email address' : '';
                break;
                
            case 'password':
                this.validation.passwordValid = value.length >= 8;
                this.validation.passwordError = value && value.length < 8 ? 'Password must be at least 8 characters' : '';
                break;
                
            case 'confirmPassword':
                this.validation.confirmPasswordValid = value === this.formData.password && value.length > 0;
                this.validation.confirmPasswordError = value && value !== this.formData.password ? 'Passwords do not match' : '';
                break;
        }
    }

    togglePasswordVisibility() {
        this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
    }

    toggleConfirmPasswordVisibility() {
        this.confirmPasswordFieldType = this.confirmPasswordFieldType === 'password' ? 'text' : 'password';
    }

    handleTermsChange(event) {
        this.formData.acceptTerms = event.target.checked;
    }

    handleTermsClick(event) {
        event.preventDefault();
        // Open terms modal or navigate to terms page
        this.dispatchEvent(new CustomEvent('termsclick'));
    }

    async handleSignUp() {
        // Validate all fields
        if (!this.validateForm()) {
            this.showToast('Error', 'Please fill all required fields correctly', 'error');
            return;
        }

        if (!this.formData.acceptTerms) {
            this.showToast('Error', 'Please accept the Terms and Conditions', 'error');
            return;
        }

        this.isLoading = true;

        try {
            const result = await registerUser({
                fullName: this.formData.fullName,
                mobileNumber: this.formData.mobileNumber,
                email: this.formData.email,
                password: this.formData.password
            });

            if (result === 'SUCCESS') {
                this.showSuccessModal = true;
                this.showToast('Success', 'Registration successful! Please check your email.', 'success');
                this.resetForm();
            }
        } catch (error) {
            let errorMessage = 'Registration failed. Please try again.';
            
            if (error.body && error.body.message) {
                if (error.body.message.includes('already exists')) {
                    errorMessage = 'This email is already registered. Please login or use a different email.';
                } else {
                    errorMessage = error.body.message;
                }
            }
            
            this.showToast('Error', errorMessage, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    validateForm() {
        let isValid = true;
        
        // Validate all fields
        Object.keys(this.formData).forEach(field => {
            if (field !== 'acceptTerms' && field !== 'confirmPassword') {
                this.validateField(field, this.formData[field]);
                if (!this.validation[`${field}Valid`]) {
                    isValid = false;
                }
            }
        });

        // Validate confirm password
        this.validateField('confirmPassword', this.formData.confirmPassword);
        if (!this.validation.confirmPasswordValid) {
            isValid = false;
        }

        return isValid;
    }

    handleGoogleLogin() {
        // Implement Google OAuth
        this.showToast('Info', 'Google login coming soon', 'info');
    }

    handleFacebookLogin() {
        // Implement Facebook OAuth
        this.showToast('Info', 'Facebook login coming soon', 'info');
    }

    handleLoginClick(event) {
        event.preventDefault();
        this.dispatchEvent(new CustomEvent('showlogin'));
    }

    closeModal() {
        this.dispatchEvent(new CustomEvent('close'));
    }

    closeSuccessModal() {
        this.showSuccessModal = false;
        this.dispatchEvent(new CustomEvent('close'));
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    preventDefault(event) {
        event.preventDefault();
    }

    resetForm() {
        this.formData = {
            fullName: '',
            mobileNumber: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false
        };
        
        this.validation = {
            fullNameValid: false,
            fullNameError: '',
            mobileValid: false,
            mobileError: '',
            emailValid: false,
            emailError: '',
            passwordValid: false,
            passwordError: '',
            confirmPasswordValid: false,
            confirmPasswordError: ''
        };
        
        this.passwordStrength = 0;
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }
}
import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import LOGO_URL from '@salesforce/resourceUrl/logo1';
import getHeaderDetails from '@salesforce/apex/HeaderController.getHeaderDetails';
import createContact from '@salesforce/apex/HeaderController.createContact';
import loginContact from '@salesforce/apex/HeaderController.loginContact';
import sendVerificationEmail from '@salesforce/apex/HeaderController.sendVerificationEmail';
import verifyEmailCode from '@salesforce/apex/HeaderController.verifyEmailCode';
import resendVerificationCode from '@salesforce/apex/HeaderController.resendVerificationCode';

export default class SafarHeaderWithLogin extends LightningElement {
    // ==================== HEADER PROPERTIES ====================
    @track logoUrl = LOGO_URL;
    @track supportEmail;
    @track helplineNumber;
    @track whatsappNumber;
    @api loginButtonText = 'LOGIN / REGISTER';
    @api googleClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
    @api facebookAppId = 'YOUR_FACEBOOK_APP_ID';
    @track showLoginModal = false;
    @track showSignupModal = false;
    @track showForgotPasswordModal = false;
    
    @wire(getHeaderDetails)
    wiredHeader({ error, data }) {
        if (data) {
            console.log('Header Data:', data);
            if (data.Mail_Us__c) this.supportEmail = data.Mail_Us__c;
            if (data.Helpline__c) this.helplineNumber = data.Helpline__c;
            if (data.WhatsApp__c) this.whatsappNumber = data.WhatsApp__c;
        } else if (error) {
            console.error('Error fetching header details:', error);
        }
    }
    
    // ==================== MODAL STATE ====================
    @track showLoginModal = false;
    @track showSignupModal = false;
    @track showForgotPasswordModal = false;
    @track showVerificationModal = false;
    
    // ==================== LOGIN FORM ====================
    @track email = '';
    @track password = '';
    @track emailError = '';
    @track passwordError = '';
    
    // ==================== SIGNUP FORM ====================
    @track fullName = '';
    @track mobileNumber = '';
    @track signupEmail = '';
    @track signupPassword = '';
    @track agreeToTerms = false;
    @track fullNameError = '';
    @track mobileNumberError = '';
    @track signupEmailError = '';
    @track signupPasswordError = '';
    @track termsError = '';
    @track signupError = '';  // ✅ ADDED: Missing property
    
    // ==================== PASSWORD RECOVERY FORM ====================
    @track recoveryEmail = '';
    @track recoveryMobile = '';
    @track newPassword = '';
    @track confirmPassword = '';
    @track recoveryEmailError = '';
    @track recoveryMobileError = '';
    @track newPasswordError = '';
    @track confirmPasswordError = '';
    
    // ==================== VERIFICATION MODAL ====================
    @track verificationCodeSent = false;
    @track verificationToken = null;
    @track otpDigits = [
        { index: 0, value: '' },
        { index: 1, value: '' },
        { index: 2, value: '' },
        { index: 3, value: '' },
        { index: 4, value: '' },
        { index: 5, value: '' }
    ];
    @track otpError = '';
    @track resendDisabled = false;
    @track resendCountdown = 0;
    resendTimer = null;
    
    // ==================== LOADING & UI STATE ====================
    @track isLoading = false;
    @track isMobile = false;

    // ==================== EVENT LISTENER BINDINGS ====================
    boundHandleResize;
    boundHandleKeyDown;

    // ==================== LIFECYCLE HOOKS ====================
    connectedCallback() {
        this.boundHandleResize = this.handleResize.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        
        this.checkMobileView();
        window.addEventListener('resize', this.boundHandleResize);
        document.addEventListener('keydown', this.boundHandleKeyDown);
    }

    disconnectedCallback() {
        // ✅ MERGED: Both cleanup handlers
        window.removeEventListener('resize', this.boundHandleResize);
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        if (this.resendTimer) {
            clearInterval(this.resendTimer);
            this.resendTimer = null;
        }
    }

    handleResize() {
        this.checkMobileView();
    }

    checkMobileView() {
        this.isMobile = window.innerWidth <= 768;
    }

    handleLogoError() {
        console.error('Logo failed to load');
        this.logoUrl = ''; // Fallback
    }

    // ==================== CONTACT HANDLERS ====================
    handleEmailClick(event) {
        event.preventDefault();
        if (this.supportEmail) {
            window.location.href = `mailto:${this.supportEmail}`;
        }
    }

    handleCallClick(event) {
        event.preventDefault();
        if (this.helplineNumber) {
            window.location.href = `tel:${this.helplineNumber}`;
        }
    }

    handleWhatsAppClick(event) {
        event.preventDefault();
        if (this.whatsappNumber) {
            const whatsappUrl = `https://wa.me/${this.whatsappNumber.replace(/\D/g, '')}`;
            window.open(whatsappUrl, '_blank');
        }
    }

    handleKeyDown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            if (event.target.classList.contains('contact-item')) {
                event.preventDefault();
                event.target.click();
            }
        }
        if (event.key === 'Escape') {
            this.closeAllModals();
        }
    }

    // ==================== MODAL HANDLERS ====================
    openLoginModal() {
        this.closeAllModals();
        this.showLoginModal = true;
        document.body.style.overflow = 'hidden';
    }

    openSignupModal(event) {
        if (event) event.preventDefault();
        this.closeAllModals();
        this.showSignupModal = true;
        document.body.style.overflow = 'hidden';
    }

    openForgotPasswordModal(event) {
        if (event) event.preventDefault();
        this.closeAllModals();
        this.showForgotPasswordModal = true;
        document.body.style.overflow = 'hidden';
    }

    openLoginModalFromSignup(event) {
        if (event) event.preventDefault();
        this.closeAllModals();
        this.showLoginModal = true;
    }

    openLoginModalFromRecovery(event) {
        if (event) event.preventDefault();
        this.closeAllModals();
        this.showLoginModal = true;
    }

    closeAllModals() {
        this.showLoginModal = false;
        this.showSignupModal = false;
        this.showForgotPasswordModal = false;
        this.showVerificationModal = false;
        document.body.style.overflow = '';
        this.resetAllForms();
        this.resetVerificationState();
    }

    handleOverlayClick(event) {
        if (event.target === event.currentTarget) {
            this.closeAllModals();
        }
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    // ==================== LOGIN FORM HANDLERS ====================
    handleEmailChange(event) {
        this.email = event.target.value.trim();
        this.emailError = '';
    }

    handlePasswordChange(event) {
        this.password = event.target.value;
        this.passwordError = '';
    }

    validateLoginForm() {
        let isValid = true;
        this.emailError = '';
        this.passwordError = '';

        if (!this.email) {
            this.emailError = 'Email address is required';
            isValid = false;
        } else if (!this.isValidEmail(this.email)) {
            this.emailError = 'Please enter a valid email address';
            isValid = false;
        }

        if (!this.password) {
            this.passwordError = 'Password is required';
            isValid = false;
        } else if (this.password.length < 6) {
            this.passwordError = 'Password must be at least 6 characters';
            isValid = false;
        }
        return isValid;
    }

    async handleLogin(event) {
        event.preventDefault();
        
        if (!this.validateLoginForm()) {
            this.showToast('Error', 'Please fix the form errors', 'error');
            return;
        }

        this.isLoading = true;

        try {
            const result = await loginContact({ 
                email: this.email, 
                password: this.password 
            });
            
            if (result === 'Failed') {
                throw new Error('Invalid email or password');
            }
            
            const parsedResult = JSON.parse(result);
            
            this.showToast('Success', 'Login successful! Welcome back.', 'success');
            
            const loginSuccessEvent = new CustomEvent('loginsuccess', {
                detail: {
                    email: this.email,
                    name: parsedResult.name,
                    phone: parsedResult.phone,
                    timestamp: new Date().toISOString()
                },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(loginSuccessEvent);
            
            this.closeAllModals();
        } catch (error) {
            this.showToast('Login Failed', error.message || 'Invalid email or password', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // ==================== SIGNUP FORM HANDLERS (✅ FIXED - SINGLE METHOD) ====================
    handleFullNameChange(event) {
        this.fullName = event.target.value.trim();
        this.fullNameError = '';
    }

    handleMobileNumberChange(event) {
        this.mobileNumber = event.target.value.trim();
        this.mobileNumberError = '';
    }

    handleSignupEmailChange(event) {
        this.signupEmail = event.target.value.trim();
        this.signupEmailError = '';
    }

    handleSignupPasswordChange(event) {
        this.signupPassword = event.target.value;
        this.signupPasswordError = '';
    }

    handleTermsChange(event) {
        this.agreeToTerms = event.target.checked;
        this.termsError = '';
    }

    handleTermsClick(event) {
        event.preventDefault();
        this.showToast('Terms and Conditions', 'Terms page would open here', 'info');
    }

    validateSignupForm() {
        let isValid = true;
        this.fullNameError = '';
        this.mobileNumberError = '';
        this.signupEmailError = '';
        this.signupPasswordError = '';
        this.termsError = '';

        if (!this.fullName) {
            this.fullNameError = 'Full name is required';
            isValid = false;
        } else if (this.fullName.length < 3) {
            this.fullNameError = 'Name must be at least 3 characters';
            isValid = false;
        }

        if (!this.mobileNumber) {
            this.mobileNumberError = 'Mobile number is required';
            isValid = false;
        } else if (!this.isValidPhone(this.mobileNumber)) {
            this.mobileNumberError = 'Please enter a valid 10-digit mobile number';
            isValid = false;
        }

        if (!this.signupEmail) {
            this.signupEmailError = 'Email address is required';
            isValid = false;
        } else if (!this.isValidEmail(this.signupEmail)) {
            this.signupEmailError = 'Please enter a valid email address';
            isValid = false;
        }

        if (!this.signupPassword) {
            this.signupPasswordError = 'Password is required';
            isValid = false;
        } else if (this.signupPassword.length < 6) {
            this.signupPasswordError = 'Password must be at least 6 characters';
            isValid = false;
        }

        if (!this.agreeToTerms) {
            this.termsError = 'You must agree to the Terms and Conditions';
            isValid = false;
        }
        return isValid;
    }

    // ✅ MAIN SIGNUP METHOD - FIXED & COMPLETE
    async handleSignup(event) {
        event.preventDefault();
        
        if (!this.validateSignupForm()) {
            this.showToast('Error', 'Please fix the form errors', 'error');
            return;
        }

        this.isLoading = true;
        this.signupError = '';

        try {
            const nameParts = this.fullName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || 'User';
            
            // 1. Create contact via Apex
            const result = await createContact({
                firstName: firstName,
                lastName: lastName,
                phone: this.mobileNumber,
                email: this.signupEmail,
                password: this.signupPassword
            });
            
            if (result === 'ALREADY_EXISTS') {
                throw new Error('Email already registered. Please login.');
            }
            if (result === 'SERVER_BUSY') {
                throw new Error('Server busy. Please try again.');
            }
            if (result !== 'Success') {
                throw new Error('Signup failed. Please try again.');
            }
            
            // 2. Send verification email
            const verifyResponse = await sendVerificationEmail({ 
                email: this.signupEmail 
            });
            this.verificationToken = verifyResponse.token;
            
            // 3. Show verification modal
            this.showSignupModal = false;
            this.showVerificationModal = true;
            this.verificationCodeSent = true;
            this.startResendCountdown();
            
            this.showToast('Success', 'Account created! Check email for verification code.', 'success');
            
            const signupSuccessEvent = new CustomEvent('signupsuccess', {
                detail: {
                    email: this.signupEmail,
                    fullName: this.fullName,
                    timestamp: new Date().toISOString()
                },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(signupSuccessEvent);
            
        } catch (error) {
            this.signupError = error.message || 'Signup failed. Please try again.';
            this.showToast('Signup Failed', this.signupError, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // ==================== PASSWORD RECOVERY HANDLERS ====================
    handleRecoveryEmailChange(event) {
        this.recoveryEmail = event.target.value.trim();
        this.recoveryEmailError = '';
    }

    handleRecoveryMobileChange(event) {
        this.recoveryMobile = event.target.value.trim();
        this.recoveryMobileError = '';
    }

    handleNewPasswordChange(event) {
        this.newPassword = event.target.value;
        this.newPasswordError = '';
    }

    handleConfirmPasswordChange(event) {
        this.confirmPassword = event.target.value;
        this.confirmPasswordError = '';
    }

    validatePasswordRecoveryForm() {
        let isValid = true;
        this.recoveryEmailError = '';
        this.recoveryMobileError = '';
        this.newPasswordError = '';
        this.confirmPasswordError = '';

        if (!this.recoveryEmail) {
            this.recoveryEmailError = 'Email address is required';
            isValid = false;
        } else if (!this.isValidEmail(this.recoveryEmail)) {
            this.recoveryEmailError = 'Please enter a valid email address';
            isValid = false;
        }

        if (!this.recoveryMobile) {
            this.recoveryMobileError = 'Registered mobile number is required';
            isValid = false;
        } else if (!this.isValidPhone(this.recoveryMobile)) {
            this.recoveryMobileError = 'Please enter a valid 10-digit mobile number';
            isValid = false;
        }

        if (!this.newPassword) {
            this.newPasswordError = 'New password is required';
            isValid = false;
        } else if (this.newPassword.length < 6) {
            this.newPasswordError = 'Password must be at least 6 characters';
            isValid = false;
        }

        if (!this.confirmPassword) {
            this.confirmPasswordError = 'Please confirm your password';
            isValid = false;
        } else if (this.newPassword !== this.confirmPassword) {
            this.confirmPasswordError = 'Passwords do not match';
            isValid = false;
        }
        return isValid;
    }

    async handlePasswordRecovery(event) {
        event.preventDefault();
        
        if (!this.validatePasswordRecoveryForm()) {
            this.showToast('Error', 'Please fix the form errors', 'error');
            return;
        }

        this.isLoading = true;

        try {
            // Mock implementation - replace with actual Apex call when available
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (this.recoveryEmail === 'notfound@example.com') {
                throw new Error('Email or mobile number not found');
            }
            
            this.showToast('Success', 'Password reset successfully! Check your email.', 'success');
            
            const passwordResetEvent = new CustomEvent('passwordreset', {
                detail: {
                    email: this.recoveryEmail,
                    timestamp: new Date().toISOString()
                },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(passwordResetEvent);
            
            this.closeAllModals();
        } catch (error) {
            this.showToast('Password Reset Failed', error.message || 'Email or mobile not found', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // ==================== VERIFICATION MODAL HANDLERS ====================
    
    // ✅ ADDED: Missing getter for OTP completion check
    get isOtpComplete() {
        return this.otpDigits.every(digit => digit.value && digit.value.length === 1);
    }

    get isVerifyButtonDisabled() {
        return this.isLoading || !this.isOtpComplete;
    }

    get otpValue() {
        return this.otpDigits.map(d => d.value).join('');
    }

    get resendButtonText() {
        return this.resendDisabled 
            ? `Resend in ${this.resendCountdown}s` 
            : 'Resend Code';
    }

    handleOtpChange(event) {
        const index = parseInt(event.target.dataset.index);
        const value = event.target.value.replace(/[^0-9]/g, '');
        
        if (value) {
            this.otpDigits = this.otpDigits.map(d => 
                d.index === index ? { ...d, value: value } : d
            );
            
            const nextInput = this.template.querySelector(`[data-index="${index + 1}"]`);
            if (nextInput) {
                nextInput.focus();
            }
            this.otpError = '';
        }
    }

    handleOtpKeyup(event) {
        const index = parseInt(event.target.dataset.index);
        
        if (event.key === 'Backspace' && !event.target.value && index > 0) {
            const prevInput = this.template.querySelector(`[data-index="${index - 1}"]`);
            if (prevInput) {
                prevInput.focus();
            }
        }
        
        if (index === 5 && event.target.value && this.isOtpComplete) {
            this.handleVerifyCode();
        }
    }

    handleOtpPaste(event) {
        event.preventDefault();
        const pastedData = event.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        
        if (pastedData.length === 6) {
            this.otpDigits = this.otpDigits.map((d, i) => ({
                ...d,
                value: pastedData[i]
            }));
            this.otpError = '';
            
            const lastInput = this.template.querySelector('[data-index="5"]');
            if (lastInput) lastInput.focus();
        }
    }

    async handleVerifyCode() {
        if (!this.isOtpComplete) {
            this.otpError = 'Please enter the complete 6-digit code';
            return;
        }
        
        this.isLoading = true;
        this.otpError = '';
        
        try {
            const result = await verifyEmailCode({
                email: this.signupEmail,
                code: this.otpValue
            });
            
            this.closeAllModals();
            this.showToast('Success', result.message || 'Email verified successfully!', 'success');
            this.showLoginModal = true;
            this.resetVerificationState();
            
        } catch (error) {
            this.otpError = error.message || 'Invalid or expired code. Please try again.';
        } finally {
            this.isLoading = false;
        }
    }

    async handleResendCode() {
        if (this.resendDisabled) return;
        
        try {
            const response = await resendVerificationCode({ 
                email: this.signupEmail 
            });
            this.verificationToken = response.token;
            this.verificationCodeSent = true;
            this.startResendCountdown();
            this.showToast('Code Sent', 'New verification code sent to your email', 'info');
        } catch (error) {
            this.showToast('Error', error.message || 'Failed to resend code', 'error');
        }
    }

    startResendCountdown() {
        this.resendDisabled = true;
        this.resendCountdown = 60;
        
        if (this.resendTimer) {
            clearInterval(this.resendTimer);
        }
        
        this.resendTimer = setInterval(() => {
            this.resendCountdown -= 1;
            if (this.resendCountdown <= 0) {
                clearInterval(this.resendTimer);
                this.resendTimer = null;
                this.resendDisabled = false;
            }
        }, 1000);
    }

    handleChangeEmail() {
        this.showVerificationModal = false;
        this.showSignupModal = true;
        this.resetVerificationState();
    }

    resetVerificationState() {
        this.otpDigits = this.otpDigits.map(d => ({ ...d, value: '' }));
        this.otpError = '';
        this.verificationCodeSent = false;
        this.verificationToken = null;
        if (this.resendTimer) {
            clearInterval(this.resendTimer);
            this.resendTimer = null;
        }
        this.resendDisabled = false;
        this.resendCountdown = 0;
    }

    // ==================== SOCIAL LOGIN HANDLERS ====================
    handleGoogleLogin() {
        this.showToast('Info', 'Google login coming soon', 'info');
    }

    handleFacebookLogin() {
        this.showToast('Info', 'Facebook login coming soon', 'info');
    }

    // ==================== UTILITY FUNCTIONS ====================
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        const phoneRegex = /^[6-9]\d{9}$/;
        const cleanedPhone = phone.replace(/\D/g, '');
        return phoneRegex.test(cleanedPhone);
    }

    resetAllForms() {
        // Login Form
        this.email = '';
        this.password = '';
        this.emailError = '';
        this.passwordError = '';
        
        // Signup Form
        this.fullName = '';
        this.mobileNumber = '';
        this.signupEmail = '';
        this.signupPassword = '';
        this.agreeToTerms = false;
        this.fullNameError = '';
        this.mobileNumberError = '';
        this.signupEmailError = '';
        this.signupPasswordError = '';
        this.termsError = '';
        this.signupError = '';
        
        // Password Recovery Form
        this.recoveryEmail = '';
        this.recoveryMobile = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.recoveryEmailError = '';
        this.recoveryMobileError = '';
        this.newPasswordError = '';
        this.confirmPasswordError = '';
        
        this.isLoading = false;
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }

    // ==================== GETTERS ====================
    get formattedPhoneNumber() {
        return this.helplineNumber ? this.helplineNumber.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : '';
    }

    get formattedWhatsAppNumber() {
        return this.whatsappNumber ? this.whatsappNumber.replace(/(\d{5})(\d{5})/, '$1 $2') : '';
    }
}
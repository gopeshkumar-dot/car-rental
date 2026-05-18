import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import loginUser from '@salesforce/apex/CarRentalAuthController.loginUser';
import signupUser from '@salesforce/apex/CarRentalAuthController.signupUser';

export default class CarRentalAuth extends LightningElement {
    @track isLoggedIn = false;
    @track isLoginMode = true;
    @track isLoading = false;

    @track loginEmail = '';
    @track loginPassword = '';

    @track signupName = '';
    @track signupEmail = '';
    @track signupPassword = '';
    @track signupConfirmPassword = '';

    sessionId;

    handleInputChange(event) {
        const field = event.target.dataset.id;
        this[field] = event.target.value;
    }

    switchToSignup() {
        this.isLoginMode = false;
    }

    switchToLogin() {
        this.isLoginMode = true;
    }

    handleLogout() {
        this.isLoggedIn = false;
        this.sessionId = null;
        this.switchToLogin();
    }

    async handleLogin() {
        const emailInput = this.template.querySelector('[data-id="loginEmail"]');
        const passwordInput = this.template.querySelector('[data-id="loginPassword"]');

        if (!this.loginEmail) {
            emailInput.setCustomValidity('Complete this field');
            emailInput.reportValidity();
            return;
        }
        emailInput.setCustomValidity('');
        emailInput.reportValidity();

        if (!this.loginPassword) {
            passwordInput.setCustomValidity('Complete this field');
            passwordInput.reportValidity();
            return;
        }
        passwordInput.setCustomValidity('');
        passwordInput.reportValidity();

        this.isLoading = true;
        try {
            const result = await loginUser({
                email: this.loginEmail,
                password: this.loginPassword
            });

            if (result?.success) {
                this.isLoggedIn = true;
                this.sessionId = result.sessionId;
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Login Successful',
                        message: `Welcome back! Session: ${this.sessionId}`,
                        variant: 'success'
                    })
                );
            } else {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Login Failed',
                        message: result?.message || 'Invalid credentials.',
                        variant: 'error'
                    })
                );
            }
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error?.body?.message || 'Unable to login.',
                    variant: 'error'
                })
            );
        } finally {
            this.isLoading = false;
        }
    }

    async handleSignup() {
        const nameInput = this.template.querySelector('[data-id="signupName"]');
        const emailInput = this.template.querySelector('[data-id="signupEmail"]');
        const passwordInput = this.template.querySelector('[data-id="signupPassword"]');
        const confirmInput = this.template.querySelector('[data-id="signupConfirmPassword"]');

        let hasError = false;
        [nameInput, emailInput, passwordInput, confirmInput].forEach((inputCmp) => {
            if (!inputCmp.value) {
                inputCmp.setCustomValidity('Complete this field');
                inputCmp.reportValidity();
                hasError = true;
            } else {
                inputCmp.setCustomValidity('');
                inputCmp.reportValidity();
            }
        });
        if (hasError) return;

        if (this.signupPassword !== this.signupConfirmPassword) {
            confirmInput.setCustomValidity('Passwords do not match');
            confirmInput.reportValidity();
            return;
        }
        confirmInput.setCustomValidity('');
        confirmInput.reportValidity();

        this.isLoading = true;
        try {
            const result = await signupUser({
                name: this.signupName,
                email: this.signupEmail,
                password: this.signupPassword
            });

            if (result?.success) {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Signup Successful',
                        message: result.message,
                        variant: 'success'
                    })
                );
                this.switchToLogin();
                this.loginEmail = this.signupEmail;
                this.loginPassword = '';
            } else {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Signup Failed',
                        message: result?.message || 'Unable to create account.',
                        variant: 'error'
                    })
                );
            }
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error?.body?.message || 'Unable to sign up.',
                    variant: 'error'
                })
            );
        } finally {
            this.isLoading = false;
        }
    }
}
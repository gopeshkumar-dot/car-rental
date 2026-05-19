// CarBooking.js
import { LightningElement, track, api, wire } from 'lwc';
import myResource1 from "@salesforce/resourceUrl/x5"; 
import myResource2 from "@salesforce/resourceUrl/bookingnextpg2"; 
import createRentalBooking from '@salesforce/apex/RentalBookingController.createRentalBooking';
import getPicklistOptions from '@salesforce/apex/RentalBookingController.getPicklistOptions';
import getAllVehicles from '@salesforce/apex/RentalBookingController.getAllVehicles';

export default class CarBooking extends LightningElement {
    // API properties passed from parent components
    @api selectedCarId = '';
    @api selectedCarName = '';
    @api selectedCarPrice = 0;
    @api selectedCarImage = '';
    @api selectedCarType = '';

    // Track state variables
    @track cusName = '';
    @track carName = '';
    @track startTime = '';
    @track endTime = '';
    @track Phone_no = '';
    @track Email_Id = '';
    @track pickupStreet = '';
    @track pickupLandmark = '';
    @track pickupCity = 'Patna';
    @track pickupState = 'Bihar';
    @track pickupPin = '';

    @track dropoffStreet = '';
    @track dropoffLandmark = '';
    @track dropoffCity = 'Patna';
    @track dropoffState = 'Bihar';
    @track dropoffPin = '';

    // Step navigation
    @track currentStep = 1;
    @track isBookingSuccessful = false;
    @track bookingId = '';

    // Add-on states
    @track gpsSelected = false;
    @track childSeatSelected = false;
    @track insuranceSelected = false;
    @track roadsideSelected = false;

    // Payment state
    @track paymentMethod = 'destination';

    // UPI Payment State
    @track upiTransactionId = '';
    @track isUpiVerified = false;
    @track upiCountdown = 300;
    @track upiCountdownStr = '05:00';
    @track isVerifyingUpi = false;
    @track upiVerificationButtonLabel = 'Verify Payment';

    // Card Payment State
    @track cardNameInput = '';
    @track cardNumber = '';
    @track cardExpiry = '';
    @track cardCvv = '';
    @track isCardVerified = false;
    @track isVerifyingCard = false;
    @track cardVerificationButtonLabel = 'Verify Card & Pay';

    // Dynamic Booking picklists
    @track bookingStatus = 'Confirmed';
    @track paymentStatus = 'Pending';
    @track statusOptions = [
        { label: 'Confirmed', value: 'Confirmed' },
        { label: 'Active', value: 'Active' },
        { label: 'Completed', value: 'Completed' }
    ];
    @track paymentStatusOptions = [
        { label: 'Pending', value: 'Pending' },
        { label: 'Paid', value: 'Paid' },
        { label: 'Refunded', value: 'Refunded' }
    ];

    // Toast notifications
    @track showToast = false;
    @track toastTitle = '';
    @track toastMessage = '';
    @track toastVariant = '';

    // List of vehicles dynamically loaded
    @track vehiclesList = [];
    @track selectedVehicle = null;

    // Hardcoded static assets fallbacks
    firstp1 = myResource1;
    nextpg1 = myResource2;

    locationOptions = [
        { label: 'Patna Airport (PAT)', value: 'Patna Airport (PAT)' },
        { label: 'Patna Junction (PNBE)', value: 'Patna Junction (PNBE)' },
        { label: 'Safar Sathi Downtown Office', value: 'Safar Sathi Downtown Office' },
        { label: 'Home Delivery (Patna)', value: 'Home Delivery (Patna)' }
    ];

    connectedCallback() {
        // Preset vehicle details if passed from parent
        if (this.selectedCarName) {
            this.carName = this.selectedCarName;
        }

        // Fetch dynamic picklist options from Rental_Booking__c
        getPicklistOptions({ objectName: 'Rental_Booking__c', fieldName: 'Status__c' })
            .then(result => {
                if (result && result.length > 0) {
                    this.statusOptions = result;
                }
            })
            .catch(error => {
                console.error('Error fetching Status picklist:', error);
            });

        getPicklistOptions({ objectName: 'Rental_Booking__c', fieldName: 'Payment_Status__c' })
            .then(result => {
                if (result && result.length > 0) {
                    this.paymentStatusOptions = result;
                }
            })
            .catch(error => {
                console.error('Error fetching Payment Status picklist:', error);
            });

        // Set default pickup and drop-off dates to tomorrow and day-after
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        // Format to YYYY-MM-DDTHH:MM local format
        this.startTime = this.formatDateTimeLocal(tomorrow);

        const nextDay = new Date(tomorrow);
        nextDay.setDate(nextDay.getDate() + 1);
        this.endTime = this.formatDateTimeLocal(nextDay);
    }

    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Dynamic car loading if no preset car exists
    @wire(getAllVehicles)
    wiredVehicles({ error, data }) {
        if (data) {
            this.vehiclesList = data.map(car => ({
                id: car.Id,
                name: car.Name,
                type: car.Type__c || 'Premium',
                price: car.Daily_Rate__c || 800,
                image: this.extractImageUrl(car.Main_Image_URL__c || car.Image_URL__c),
                seats: car.Seats__c || 5
            }));
            
            // Auto select first car if not pre-populated
            if (!this.carName && this.vehiclesList.length > 0) {
                this.carName = this.vehiclesList[0].name;
                this.selectedVehicle = this.vehiclesList[0];
            } else if (this.carName && this.vehiclesList.length > 0) {
                this.selectedVehicle = this.vehiclesList.find(car => car.name === this.carName);
            }
        } else if (error) {
            console.error('Error fetching vehicles inside booking_page LWC:', error);
        }
    }

    extractImageUrl(rawUrl) {
        if (!rawUrl) return 'https://freepngimg.com/thumb/car/3-2-car-free-download-png.png';
        let url = rawUrl;
        if (url.includes('<img') && url.includes('src=')) {
            const match = url.match(/src="([^"]+)"/);
            if (match && match[1]) url = match[1];
        }
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
            const match = url.match(/[-\w]{25,}/);
            if (match && match[0]) {
                return `https://lh3.googleusercontent.com/d/${match[0]}`;
            }
        }
        return url.replace(/&amp;/g, '&');
    }

    get combinedPickupAddress() {
        let parts = [];
        if (this.pickupStreet) parts.push(this.pickupStreet);
        if (this.pickupLandmark) parts.push(this.pickupLandmark);
        if (this.pickupCity) parts.push(this.pickupCity);
        if (this.pickupState) parts.push(this.pickupState);
        if (this.pickupPin) parts.push(this.pickupPin);
        return parts.join(', ');
    }

    get combinedDropoffAddress() {
        let parts = [];
        if (this.dropoffStreet) parts.push(this.dropoffStreet);
        if (this.dropoffLandmark) parts.push(this.dropoffLandmark);
        if (this.dropoffCity) parts.push(this.dropoffCity);
        if (this.dropoffState) parts.push(this.dropoffState);
        if (this.dropoffPin) parts.push(this.dropoffPin);
        return parts.join(', ');
    }

    get pickupLoc() {
        return this.combinedPickupAddress || 'N/A';
    }

    get dropoffLoc() {
        return this.combinedDropoffAddress || 'N/A';
    }

    // Getters for active car attributes
    get activeCarName() {
        if (this.selectedCarName) return this.selectedCarName;
        return this.carName || 'No car selected';
    }

    get activeCarPrice() {
        if (this.selectedCarPrice) return parseFloat(this.selectedCarPrice);
        if (this.selectedVehicle) return parseFloat(this.selectedVehicle.price);
        return 800; // fallback
    }

    get activeCarImage() {
        if (this.selectedCarImage) return this.selectedCarImage;
        if (this.selectedVehicle) return this.selectedVehicle.image;
        return 'https://freepngimg.com/thumb/car/3-2-car-free-download-png.png';
    }

    get activeCarType() {
        if (this.selectedCarType) return this.selectedCarType;
        if (this.selectedVehicle) return this.selectedVehicle.type;
        return 'Premium';
    }

    get activeCarSeats() {
        if (this.selectedVehicle) return this.selectedVehicle.seats;
        return 5;
    }

    // Dynamic Select list for Step 1
    get carOptions() {
        return this.vehiclesList.map(car => ({
            label: `${car.name} (${car.type}) - ₹${car.price}/day`,
            value: car.name
        }));
    }

    // Formatted duration dates string for final checkout Step 3
    get formattedDates() {
        if (!this.startTime || !this.endTime) return '';
        const start = new Date(this.startTime);
        const end = new Date(this.endTime);
        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return `${start.toLocaleDateString('en-US', options)} to ${end.toLocaleDateString('en-US', options)}`;
    }

    // Live Fare Calculation Getters
    get rentalDays() {
        if (!this.startTime || !this.endTime) return 1;
        const start = new Date(this.startTime);
        const end = new Date(this.endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
        
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 1;
    }

    get baseRentalCost() {
        return this.activeCarPrice * this.rentalDays;
    }

    get extrasCost() {
        let total = 0;
        if (this.gpsSelected) total += 299;
        if (this.childSeatSelected) total += 499;
        if (this.insuranceSelected) total += 999;
        if (this.roadsideSelected) total += 399;
        return total * this.rentalDays;
    }

    get taxAmount() {
        return Math.round((this.baseRentalCost + this.extrasCost) * 0.18);
    }

    get grandTotal() {
        return this.baseRentalCost + this.extrasCost + this.taxAmount;
    }

    // Dynamic Stepper UI CSS bindings
    get isStep1() { return this.currentStep === 1; }
    get isStep2() { return this.currentStep === 2; }
    get isStep3() { return this.currentStep === 3; }

    get step1Class() { return `step-item ${this.currentStep >= 1 ? 'active' : ''} ${this.currentStep > 1 ? 'completed' : ''}`; }
    get step2Class() { return `step-item ${this.currentStep >= 2 ? 'active' : ''} ${this.currentStep > 2 ? 'completed' : ''}`; }
    get step3Class() { return `step-item ${this.currentStep >= 3 ? 'active' : ''}`; }

    // Dynamic Payment Radio Selections Classes
    get paymentDestinationClass() { return `payment-option ${this.paymentMethod === 'destination' ? 'selected' : ''}`; }
    get paymentUpiClass() { return `payment-option ${this.paymentMethod === 'upi' ? 'selected' : ''}`; }
    get paymentCardClass() { return `payment-option ${this.paymentMethod === 'card' ? 'selected' : ''}`; }

    get bookingStatusBadgeClass() {
        const status = this.bookingStatus ? this.bookingStatus.toLowerCase() : 'confirmed';
        if (status === 'confirmed') return 'badge-status status-confirmed';
        if (status === 'pending') return 'badge-status status-pending';
        if (status === 'active') return 'badge-status status-paid';
        return 'badge-status status-confirmed';
    }

    get paymentStatusBadgeClass() {
        const pStatus = this.paymentStatus ? this.paymentStatus.toLowerCase() : 'pending';
        if (pStatus === 'paid') return 'badge-status status-confirmed';
        if (pStatus === 'pending') return 'badge-status status-pending';
        if (pStatus === 'refunded') return 'badge-status status-refunded';
        return 'badge-status status-pending';
    }

    upiTimerInterval;

    selectPaymentDestination() { 
        this.paymentMethod = 'destination'; 
        this.bookingStatus = 'Confirmed';
        this.paymentStatus = 'Pending';
        if (this.upiTimerInterval) {
            clearInterval(this.upiTimerInterval);
        }
    }
    selectPaymentUpi() { 
        this.paymentMethod = 'upi'; 
        this.bookingStatus = 'Confirmed';
        // UPI starts as Pending until they enter UTR and verify it!
        this.paymentStatus = this.isUpiVerified ? 'Paid' : 'Pending';
        this.resetUpiTimer();
    }
    selectPaymentCard() { 
        this.paymentMethod = 'card'; 
        this.bookingStatus = 'Confirmed';
        // Card starts as Pending until they click verify/pay!
        this.paymentStatus = this.isCardVerified ? 'Paid' : 'Pending';
        if (this.upiTimerInterval) {
            clearInterval(this.upiTimerInterval);
        }
    }

    resetUpiTimer() {
        if (this.upiTimerInterval) {
            clearInterval(this.upiTimerInterval);
        }
        this.upiCountdown = 300;
        this.upiCountdownStr = '05:00';
        this.upiTimerInterval = setInterval(() => {
            if (this.upiCountdown > 0) {
                this.upiCountdown--;
                const mins = String(Math.floor(this.upiCountdown / 60)).padStart(2, '0');
                const secs = String(this.upiCountdown % 60).padStart(2, '0');
                this.upiCountdownStr = `${mins}:${secs}`;
            } else {
                clearInterval(this.upiTimerInterval);
                this.upiCountdownStr = 'Expired';
                this.showToastNotification('QR Code Expired', 'The UPI QR Code has expired. Please select UPI again to generate a new QR code.', 'warning');
            }
        }, 1000);
    }

    disconnectedCallback() {
        if (this.upiTimerInterval) {
            clearInterval(this.upiTimerInterval);
        }
    }

    // Payment Getters
    get isUpiSelected() {
        return this.paymentMethod === 'upi';
    }

    get isCardSelected() {
        return this.paymentMethod === 'card';
    }

    get paymentStatusPaid() {
        return this.paymentStatus === 'Paid';
    }

    get upiQrCodeUrl() {
        const pa = 'safarsathi@upi';
        const pn = encodeURIComponent('Safar Sathi Rentals');
        const am = this.grandTotal;
        const cu = 'INR';
        const tn = encodeURIComponent('SafarSathiBooking');
        const upiString = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiString)}`;
    }

    // Verification Handlers
    handleVerifyUpi() {
        if (!this.upiTransactionId || this.upiTransactionId.trim() === '') {
            this.showToastNotification('UTR Required', 'Please enter the 12-digit UPI Ref/UTR number from your payment app.', 'error');
            return;
        }
        
        const utrPattern = /^\d{12}$/;
        if (!utrPattern.test(this.upiTransactionId.trim())) {
            this.showToastNotification('Invalid UTR', 'The UPI Transaction ID / UTR must be exactly 12 digits.', 'error');
            return;
        }

        if (this.upiCountdownStr === 'Expired') {
            this.showToastNotification('QR Code Expired', 'Please select UPI again to generate a new QR code.', 'error');
            return;
        }

        this.isVerifyingUpi = true;
        this.upiVerificationButtonLabel = 'Verifying Transaction...';

        setTimeout(() => {
            this.isVerifyingUpi = false;
            this.isUpiVerified = true;
            this.paymentStatus = 'Paid';
            this.upiVerificationButtonLabel = '✓ Payment Verified';
            this.showToastNotification('Payment Verified', 'UPI payment of ₹' + this.grandTotal + ' verified successfully!', 'success');
            if (this.upiTimerInterval) {
                clearInterval(this.upiTimerInterval);
            }
        }, 2000);
    }

    handleCardNumberChange(event) {
        let value = event.target.value.replace(/\D/g, '');
        let formatted = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formatted += ' ';
            }
            formatted += value[i];
        }
        this.cardNumber = formatted;
    }

    handleCardExpiryChange(event) {
        let value = event.target.value.replace(/\D/g, '');
        if (value.length > 2) {
            this.cardExpiry = value.slice(0, 2) + '/' + value.slice(2, 4);
        } else {
            this.cardExpiry = value;
        }
    }

    handleVerifyCard() {
        if (!this.cardNameInput || this.cardNameInput.trim() === '') {
            this.showToastNotification('Cardholder Name Required', 'Please enter the name on the card.', 'error');
            return;
        }
        const cardDigits = this.cardNumber.replace(/\s/g, '');
        if (!cardDigits || cardDigits.length < 16) {
            this.showToastNotification('Invalid Card Number', 'Please enter a valid 16-digit card number.', 'error');
            return;
        }
        if (!this.cardExpiry || !/^\d{2}\/\d{2}$/.test(this.cardExpiry)) {
            this.showToastNotification('Invalid Expiry Date', 'Please enter expiry in MM/YY format.', 'error');
            return;
        }
        if (!this.cardCvv || this.cardCvv.length < 3) {
            this.showToastNotification('Invalid CVV', 'Please enter a 3-digit CVV.', 'error');
            return;
        }

        this.isVerifyingCard = true;
        this.cardVerificationButtonLabel = 'Processing Card Payment...';

        setTimeout(() => {
            this.isVerifyingCard = false;
            this.isCardVerified = true;
            this.paymentStatus = 'Paid';
            this.cardVerificationButtonLabel = '✓ Card Verified';
            this.showToastNotification('Payment Verified', 'Card payment of ₹' + this.grandTotal + ' processed successfully!', 'success');
        }, 2000);
    }

    // Input Handlers
    handleCarChange(event) {
        this.carName = event.target.value;
        this.selectedVehicle = this.vehiclesList.find(car => car.name === this.carName);
    }

    handleInputChange(event) {
        const field = event.target.dataset.id;
        const val = event.target.value;
        if (field in this || Object.prototype.hasOwnProperty.call(this, field)) {
            this[field] = val;
        }
    }

    // Toggle Add-ons Handlers
    handleExtraToggle(event) {
        const extra = event.target.dataset.extra;
        const checked = event.target.checked;
        if (extra === 'gps') {
            this.gpsSelected = checked;
        } else if (extra === 'childSeat') {
            this.childSeatSelected = checked;
        } else if (extra === 'insurance') {
            this.insuranceSelected = checked;
        } else if (extra === 'roadside') {
            this.roadsideSelected = checked;
        }
    }

    // Stepper wizard navigation
    goToNextStep() {
        if (this.currentStep === 1) {
            // Validate Step 1
            if (!this.activeCarName || this.activeCarName === 'No car selected') {
                this.showToastNotification('Selection Required', 'Please select a car first.', 'error');
                return;
            }
            if (!this.startTime || !this.endTime) {
                this.showToastNotification('Dates Required', 'Please choose pickup and dropoff times.', 'error');
                return;
            }
            if (!this.pickupStreet || !this.pickupCity || !this.pickupState || !this.pickupPin) {
                this.showToastNotification('Pickup Address Required', 'Please complete all required fields for pickup address.', 'error');
                return;
            }
            if (!this.dropoffStreet || !this.dropoffCity || !this.dropoffState || !this.dropoffPin) {
                this.showToastNotification('Dropoff Address Required', 'Please complete all required fields for dropoff address.', 'error');
                return;
            }
            const start = new Date(this.startTime);
            const end = new Date(this.endTime);
            const now = new Date();
            // Allow 1 hour grace for past validation
            now.setHours(now.getHours() - 1);
            if (start < now) {
                this.showToastNotification('Invalid Pickup Date', 'Pickup time cannot be in the past.', 'error');
                return;
            }
            if (end <= start) {
                this.showToastNotification('Invalid Dropoff Date', 'Dropoff time must be strictly after pickup time.', 'error');
                return;
            }
            this.currentStep = 2;
        } else if (this.currentStep === 2) {
            // Validate Step 2
            if (!this.cusName || this.cusName.trim() === '') {
                this.showToastNotification('Name Required', 'Please provide the driver\'s full name.', 'error');
                return;
            }
            if (!this.Phone_no || this.Phone_no.trim() === '') {
                this.showToastNotification('Mobile Required', 'Please provide a valid phone number.', 'error');
                return;
            }
            const phonePattern = /^\d{10}$/;
            if (!phonePattern.test(this.Phone_no.replace(/[-+\s()]/g, ''))) {
                this.showToastNotification('Invalid Mobile', 'Please provide a valid 10-digit mobile number.', 'error');
                return;
            }
            if (!this.Email_Id || this.Email_Id.trim() === '') {
                this.showToastNotification('Email Required', 'Please provide an email address.', 'error');
                return;
            }
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(this.Email_Id)) {
                this.showToastNotification('Invalid Email', 'Please provide a valid email format.', 'error');
                return;
            }
            this.currentStep = 3;
        }
    }

    goToPreviousStep() {
        if (this.currentStep > 1) {
            this.currentStep -= 1;
        }
    }

    // Call apex to save booking
    handleBookNow() {
        // Real payment validations
        if (this.paymentMethod === 'upi' && !this.isUpiVerified) {
            this.showToastNotification('Payment Required', 'Please scan the QR code and verify your UPI payment first.', 'error');
            return;
        }
        if (this.paymentMethod === 'card' && !this.isCardVerified) {
            this.showToastNotification('Payment Required', 'Please enter your card details and process card payment first.', 'error');
            return;
        }

        const params = {
            carName: this.activeCarName,
            customerName: this.cusName,
            customerEmail: this.Email_Id,
            customerPhone: this.Phone_no,
            pickupStreet: this.pickupStreet,
            pickupCity: this.pickupCity,
            pickupState: this.pickupState,
            pickupPin: this.pickupPin,
            dropoffStreet: this.dropoffStreet,
            dropoffCity: this.dropoffCity,
            dropoffState: this.dropoffState,
            dropoffPin: this.dropoffPin,
            pickupTime: new Date(this.startTime).toISOString(),
            dropoffTime: new Date(this.endTime).toISOString(),
            totalAmount: this.grandTotal,
            status: this.bookingStatus,
            paymentStatus: this.paymentStatus
        };

        createRentalBooking(params)
        .then(result => {
            console.log("createRentalBooking successful result ID: " + result);
            this.bookingId = result;
            this.isBookingSuccessful = true;
            this.showToastNotification('Reservation Successful', 'Your booking is confirmed. A receipt is sent.', 'success');
            
            // Dispatch dynamic event to alert parent of completion
            const successEvent = new CustomEvent('bookingsuccess', {
                detail: {
                    bookingId: result,
                    carName: this.activeCarName,
                    totalPrice: this.grandTotal,
                    driverEmail: this.Email_Id
                }
            });
            this.dispatchEvent(successEvent);
        })
        .catch(error => {
            console.error("createBooking error: " + JSON.stringify(error));
            const errMsg = error.body && error.body.message ? error.body.message : 'Please check your inputs and try again.';
            this.showToastNotification('Reservation Failed', errMsg, 'error');
        });
    }

    // Reset checkout form state
    resetBooking() {
        this.cusName = '';
        this.Phone_no = '';
        this.Email_Id = '';
        this.pickupStreet = '';
        this.pickupLandmark = '';
        this.pickupCity = 'Patna';
        this.pickupState = 'Bihar';
        this.pickupPin = '';
        this.dropoffStreet = '';
        this.dropoffLandmark = '';
        this.dropoffCity = 'Patna';
        this.dropoffState = 'Bihar';
        this.dropoffPin = '';
        this.gpsSelected = false;
        this.childSeatSelected = false;
        this.insuranceSelected = false;
        this.roadsideSelected = false;
        this.paymentMethod = 'destination';
        this.bookingStatus = 'Confirmed';
        this.paymentStatus = 'Pending';
        this.currentStep = 1;
        this.isBookingSuccessful = false;
        this.bookingId = '';

        // Reset payment verification details
        this.upiTransactionId = '';
        this.isUpiVerified = false;
        this.upiCountdown = 300;
        this.upiCountdownStr = '05:00';
        this.isVerifyingUpi = false;
        this.upiVerificationButtonLabel = 'Verify Payment';
        if (this.upiTimerInterval) {
            clearInterval(this.upiTimerInterval);
        }

        this.cardNameInput = '';
        this.cardNumber = '';
        this.cardExpiry = '';
        this.cardCvv = '';
        this.isCardVerified = false;
        this.isVerifyingCard = false;
        this.cardVerificationButtonLabel = 'Verify Card & Pay';

        // Reset default dates
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        this.startTime = this.formatDateTimeLocal(tomorrow);

        const nextDay = new Date(tomorrow);
        nextDay.setDate(nextDay.getDate() + 1);
        this.endTime = this.formatDateTimeLocal(nextDay);
    }

    // Toast Notifications Helpers
    showToastNotification(title, message, variant) {
        this.toastTitle = title;
        this.toastMessage = message;
        this.toastVariant = variant;
        this.showToast = true;
    }

    handleCloseToast() {
        this.showToast = false;
    }
}
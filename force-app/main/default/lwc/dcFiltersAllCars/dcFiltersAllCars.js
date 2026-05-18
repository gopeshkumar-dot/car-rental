import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import searchVehicles from '@salesforce/apex/VehicleController.searchVehicles';
import createRentalBooking from '@salesforce/apex/VehicleController.createRentalBooking';

export default class DcFiltersAllCars extends LightningElement {
    @track filteredCars = [];
    allCars = [];
    initialSearchTerm = '';
    @track isLoading = true;

    connectedCallback() {
        // Read search parameter from URL if any
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const searchParam = urlParams.get('search');
            if (searchParam) {
                this.initialSearchTerm = searchParam;
            }
            // Listen to custom performSearch event
            this._handleSearchEvent = this.handleSearchEvent.bind(this);
            window.addEventListener('performSearch', this._handleSearchEvent);
        }
        
        // Fetch initial data
        this.fetchVehicles(this.initialSearchTerm || '');
    }

    disconnectedCallback() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('performSearch', this._handleSearchEvent);
        }
    }

    handleSearchEvent(event) {
        if (event && event.detail) {
            this.handlePerformSearch(event.detail);
        }
    }

    handlePerformSearch(searchTerm) {
        this.fetchVehicles(searchTerm);
    }

    // Helper to convert Google Drive shareable links to direct image links
    /*convertGoogleDriveUrl(url) {
        if (!url || typeof url !== 'string') return url;
        
        // Check if it's a Google Drive link
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
            // Regex to extract the File ID from various Google Drive URL formats
            const match = url.match(/[-\w]{25,}/);
            if (match && match[0]) {
                const fileId = match[0];
                // Use lh3.googleusercontent.com for direct image rendering
                return `https://lh3.googleusercontent.com/d/${fileId}`;
            }
        }
        return url;
    }*/
    //change by Bhaskar
        convertGoogleDriveUrl(url) {

    if (!url || typeof url !== 'string') {
        return 'https://via.placeholder.com/400x250?text=No+Image';
    }

    // Google Drive URL
    if (url.includes('drive.google.com')) {

        const match = url.match(/[-\w]{25,}/);

        if (match && match[0]) {

            const fileId = match[0];

            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
    }

    return url;
}
//end change by Bhaskar

    fetchVehicles(searchTerm) {
        this.isLoading = true;
        searchVehicles({ searchTerm: searchTerm || '' })
            .then(data => {
                this.filteredCars = data.map(car => {
                    const rawImageUrl = car.Main_Image_URL__c || car.Image_URL__c || 'https://via.placeholder.com/400x250?text=No+Image';
                    return {
                        id: car.Id,
                        name: car.Name || 'Unknown',
                        fullName: car.Name || 'Unknown',
                        type: car.Car_Type__c || car.Type__c || 'Car',
                        status: car.Status__c || 'Available',
                        statusClass: car.Status__c === 'Available' ? 'status-tag available' : 'status-tag booked',
                        seats: car.Seats__c || '4',
                        price: car.Daily_Rate__c || 0,
                        priceDisplay: car.Daily_Rate__c ? car.Daily_Rate__c.toLocaleString('en-IN') : '0',
                        City: car.City__c || '',
                        imageUrl: this.convertGoogleDriveUrl(rawImageUrl)
                    };
                });
            })
            .catch(error => {
                console.error('Error fetching vehicles:', error);
                this.showToast('Error', 'Failed to search cars', 'error');
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    // Modal state
    @track showBookingModal = false;
    @track selectedCar = {};

    // Booking form fields
    @track bookingCustomerName = '';
    @track bookingCustomerEmail = '';
    @track bookingCustomerPhone = '';
    
    @track pickupLocation = '';
    @track pickupAddress = '';
    @track pickupState = '';
    
    @track dropoffLocation = '';
    @track dropoffAddress = '';
    @track dropoffState = '';
    
    @track pickupDate = '';
    @track dropoffDate = '';

    @track totalAmount = 0;
    @track durationDays = 0;
    @track bookingError = '';
    @track isSubmitting = false;

    // Wired method has been replaced with imperative apex call.

    handleBookNow(event) {
        const carId = event.currentTarget.dataset.id;
        this.selectedCar = this.filteredCars.find(c => c.id === carId);
        
        // Reset form
        this.bookingCustomerName = '';
        this.bookingCustomerEmail = '';
        this.bookingCustomerPhone = '';
        this.pickupLocation = '';
        this.pickupAddress = '';
        this.pickupState = '';
        this.dropoffLocation = '';
        this.dropoffAddress = '';
        this.dropoffState = '';
        this.pickupDate = '';
        this.dropoffDate = '';
        this.totalAmount = 0;
        this.durationDays = 0;
        this.bookingError = '';
        this.isSubmitting = false;

        this.showBookingModal = true;
    }

    closeModal() {
        this.showBookingModal = false;
    }

    handleOverlayClick() {
        this.closeModal();
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    // Input handlers
    handleCustomerNameChange(event) { this.bookingCustomerName = event.target.value; }
    handleCustomerEmailChange(event) { this.bookingCustomerEmail = event.target.value; }
    handleCustomerPhoneChange(event) { this.bookingCustomerPhone = event.target.value; }
    
    handlePickupLocationChange(event) { this.pickupLocation = event.target.value; }
    handlePickupAddressChange(event) { this.pickupAddress = event.target.value; }
    handlePickupStateChange(event) { this.pickupState = event.target.value; }
    
    handleDropoffLocationChange(event) { this.dropoffLocation = event.target.value; }
    handleDropoffAddressChange(event) { this.dropoffAddress = event.target.value; }
    handleDropoffStateChange(event) { this.dropoffState = event.target.value; }
    
    handlePickupDateChange(event) { 
        this.pickupDate = event.target.value; 
        this.calculateTotal();
    }
    
    handleDropoffDateChange(event) { 
        this.dropoffDate = event.target.value; 
        this.calculateTotal();
    }

    calculateTotal() {
        if (this.pickupDate && this.dropoffDate) {
            const start = new Date(this.pickupDate);
            const end = new Date(this.dropoffDate);
            
            if (start && end && end > start) {
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                this.durationDays = diffDays;
                this.totalAmount = diffDays * this.selectedCar.price;
            } else {
                this.durationDays = 0;
                this.totalAmount = 0;
            }
        } else {
            this.durationDays = 0;
            this.totalAmount = 0;
        }
    }

    handleBookingSubmit(event) {
        event.preventDefault();
        
        if (!this.pickupDate || !this.dropoffDate) {
            this.bookingError = 'Please select valid pickup and dropoff dates.';
            return;
        }

        const start = new Date(this.pickupDate);
        const end = new Date(this.dropoffDate);

        if (end <= start) {
            this.bookingError = 'Dropoff date must be after pickup date.';
            return;
        }

        this.bookingError = '';
        this.isSubmitting = true;

        const params = {
            vehicleId: this.selectedCar.id,
            customerId: '', // Null is handled by empty string
            customerName: this.bookingCustomerName,
            customerEmail: this.bookingCustomerEmail,
            customerPhone: this.bookingCustomerPhone,
            pickupLoc: this.pickupLocation,
            dropoffLoc: this.dropoffLocation,
            pickupAddress: this.pickupAddress,
            pickupState: this.pickupState,
            dropoffAddress: this.dropoffAddress,
            dropoffState: this.dropoffState,
            pickupTime: start.toISOString(),
            dropoffTime: end.toISOString(),
            totalAmount: this.totalAmount
        };

        createRentalBooking(params)
            .then(result => {
                this.showToast('Success', 'Booking confirmed successfully!', 'success');
                this.closeModal();
            })
            .catch(error => {
                console.error('Error creating booking:', error);
                this.bookingError = error.body?.message || 'Failed to create booking.';
            })
            .finally(() => {
                this.isSubmitting = false;
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
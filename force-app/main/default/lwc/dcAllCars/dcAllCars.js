import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getAllVehicles from '@salesforce/apex/VehicleController.getAllVehicles';
import createRentalBooking from '@salesforce/apex/VehicleController.createRentalBooking';
import getLoggedInUser from '@salesforce/apex/VehicleController.getLoggedInUser';
import getLocations from '@salesforce/apex/VehicleController.getLocations';
import getPicklistOptions from '@salesforce/apex/VehicleController.getPicklistOptions';
import { NavigationMixin } from 'lightning/navigation';
import heroImage from '@salesforce/resourceUrl/heroCarBlue';

export default class DcAllCars extends NavigationMixin(LightningElement) {

    @track allCars = [];
    @track filteredCars = [];
    @track categories = [];
    @track subCategories = [];
    @track locationOptions = [];
    selectedCategory = '';
    selectedSubCategory = '';
    minPrice = '';
    maxPrice = '';
    @track showBookingModal = false;
    @track selectedCar = {};
    @track carName = '';
    @track model = '';
    @track models = [];

    // User Data
    @track currentUser = {};
    userEmail = localStorage.getItem('userEmail') || '';

    connectedCallback() {
        // Load all picklist values from Apex on component load
        this.loadPicklists();
    }

    loadPicklists() {
        // Load Category picklist
        getPicklistOptions({ fieldName: 'Category__c' })
            .then(data => {
                if (data && data.length > 0) {
                    this.categories = data.map(d => ({ label: d.label, value: d.value }));
                }
            })
            .catch(err => console.error('Category picklist error', err));

        // Load Sub_Category picklist
        getPicklistOptions({ fieldName: 'Sub_Category__c' })
            .then(data => {
                if (data && data.length > 0) {
                    this.subCategories = data.map(d => ({ label: d.label, value: d.value }));
                }
            })
            .catch(err => console.error('Sub_Category picklist error', err));

        // Load Model picklist
        getPicklistOptions({ fieldName: 'Model__c' })
            .then(data => {
                if (data && data.length > 0) {
                    this.models = data.map(d => ({ label: d.label, value: d.value }));
                }
            })
            .catch(err => console.error('Model picklist error', err));
    }

    // fatch image
    

    @wire(getLoggedInUser, { email: '$userEmail' })
    wiredUser({ error, data }) {
        if (data) {
            this.currentUser = data;
        }
    }

    @wire(getLocations)
    wiredLocations({ error, data }) {
        if (data) {
            this.locationOptions = data.map(loc => ({
                label: `${loc.Name} (${loc.City__c})`,
                value: loc.Id
            }));
        }
    }

    // Booking Form Properties
    @track totalAmount = 0;
    @track durationDays = 0;
    @track pickupDate = '';
    @track dropoffDate = '';
    @track pickupLocation = '';
    @track dropoffLocation = '';
    get heroCarImageUrl() {
        // Fallback to a high-quality car image if the static resource is missing
        return heroImage || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=2000';
    }

    handlePickupLocationChange(event) {
        this.pickupLocation = event.target.value;
    }

    handleDropoffLocationChange(event) {
        this.dropoffLocation = event.target.value;
    }

   

    // Helper to convert Google Drive shareable links to direct image links
    convertGoogleDriveUrl(url) {
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
    }

    @wire(getAllVehicles)
    wiredCars({ error, data }) {
        if (data) {
            this.allCars = data.map(item => {
                const ratingCount = Math.floor(Math.random() * 50) + 1;
                const rating = 5;
                const fullStars = Math.floor(rating);

                let stars = [];
                for (let i = 0; i < 5; i++) {
                    stars.push({ id: i, filled: i < fullStars });
                }

                const rawImageUrl = item.Main_Image_URL__c || item.Image_URL__c || 'https://via.placeholder.com/400x200?text=No+Image';
                const finalImageUrl = this.convertGoogleDriveUrl(rawImageUrl);
                
                console.log('Original URL:', rawImageUrl);
                console.log('Converted URL:', finalImageUrl);

                return {    
                    id: item.Id,
                    name: item.Name,
                    make: item.Make__c,
                    model: item.Model__c,
                    mainImage: item.Main_Image_URL__c || ' not Available',
                    fullName: item.Make__c && item.Model__c ? `${item.Make__c} ${item.Model__c}` : item.Name,
                    type: item.Category__c || 'Car',
                    subCategory: item.Sub_Category__c,
                    price: parseFloat(item.Daily_Rate__c) || 0,
                    priceDisplay: (item.Daily_Rate__c || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                    imageUrl: finalImageUrl,
                    ratingCount: ratingCount,
                    stars: stars,
                    seats: item.Seats__c ? `${item.Seats__c} Seats` : '5 Seats',
                    transmission: item.Transmission__c || 'Automatic',
                    fuelType: item.Fuel_Type__c || 'Petrol',
                    isAuto: item.Transmission__c === 'Automatic',
                    isFuel: !!item.Fuel_Type__c,
                    status: item.Status__c || 'Available',
                    statusClass: `status-badge ${item.Status__c === 'Available' ? 'status-available' : 'status-booked'}`,
                    location: item.Location__c
                };
            });

            // Fallback: if Apex picklists still returned nothing, build from actual data
            this.generateDropdownFallbacks();
            this.applyFilters();
        } else if (error) {
            console.error('Error fetching vehicles', error);
        }
    }

    generateDropdownFallbacks() {
        if (this.models.length === 0) {
            const modelSet = new Set();
            this.allCars.forEach(car => { if (car.model) modelSet.add(car.model); });
            this.models = Array.from(modelSet).sort().map(m => ({ label: m, value: m }));
        }
        if (this.categories.length === 0) {
            const catSet = new Set();
            this.allCars.forEach(car => { if (car.type) catSet.add(car.type); });
            this.categories = Array.from(catSet).sort().map(c => ({ label: c, value: c }));
        }
        if (this.subCategories.length === 0) {
            const subSet = new Set();
            this.allCars.forEach(car => { if (car.subCategory) subSet.add(car.subCategory); });
            this.subCategories = Array.from(subSet).sort().map(s => ({ label: s, value: s }));
        }
    }

    handleCategoryChange(event) {
        this.selectedCategory = event.target.value;
        this.applyFilters();
    }

    handleSubCategoryChange(event) {
        this.selectedSubCategory = event.target.value;
        this.applyFilters();
    }

    handleModelChange(event) {
        this.model = event.target.value;
        this.applyFilters();
    }

    handleSearchClick() {
        this.applyFilters();
    }

    handleCarNameChange(event) {
        this.carName = event.target.value;
        this.applyFilters();
    }

    handleResetFilters() {
        this.carName = '';
        this.model = '';
        this.minPrice = '';
        this.maxPrice = '';
        this.selectedCategory = '';
        this.selectedSubCategory = '';
        this.applyFilters();
    }

    handleMinPriceChange(event) {
        this.minPrice = event.target.value;
        this.applyFilters();
    }

    handleMaxPriceChange(event) {
        this.maxPrice = event.target.value;
        this.applyFilters();
    }

    // Booking form fields
    @track bookingCustomerName = '';
    @track bookingCustomerEmail = '';
    @track bookingCustomerPhone = '';
    @track pickupAddress = '';
    @track pickupState = '';
    @track dropoffAddress = '';
    @track dropoffState = '';
    @track bookingError = '';
    @track isSubmitting = false;

    closeModal() {
        this.showBookingModal = false;
        document.body.style.overflow = '';
    }

    handleOverlayClick() {
        this.closeModal();
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    handleCustomerNameChange(event) {
        this.bookingCustomerName = event.target.value;
    }

    handleCustomerEmailChange(event) {
        this.bookingCustomerEmail = event.target.value;
    }

    handleCustomerPhoneChange(event) {
        this.bookingCustomerPhone = event.target.value;
    }

    handlePickupAddressChange(event) {
        this.pickupAddress = event.target.value;
    }

    handlePickupStateChange(event) {
        this.pickupState = event.target.value;
    }

    handleDropoffAddressChange(event) {
        this.dropoffAddress = event.target.value;
    }

    handleDropoffStateChange(event) {
        this.dropoffState = event.target.value;
    }

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
            if (end > start) {
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                this.durationDays = diffDays;
                this.totalAmount = (diffDays * this.selectedCar.price).toFixed(2);
            } else {
                this.durationDays = 0;
                this.totalAmount = 0;
            }
        }
    }

    handleBookingSubmit(event) {
        event.preventDefault();
        this.bookingError = '';

        // Read values directly from form inputs as safety net
        const formInputs = this.template.querySelectorAll('.form-input');
        formInputs.forEach(input => {
            if (input.type === 'text' && input.placeholder && input.placeholder.includes('full name')) {
                this.bookingCustomerName = input.value;
            } else if (input.type === 'email') {
                this.bookingCustomerEmail = input.value;
            } else if (input.type === 'tel') {
                this.bookingCustomerPhone = input.value;
            } else if (input.type === 'text' && input.placeholder && input.placeholder.includes('City')) {
                if (!this.pickupLocation && input.required) {
                    this.pickupLocation = input.value;
                } else if (!this.dropoffLocation && !input.required) {
                    this.dropoffLocation = input.value;
                }
            } else if (input.type === 'datetime-local') {
                if (!this.pickupDate && input.required) {
                    this.pickupDate = input.value;
                } else if (input.value && this.pickupDate && !this.dropoffDate) {
                    this.dropoffDate = input.value;
                }
            }
        });

        console.log('Booking values:', {
            name: this.bookingCustomerName,
            email: this.bookingCustomerEmail,
            pickup: this.pickupLocation,
            dropoff: this.dropoffLocation,
            pickupDate: this.pickupDate,
            dropoffDate: this.dropoffDate,
            car: this.selectedCar.id
        });

        // Validate required fields
        if (!this.bookingCustomerName || !this.bookingCustomerEmail) {
            this.bookingError = 'Please fill in your name and email.';
            return;
        }
        if (!this.pickupLocation) {
            this.bookingError = 'Please enter a pickup location.';
            return;
        }
        if (!this.pickupDate || !this.dropoffDate) {
            this.bookingError = 'Please select both pickup and dropoff dates.';
            return;
        }
        if (new Date(this.dropoffDate) <= new Date(this.pickupDate)) {
            this.bookingError = 'Dropoff date must be after pickup date.';
            return;
        }

        this.isSubmitting = true;

        const params = {
            vehicleId: this.selectedCar.id,
            customerId: this.currentUser && this.currentUser.Id ? this.currentUser.Id : null,
            customerName: this.bookingCustomerName,
            customerEmail: this.bookingCustomerEmail,
            customerPhone: this.bookingCustomerPhone || '',
            pickupLoc: this.pickupLocation,
            dropoffLoc: this.dropoffLocation || this.pickupLocation,
            pickupAddress: this.pickupAddress,
            pickupState: this.pickupState,
            dropoffAddress: this.dropoffAddress || this.pickupAddress,
            dropoffState: this.dropoffState || this.pickupState,
            pickupTime: new Date(this.pickupDate).toISOString(),
            dropoffTime: new Date(this.dropoffDate).toISOString(),
            totalAmount: parseFloat(this.totalAmount) || 0
        };

        console.log('Sending to Apex:', JSON.stringify(params));

        createRentalBooking(params)
            .then(result => {
                this.isSubmitting = false;
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Booking Confirmed!',
                    message: `Your booking is confirmed. Reference ID: ${result}`,
                    variant: 'success',
                }));
                this.closeModal();
            })
            .catch(error => {
                this.isSubmitting = false;
                const msg = (error && error.body && error.body.message) ? error.body.message : 'Booking failed. Please try again.';
                this.bookingError = msg;
                console.error('Booking error:', error);
            });
    }

    applyFilters() {
        const searchTerm = this.carName ? this.carName.toLowerCase().trim() : '';

        this.filteredCars = this.allCars.filter(car => {
            const categoryMatch = !this.selectedCategory || car.type === this.selectedCategory;
            const subCategoryMatch = !this.selectedSubCategory || car.subCategory === this.selectedSubCategory;
            const minPriceMatch = this.minPrice === '' || car.price >= parseFloat(this.minPrice);
            const maxPriceMatch = this.maxPrice === '' || car.price <= parseFloat(this.maxPrice);
            const nameMatch = !searchTerm ||
                (car.name && car.name.toLowerCase().includes(searchTerm)) ||
                (car.make && car.make.toLowerCase().includes(searchTerm)) ||
                (car.model && car.model.toLowerCase().includes(searchTerm)) ||
                (car.fullName && car.fullName.toLowerCase().includes(searchTerm)) ||
                (car.type && car.type.toLowerCase().includes(searchTerm)) ||
                (car.subCategory && car.subCategory.toLowerCase().includes(searchTerm));
            const modelMatch = !this.model || car.model === this.model;

            return categoryMatch && subCategoryMatch && minPriceMatch && maxPriceMatch && nameMatch && modelMatch;
        });
    }
}
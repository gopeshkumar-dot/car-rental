import { LightningElement, track, wire } from 'lwc';
import getAllVehicles from '@salesforce/apex/VehicleController.getAllVehicles';
import HomePage from "@salesforce/resourceUrl/HomePage";

export default class FirstPage extends LightningElement {
    homePageImage = HomePage;
    
    // get backgroundStyle() {
    //     return `--hero-bg-image: url("${HomePage}");`;
    // }

    @track carsData = [];
    @track filteredCars = [];
    @track showContactUs = false;
    @track showContact = false;
    
    @track testimonials = [
        {
            id: 1,
            name: "Rahul Sharma",
            role: "Business Traveler",
            text: "Excellent service! The car was perfectly clean and the driver was very professional. Highly recommended for airport transfers.",
            image: "https://randomuser.me/api/portraits/men/32.jpg"
        },
        {
            id: 2,
            name: "Priya Patel",
            role: "Tourist",
            text: "We rented an SUV for our family trip to the mountains. The condition of the car was top-notch and the booking process was seamless.",
            image: "https://randomuser.me/api/portraits/women/44.jpg"
        },
        {
            id: 3,
            name: "Amit Kumar",
            role: "Local Resident",
            text: "Safar Sathi offers the most affordable rates for luxury cars. I rented a Mercedes for my wedding and it made the day truly special.",
            image: "https://randomuser.me/api/portraits/men/86.jpg"
        }
    ];

    @track currentTestimonialIndex = 0;
    @track showBookingModal = false;
    @track selectedBookingCar = null;

    get selectedBookingCarName() {
        return this.selectedBookingCar ? this.selectedBookingCar.name : '';
    }

    get selectedBookingCarPrice() {
        return this.selectedBookingCar ? this.selectedBookingCar.price : 0;
    }

    get selectedBookingCarImage() {
        return this.selectedBookingCar ? this.selectedBookingCar.image : '';
    }

    get selectedBookingCarType() {
        return this.selectedBookingCar ? this.selectedBookingCar.type : '';
    }

    isLoading = true;
    selectedCarType = 'All';
    navbarScrolled = false;
    countersActivated = false;

    @track stats = [
        { id: 1, label: 'Years Experience', target: 5, count: 0, showPlus: true },
        { id: 2, label: 'Premium Cars', target: 20, count: 0, showPlus: true },
        { id: 3, label: 'Happy Customers', target: 600, count: 0, showPlus: true },
        { id: 4, label: 'Average Rating', target: 5, count: 0, showPlus: false, showStars: true }
    ];

    get activeTestimonial() {
        return this.testimonials[this.currentTestimonialIndex];
    }

    @wire(getAllVehicles)
    wiredVehicles({ error, data }) {
        if (data) {
            this.carsData = data.map(car => {
                return {
                    id: car.Id,
                    name: car.Name,
                    type: car.Category__c || 'Unknown',
                    price: car.Daily_Rate__c || 0,
                    fuel: car.Fuel_Type__c || 'N/A',
                    seats: car.Seats__c || 4,
                    transmission: car.Transmission__c || 'N/A',
                    image: this.extractImageUrl(car.Main_Image_URL__c || car.Image_URL__c)
                };
            });
            this.filteredCars = [...this.carsData];
            this.isLoading = false;
        } else if (error) {
            console.error('Error fetching vehicles:', error);
            this.isLoading = false;
        }
    }

    extractImageUrl(rawUrl) {
        if (!rawUrl) return 'https://freepngimg.com/thumb/car/3-2-car-free-download-png.png';
        
        let url = rawUrl;
        
        // If it's an HTML img tag (e.g. from a Rich Text Field), extract the src
        if (url.includes('<img') && url.includes('src=')) {
            const match = url.match(/src="([^"]+)"/);
            if (match && match[1]) {
                url = match[1];
            }
        }
        
        // Convert Google Drive Links to direct image links
        if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
            const match = url.match(/[-\w]{25,}/);
            if (match && match[0]) {
                return `https://lh3.googleusercontent.com/d/${match[0]}`;
            }
        }
        
        // Handle HTML encoding if any
        url = url.replace(/&amp;/g, '&');
        
        return url;
    }

    connectedCallback() {
        window.addEventListener('scroll', this.handleScroll.bind(this));
    }

    handleContactClick(event) {
        event.preventDefault();
        this.showContactUs = true;
    }

    openContact() {
        this.showContact = true;
    }

    handleBookCar(event) {
        const carId = event.target.dataset.id;
        this.selectedBookingCar = this.carsData.find(car => car.id === carId);
        this.showBookingModal = true;
    }

    closeBookingModal() {
        this.showBookingModal = false;
        this.selectedBookingCar = null;
    }

    disconnectedCallback() {
        window.removeEventListener('scroll', this.handleScroll.bind(this));
    }

    handleScroll() {
        if (window.scrollY > 50) {
            this.navbarScrolled = true;
        } else {
            this.navbarScrolled = false;
        }

        // Trigger counters
        if (!this.countersActivated) {
            this.animateCounters();
            this.countersActivated = true; // basic implementation, triggers on first scroll
        }
    }

    handleCarTypeChange(event) {
        this.selectedCarType = event.target.value;
    }

    handleSearch() {
        this.isLoading = true;
        this.filteredCars = [];
        
        setTimeout(() => {
            if (this.selectedCarType === 'All') {
                this.filteredCars = [...this.carsData];
            } else {
                this.filteredCars = this.carsData.filter(car => car.type === this.selectedCarType);
            }
            this.isLoading = false;
        }, 600);
    }

    nextTestimonial() {
        if (this.currentTestimonialIndex < this.testimonials.length - 1) {
            this.currentTestimonialIndex++;
        } else {
            this.currentTestimonialIndex = 0;
        }
    }

    prevTestimonial() {
        if (this.currentTestimonialIndex > 0) {
            this.currentTestimonialIndex--;
        } else {
            this.currentTestimonialIndex = this.testimonials.length - 1;
        }
    }

    animateCounters() {
        this.stats = this.stats.map(stat => {
            return { ...stat, count: stat.target }; // simplified immediate assignment for LWC to avoid complex rerenders
        });
    }

    get navbarClass() {
        return `navbar navbar-expand-lg fixed-top ${this.navbarScrolled ? 'scrolled' : ''}`;
    }
}
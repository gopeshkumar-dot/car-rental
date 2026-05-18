import { LightningElement, track } from 'lwc';
// Import the static resource URLs
import sedanImage from '@salesforce/resourceUrl/f_p1';
import suvImage from '@salesforce/resourceUrl/Q72';
import convertibleImage from '@salesforce/resourceUrl/f_p3';
import Xuv from '@salesforce/resourceUrl/Offerimg';
import Step1 from '@salesforce/resourceUrl/Offerstep1';
import Step2 from '@salesforce/resourceUrl/Offerstep2';
import Step3 from '@salesforce/resourceUrl/Offerstep3';



export default class CarRentalOffers extends LightningElement {
   @track ShowBookingPage = false;
   Step1 = Step1;
   Step2 = Step2;
   Step3 = Step3;
   car = Xuv

    @track offers = [
        {
            id: '1',
            name: 'Sedan',
            description: 'Comfortable and spacious sedan',
            price: 500,
            imageURL: sedanImage
        },
        {
            id: '2',
            name: 'SUV',
            description: 'Powerful and spacious SUV',
            price: 800,
            imageURL: suvImage
        },
        {
            id: '3',
            name: 'Convertible',
            description: 'Stylish convertible for a fun ride',
            price: 1000,
            imageURL: convertibleImage
        },
        {
            id: '4',
            name: 'XUV-700',
            description: 'Stylish XUV-700 for a family tour',
            price: 1600,
            imageURL: Xuv
            
        }
    ];
    @track filteredOffers = [...this.offers];
    @track noOffersFound = false;

    handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        this.filteredOffers = this.offers.filter(offer =>
            offer.name.toLowerCase().includes(searchTerm) || 
            offer.description.toLowerCase().includes(searchTerm)
        );
        this.noOffersFound = this.filteredOffers.length === 0;
    }

    handleBookNow(event) {
        const offerId = event.target.dataset.id;
        const offer = this.offers.find(offer => offer.id === offerId);
        alert(`You have booked: ${offer.name}`);
        this.ShowBookingPage = true;
    }
      closeModal2(){
        this.ShowBookingPage = false;
    }


    
}
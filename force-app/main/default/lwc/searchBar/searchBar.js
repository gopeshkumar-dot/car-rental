import { LightningElement, track, wire } from 'lwc';
import searchCars from '@salesforce/apex/CarSearchController.searchCars';
import getCarDetails from '@salesforce/apex/CarSearchController.getCarDetails';
import getContentVersionsAsBase64 from '@salesforce/apex/CarSearchController.getContentVersionsAsBase64';

export default class CarSearch extends LightningElement {
    @track carImage;
    @track error;
    @track urls = [];
    @track searchTerm = '';
    @track cars = [];
    @track isModalOpen = false;
    @track car;
    @track handleorder = false;

    handleSearchTermChange(event) {
        this.searchTerm = event.target.value;
        if (this.searchTerm.trim() !== '') {
            searchCars({ searchTerm: this.searchTerm })
                .then(result => {
                    this.cars = result;
                })
                .catch(error => {
                    console.error('Error:', error);
                    this.cars = [];
                });
        } else {
            this.cars = [];
        }
    }

    handleCarClick(event) {
        const carId = event.currentTarget.dataset.id;

        getContentVersionsAsBase64({ carIds: carId })
            .then(result => {
                console.log('result : ',JSON.stringify(result));
                this.urls = result.map(item => {
                    const fileExtension = item.FileExtension.toLowerCase();
                    return `data:image/${fileExtension};base64,${item.Base64Data}`;
                });
            })
            .catch(error => {
                console.error('Error:', error);
            });

        getCarDetails({ carId })
            .then(result => {
                this.car = result;
                this.isModalOpen = true;
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }

    closeModal() {
        this.isModalOpen = false;
        this.handleorder = false;
    }

    handleBook() {
        console.log('Booking car:', this.car.Id);
        this.isModalOpen = false;
         this.handleorder = true;
    }
}
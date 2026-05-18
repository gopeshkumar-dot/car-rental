import { LightningElement, track, wire } from 'lwc';

import getAboutPageData
from '@salesforce/apex/AboutPageController.getAboutPageData';

import getFeatures
from '@salesforce/apex/AboutPageController.getFeatures';

import getServices
from '@salesforce/apex/AboutPageController.getServices';
import { NavigationMixin }
from 'lightning/navigation';

export default class CarRenterAbout extends NavigationMixin(LightningElement) {

    @track pageData = {};

    @track features = [];

    @track services = [];

    @track selectedFeature;

    @track showModal = false;

    @track contactPage = false;

    @track aboutpage = true;

    /* =========================================
       MAIN PAGE CONTENT
    ========================================= */

    @wire(getAboutPageData)
    wiredPageData({ data, error }) {

        if (data) {

            this.pageData = data.pageData;
            console.log(
    'PAGE DATA',
    JSON.stringify(data)
);
        }

        else if (error) {

            console.error(
                'Error loading page data',
                error
            );
        }
    }

    /* =========================================
       FEATURES
    ========================================= */

    @wire(getFeatures)
    wiredFeatures({ data, error }) {

        if (data) {

            this.features = data;
        }

        else if (error) {

            console.error(
                'Error loading features',
                error
            );
        }
    }

    /* =========================================
       SERVICES
    ========================================= */

    @wire(getServices)
    wiredServices({ data, error }) {

        if (data) {

            this.services = data;
        }

        else if (error) {

            console.error(
                'Error loading services',
                error
            );
        }
    }

    /* =========================================
       MODAL
    ========================================= */

    openModal(event) {

    event.stopPropagation();

    const featureId =
        event.currentTarget.dataset.id;

    this.selectedFeature =
        this.features.find(
            item => item.Id === featureId
        );

    this.showModal = true;
}

closeModal() {

    this.showModal = false;
}


    /* =========================================
       CONTACT
    ========================================= */

    handleContactUs() {

    this[NavigationMixin.Navigate]({

        type: 'comm__namedPage',

        attributes: {

            name: 'Contact_Us__c'
        }
    });
}
}
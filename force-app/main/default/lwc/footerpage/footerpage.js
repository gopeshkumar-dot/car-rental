import { LightningElement, track, wire } from 'lwc';
import getFooterData from '@salesforce/apex/FooterController.getFooterData';
import getLocations from '@salesforce/apex/FooterController.getLocations';
import runningwebUrl from '@salesforce/resourceUrl/carfooter';

export default class FooterPage extends LightningElement {

    footerSections = [];
    subscriberEmail = '';
    logoUrl = runningwebUrl;

    // Map properties
    mapMarkers = [];
    @track zoomLevel = 5;
    @track center;

    get hasMarkers() {
        return this.mapMarkers && this.mapMarkers.length > 0;
    }

    @wire(getFooterData)
    wiredFooter({ data, error }) {
        if (data) {
            this.footerSections = data.map(record => {
                return {
                    id: record.Id,
                    name: record.Name,
                    logo: record.Logo__c || `<img src="${this.logoUrl}" alt="Logo" style="max-width: 100%; height: auto;" />`,
                    description: record.Describe__c,
                    footercontact: record.FooterContact__c,
                    termcondition: record.Terms_Conditions__c,
                    location: record.Location__c,
                    subscribe: record.Subscribe__c,
                    email: record.Footer_Email__c,
                    left_side: record.Left_Side_Text__c,
                    right_side: record.Right_side_Text__c,
                    items: record.About__c
                        ? record.About__c.split(';').filter(s => s.trim()).map(item => {
                            const label = item.trim();
                            let url = '';
                            const lowerLabel = label.toLowerCase();
                            const baseUrl = 'https://danocloud-d-dev-ed.develop.my.site.com/carRental/s';
                            
                            if (lowerLabel === 'home') {
                                url = baseUrl + '/';
                            } else if (lowerLabel === 'contact us') {
                                url = baseUrl + '/contact-us';
                            }else if (lowerLabel === 'about') {
                                url = baseUrl + '/about';
                            }
                            else if (lowerLabel === 'offer') {
                                url = baseUrl + '/offer';
                            }
                            else if (lowerLabel === 'careers') {
                                url = baseUrl + '/careers';
                            }
                            else if (lowerLabel === 'sign-in') {
                                url = baseUrl + '/sign-in';
                            }
                            else if (lowerLabel === 'register') {
                                url = baseUrl + '/register';
                            }
                             else
                                 {
                                url = baseUrl + '/' + lowerLabel.replace(/\s+/g, '-');
                            }
                            
                            return { label: label, url: url };
                        })
                        : []
                };
            });
        } else if (error) {
            console.error(error);
        }
    }



    @wire(getLocations)
    wiredLocations({ data, error }) {
        if (data) {
            this.mapMarkers = data.map(loc => {
                return {
                    location: {
                        City:       loc.City__c       || '',
                        Country:    loc.Country__c    || '',
                        State:      loc.State__c      || '',
                        Street:     loc.Street__c     || '',
                        PostalCode: loc.PostalCode__c || ''
                    },
                    title:       loc.title__c              || '',
                    description: loc.descriptionLocation__c || '',
                    icon:        loc.icon__c               || ''
                };
            });
            if (this.mapMarkers.length > 0 && !this.center) {
                this.center    = this.mapMarkers[0];
                this.zoomLevel = 12;
            }
        } else if (error) {
            console.error('Error fetching locations:', error);
        }
    }

    handleEmailChange(event) {
        this.subscriberEmail = event.target.value;
    }

    handleSubscribe() {
        if (this.subscriberEmail) {
            console.log('Subscribing email:', this.subscriberEmail);
            this.subscriberEmail = '';
        }
    }

    // Social media link handlers
    openFacebook() {
        window.open('https://www.facebook.com', '_blank', 'noopener,noreferrer');
    }

    openInstagram() {
        window.open('https://www.instagram.com', '_blank', 'noopener,noreferrer');
    }

    openTwitter() {
        window.open('https://www.twitter.com', '_blank', 'noopener,noreferrer');
    }

    openLinkedIn() {
        window.open('https://www.linkedin.com', '_blank', 'noopener,noreferrer');
    }
}
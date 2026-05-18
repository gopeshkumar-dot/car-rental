import { LightningElement, track } from 'lwc';
import facebook from '@salesforce/resourceUrl/facebooklogo';
import instagram from '@salesforce/resourceUrl/instagramlogo';
import linkedin from '@salesforce/resourceUrl/linkdinlogo';
import getPicklistValues
from '@salesforce/apex/ContactUsController.getPicklistValues';
import saveInquiry
from '@salesforce/apex/ContactUsController.saveInquiry';
 
export default class ContactUsPage extends LightningElement {

    zoomLevel = 15;
    @track inquiryOptions = [];
    @track contactOptions = [];
    @track isLoading = false;
    @track isSuccess = false;


    @track formData = {
        fullName: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        inquiryType: '',
        preferredContact: ''
    };

    handleChange(event){

        const field = event.target.dataset.field;

        this.formData[field] = event.target.value;
    }

    async handleSubmit() {

   if(!this.validateForm()){

        return;
    }

    this.isLoading = true;

    try {

        const result = await saveInquiry({

            fullName: this.formData.fullName,
            email: this.formData.email,
            phone: this.formData.phone,
            subject: this.formData.subject,
            message: this.formData.message,
            inquiryType: this.formData.inquiryType,
            preferredContact: this.formData.preferredContact
        });

        console.log('Apex Success:', result);

        this.isSuccess = true;

    } catch(error) {

        console.error('Apex Error:', error);

        alert(
            error?.body?.message ||
            error.message ||
            'Something went wrong'
        );

    } finally {

        this.isLoading = false;
    }
}

    handleBack(){

        this.isSuccess = false;

        this.formData = {
            fullName: '',
            email: '',
            phone: '',
            subject: '',
            message: '',
            inquiryType: '',
            preferredContact: ''
        };
    }
    connectedCallback() {

        this.loadPicklists();
    }

    async loadPicklists(){

        try {

            const result = await getPicklistValues();

            this.inquiryOptions =
                result.inquiryTypes.map(item => {

                    return {
                        label: item,
                        value: item
                    };
                });

            this.contactOptions =
                result.contactMethods.map(item => {

                    return {
                        label: item,
                        value: item
                    };
                });

        } catch(error){

            console.error(error);
        }
    }
    @track mapMarkers = [
        {
            location: {
                City: 'Bhagalpur',
                Country: 'India',
                State: 'Bihar',
                Street: '2nd Floor, Nirala Complex, near Toll Tax, Tulsinagar Colony, Bank Colony, Lodipur Khurd',
                PostalCode: '812001'
            },

            title: 'Dano Cloud Technology Pvt Ltd',

            description:
                'Software Company in Bhagalpur',

            icon: 'standard:location'
        }
    ];
    inquiryOptions = [
        { label: 'General Inquiry', value: 'general' },
        { label: 'Booking', value: 'booking' },
        { label: 'Support', value: 'support' }
    ];

    contactOptions = [
        { label: 'Phone', value: 'phone' },
        { label: 'Email', value: 'email' },
        { label: 'WhatsApp', value: 'whatsapp' }
    ];
    facebookIcon = facebook;
    instagramIcon = instagram;
    linkedinIcon = linkedin;

    validateForm(){

    let isValid = true;

    const inputFields =
        this.template.querySelectorAll(
            'lightning-input, lightning-textarea, lightning-combobox'
        );

    inputFields.forEach(field => {

        field.reportValidity();

        if(!field.checkValidity()){

            isValid = false;
        }
    });

    /* EMAIL VALIDATION */

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(
        this.formData.email &&
        !emailRegex.test(this.formData.email)
    ){

        isValid = false;

        this.showFieldError(
            'email',
            'Enter a valid email address'
        );
    }

    /* PHONE VALIDATION */

    const phoneRegex =
        /^[6-9]\d{9}$/;

    if(
        this.formData.phone &&
        !phoneRegex.test(this.formData.phone)
    ){

        isValid = false;

        this.showFieldError(
            'phone',
            'Enter a valid 10-digit phone number'
        );
    }

    /* MESSAGE LENGTH */

    if(
        this.formData.message &&
        this.formData.message.length > 500
    ){

        isValid = false;

        this.showFieldError(
            'message',
            'Message cannot exceed 500 characters'
        );
    }

    return isValid;
}
showFieldError(fieldName, message){

    const field =
        this.template.querySelector(
            `[data-field="${fieldName}"]`
        );

    if(field){

        field.setCustomValidity(message);

        field.reportValidity();
    }
}
handleChange(event){

    const field =
        event.target.dataset.field;

    this.formData[field] =
        event.target.value;

    event.target.setCustomValidity('');

    event.target.reportValidity();
}s
}
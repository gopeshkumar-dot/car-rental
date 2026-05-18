import { LightningElement ,track } from 'lwc';
import myResource1 from "@salesforce/resourceUrl/f_p1"; 
import myResource2 from "@salesforce/resourceUrl/crt1";
import myResource3 from "@salesforce/resourceUrl/crt2";
import myResource4 from "@salesforce/resourceUrl/crt3";
import myResource5 from "@salesforce/resourceUrl/crt4";
import myResource6 from "@salesforce/resourceUrl/crt5";
export default class CarRentalWelcome extends LightningElement {
    firstp1 = myResource1;
    firstp2 = myResource2;
    firstp3 = myResource3;
    firstp4 = myResource4;
    firstp5 = myResource5;
    firstp6 = myResource6;
    @track showAboutPage = false;
    
    handleReadMore() {
        this.showAboutPage = true;
    }


}
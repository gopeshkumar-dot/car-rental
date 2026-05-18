import { LightningElement, track, api } from 'lwc';

export default class Navbar extends LightningElement {
    @api logoUrl;
    
    toggleMenu() {
        const menuItems = this.template.querySelector('.menu-items');
        menuItems.classList.toggle('show');
    }

    @track aboutPage = false;
    @track offerPage = false;
    @track careersPage = false;
    @track contactPage = false;
    @track hideHomeNavBar = false;
    @track firstpage  = true;
    @track searchBar = true;
    @track Welcome = true;
    @track singup = false;
    @track login = false;
    @track signup = false;



    handleAboutPage(){
        this.aboutPage = true;
        this.offerPage = false;
        this.careersPage = false;
        this.contactPage = false;
        this.hideHomeNavBar = true;
        this.firstpage = false;
        this.searchBar = false;
        this.Welcome = false;
        this.singup = false;
        this.login = false;
        this.signup = false;

    }

    handleOfferPage(){
        this.aboutPage = false;
        this.careersPage = false;
        this.contactPage = false;
        this.offerPage = true;
        this.hideHomeNavBar = true;
        this.firstpage = false;
        this.searchBar = false;
        this.singup = false;
        this.Welcome = false;
        this.signup = false;
        this.login = false;

    }
    handleHomeNavBar(){
        this.aboutPage = false;
        this.offerPage = false;
        this.careersPage = false;
        this.contactPage = false;
        this.hideHomeNavBar = false;
        this.singup = false;
        this.firstpage = true;
        this.searchBar = true;
        this.Welcome = false;
        this.signup = false;
        this.login = false;
   
    }

    handleCareersPage(){
        this.aboutPage = false;
        this.careersPage = true;
        this.contactPage = false;
        this.firstpage = false;
        this.searchBar = false;
        this.offerPage = false;
        this.hideHomeNavBar = false;
        this.singup = false;
        this.Welcome = false;
        this.signup = false;
        this.login = false;
    }


    handleContactPage(){
        this.aboutPage = false;
        this.careersPage = false;
        this.contactPage = true;
        this.firstpage = false;
        this.searchBar = false;
        this.offerPage = false;
        this.singup = false;
        this.hideHomeNavBar = false;
        this.Welcome = false;
        this.signup = false;
        this.login = false;
    }

    handleSignUptPage(){
        this.aboutPage = false;
        this.careersPage = false;
        this.contactPage = false;
        this.firstpage = false;
        this.searchBar = false;
        this.offerPage = false;
        this.hideHomeNavBar = true;
        this.signup = true;
        this.Welcome = false;
        this.login = false;

    }

    handleLoginPage(){
        this.aboutPage = false;
        this.careersPage = false;
        this.contactPage = false;
        this.firstpage = false;
        this.searchBar = false;
        this.offerPage = false;
        this.hideHomeNavBar = true;
        this.login = true;
        this.Welcome = false;
        this.signup = false;

    }



    handSignUpPage(){
        this.signup = true;
        this.login = false;
    }

    @track isLoggedIn = false;

    handleLoginSuccess(event) {
        if (event && event.detail && event.detail.name) {
            this.userName = event.detail.name;
        } else {
            this.userName = 'Guest';
        }
        this.isLoggedIn = true;
        // Go to dashboard view (firstPage without the Welcome banner)
        this.handleHomeNavBar();
    }

    handleLogout() {
        this.isLoggedIn = false;
        // Re-enable the Welcome banner and navigate home
        this.handleHomeNavBar();
        this.Welcome = true;
    }

    handleProfilePage() {
        // Here you could navigate to the clientProfile component if you add it to navBar.html
        // For now, we can just keep them on the dashboard
        console.log('Profile page clicked');
    }
}
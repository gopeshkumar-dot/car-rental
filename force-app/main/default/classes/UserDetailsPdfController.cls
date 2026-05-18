public class UserDetailsPdfController {

    public Contact contact { get; set; }
    public String customerName { get; set; }
    public String carName { get; set; }
    public String startTime { get; set; }
    public String endTime { get; set; }
    public String Email_Id { get; set; }
    public String Phone_no { get; set; }

   public String companyName { get; set; }
    public String comEmail { get; set; }
    public String comPhone { get; set; }
    public String comStreet { get; set; }
    public String comCity { get; set; }
    public String comState { get; set; }
    public String comCountry { get; set; }

    public UserDetailsPdfController() {
        Id id = ApexPages.currentPage().getParameters().get('id');
        customerName = ApexPages.currentPage().getParameters().get('customerName');
        carName = ApexPages.currentPage().getParameters().get('carName');
        Phone_no = ApexPages.currentPage().getParameters().get('Phone_no');
        startTime = ApexPages.currentPage().getParameters().get('startTime');
        endTime = ApexPages.currentPage().getParameters().get('endTime');
	     Email_Id = ApexPages.currentPage().getParameters().get('Email_Id');
        System.debug('ID from apex class :- '+id);
        System.debug('firstName from apex class :- '+customerName);
        System.debug('lastName from apex class :- '+carName);
        System.debug('email from apex class :- '+Phone_no);
        System.debug('phone from apex class :- '+startTime);
        System.debug('gender from apex class :- '+endTime);
		System.debug('gender from apex class :- '+Email_Id);

       // logoURL = Custom_Label_Metadata__mdt.getInstance('logoURL').Label_Name__c;
        //System.debug('logoURL :- '+logoURL);

        User us = [SELECT Name , Country , Street , City , State , CompanyName , Phone , Email FROM User WHERE Id = :UserInfo.getUserId()];
        companyName = us.CompanyName;
        comEmail = us.Email;
        comPhone = us.Phone;
        comStreet = us.Street;
        comCity = us.City;
        comState = us.State;
        comCountry = us.Country;
    }
}
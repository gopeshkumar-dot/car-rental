public with sharing class ContactFormController {
    @AuraEnabled
    public static void saveContactFormData(String name, String phone, String email, String subject, String message) {
        // Creating new record of Contact_Request__c object
        Contact_Request__c newRequest = new Contact_Request__c();
        newRequest.Name = name;
        newRequest.Phone__c = phone;
        newRequest.Email__c = email;
        newRequest.Subject__c = subject;
        newRequest.Message__c = message;

        // Inserting the record into Salesforce
        insert newRequest;
    }

	
}
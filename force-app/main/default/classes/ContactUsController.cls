public with sharing class ContactUsController {
     @AuraEnabled
public static String saveInquiry(
    String fullName,
    String email,
    String phone,
    String subject,
    String message,
    String inquiryType,
    String preferredContact
){

    try {

        Contact_Request__c requestObj =
            new Contact_Request__c();

        requestObj.Name__c = fullName;
        requestObj.Email__c = email;
        requestObj.Phone__c = phone;
        requestObj.Subject__c = subject;
        requestObj.Message__c = message;
        requestObj.InquiryType__c = inquiryType;
        requestObj.Preferred_Contact_Method__c =
            preferredContact;

        requestObj.Status__c = 'New';
        requestObj.Source__c = 'Website';

        insert requestObj;

        System.debug('Inserted Record Id: ' + requestObj.Id);

        return requestObj.Id;

    } catch(Exception e){

        System.debug('ERROR: ' + e.getMessage());

        throw new AuraHandledException(
            e.getMessage()
        );
    }
}
    @AuraEnabled(cacheable=true)
public static Map<String, List<String>> getPicklistValues() {

    Map<String, List<String>> picklistMap = new Map<String, List<String>>();

    List<String> inquiryTypes = new List<String>();

    for(Schema.PicklistEntry entry :
        Contact_Request__c.InquiryType__c.getDescribe().getPicklistValues()){

        inquiryTypes.add(entry.getValue());
    }

    List<String> contactMethods = new List<String>();

    for(Schema.PicklistEntry entry :
        Contact_Request__c.Preferred_Contact_Method__c.getDescribe().getPicklistValues()){

        contactMethods.add(entry.getValue());
    }

    picklistMap.put('inquiryTypes', inquiryTypes);
    picklistMap.put('contactMethods', contactMethods);

    return picklistMap;
}
}
public without sharing class CareerController {
    @AuraEnabled
    public static void applyNow(String customerName, String phoneno,String Email_Id, string Phone_no, integer adhrcard) {
        //List<Booking__c> bkList = new List<Booking__c>();
        Career__c obj = new Career__c();
        if(customerName != null && Phone_no != null && Email_Id != null){
            
            obj.Name = customerName;
            obj.Email_Id__c = Email_Id;
            obj.Phone_number__c = Phone_no;
            obj.Adhar_Number__c = adhrcard;
            // bkList.add(obj);
            System.debug('bkList'+obj);
            insert obj;
        }
        // Generate PDF from VF page
        PageReference pdfPage = Page.UserDetailsPdf;
        pdfPage.getParameters().put('id',(String)obj.id);
        pdfPage.getParameters().put('carName',(String)obj.Name);
        pdfPage.getParameters().put('startDate', obj.Adhar_Number__c != null ? obj.Adhar_Number__c.format() : '');
        //pdfPage.getParameters().put('startDate', obj.Phone_number__c != null ? obj.Phone_number__c.format() : '');
        pdfPage.getParameters().put('Email_Id',(String)obj.Email_Id__c);
        pdfPage.setRedirect(true);
        
        Blob pdfBlob = pdfPage.getContentAsPDF();
        
        // Send email with PDF attachment
        Messaging.EmailFileAttachment attachment = new Messaging.EmailFileAttachment();
        attachment.setFileName('ContactDetails.pdf');
        attachment.setBody(pdfBlob);
        attachment.setContentType('application/pdf');
        
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new String[] { obj.Email_Id__c });
        email.setSubject('Your Details');
        email.setPlainTextBody('Please find your details attached.');
        email.setFileAttachments(new Messaging.EmailFileAttachment[] { attachment });
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
    }
}
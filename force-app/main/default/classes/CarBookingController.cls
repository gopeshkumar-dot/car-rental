public without sharing class CarBookingController {
    @AuraEnabled
    public static Id createBooking(String customerName, String carName, Datetime startTime, Datetime endTime, String Email_Id, string Phone_no) {
        if (String.isBlank(customerName) || startTime == null || endTime == null || String.isBlank(Phone_no)) {
            throw new AuraHandledException('Please provide customer name, date/time range, and phone number.');
        }
        if (endTime <= startTime) {
            throw new AuraHandledException('Drop-off date/time must be after pickup date/time.');
        }

        Booking__c obj = new Booking__c();
        obj.Name = String.isBlank(carName) ? customerName : customerName + ' - ' + carName;
        obj.Contact_No__c = Phone_no;
        obj.Start_Date__c = startTime;
        obj.End_Date__c = endTime;
        obj.Email_Id__c = Email_Id;
        insert obj;

        // Generate PDF from VF page
        PageReference pdfPage = Page.UserDetailsPdf;
        pdfPage.getParameters().put('id',(String)obj.id);
        pdfPage.getParameters().put('customerName',(String)obj.Contact_No__c);
        pdfPage.getParameters().put('carName',(String)obj.Name);
        pdfPage.getParameters().put('startDate', obj.Start_Date__c != null ? obj.Start_Date__c.format() : '');
        pdfPage.getParameters().put('endDate', obj.End_Date__c != null ? obj.End_Date__c.format() : '');
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

        return obj.Id;
    }
}
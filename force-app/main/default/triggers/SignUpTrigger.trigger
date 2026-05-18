trigger SignUpTrigger on Sign_Up__c (after insert) {
    if (Trigger.isAfter && Trigger.isInsert) {
        SignUpEmailService.sendWelcomeEmails(Trigger.new);
    }
}
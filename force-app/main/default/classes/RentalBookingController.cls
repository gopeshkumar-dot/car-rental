public without sharing class RentalBookingController {
    @AuraEnabled
    public static String createRentalBooking(
        String carName, 
        String customerName, 
        String customerEmail, 
        String customerPhone, 
        String pickupStreet, 
        String pickupCity, 
        String pickupState, 
        String pickupPin, 
        String dropoffStreet, 
        String dropoffCity, 
        String dropoffState, 
        String dropoffPin, 
        Datetime pickupTime, 
        Datetime dropoffTime, 
        Decimal totalAmount,
        String status,
        String paymentStatus
    ) {
        try {
            Rental_Booking__c booking = new Rental_Booking__c();
            
            // Standard Name field
            booking.Name = String.isBlank(carName) ? customerName : customerName + ' - ' + carName;
            
            // Custom fields
            booking.Pickup_DateTime__c = pickupTime;
            booking.Dropoff_DateTime__c = dropoffTime;
            booking.Total_Amount__c = totalAmount;
            
            // Picklist fields
            booking.Status__c = String.isNotBlank(status) ? status : 'Confirmed';
            booking.Payment_Status__c = String.isNotBlank(paymentStatus) ? paymentStatus : 'Pending';
            
            // Pickup Address compound fields
            booking.PickupPoint__Street__s = pickupStreet;
            booking.PickupPoint__City__s = pickupCity;
            booking.PickupPoint__PostalCode__s = pickupPin;
            booking.PickupPoint__CountryCode__s = 'IN';
            
            if (String.isNotBlank(pickupState)) {
                if (pickupState.equalsIgnoreCase('Bihar')) {
                    booking.PickupPoint__StateCode__s = 'BR';
                } else {
                    booking.PickupPoint__StateCode__s = pickupState;
                }
            }
            
            // Dropoff Address compound fields
            booking.Dropoping_Point__Street__s = dropoffStreet;
            booking.Dropoping_Point__City__s = dropoffCity;
            booking.Dropoping_Point__PostalCode__s = dropoffPin;
            booking.Dropoping_Point__CountryCode__s = 'IN';
            
            if (String.isNotBlank(dropoffState)) {
                if (dropoffState.equalsIgnoreCase('Bihar')) {
                    booking.Dropoping_Point__StateCode__s = 'BR';
                } else {
                    booking.Dropoping_Point__StateCode__s = dropoffState;
                }
            }
            
            insert booking;
            
            // Send receipt email to the customer
            try {
                if (String.isNotBlank(customerEmail)) {
                    sendReceiptEmail(booking, customerEmail);
                }
            } catch (Exception mailEx) {
                System.debug('Email receipt sending failed: ' + mailEx.getMessage());
            }
            
            return booking.Id;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getPicklistOptions(String objectName, String fieldName) {
        List<Map<String, String>> options = new List<Map<String, String>>();
        try {
            Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
            if (sObjectType != null) {
                Schema.DescribeFieldResult fieldResult = sObjectType.getDescribe()
                    .fields.getMap()
                    .get(fieldName)
                    .getDescribe();

                for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
                    if (entry.isActive()) {
                        Map<String, String> option = new Map<String, String>();
                        option.put('label', entry.getLabel());
                        option.put('value', entry.getValue());
                        options.add(option);
                    }
                }
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error fetching picklist options: ' + e.getMessage());
        }
        return options;
    }

    @AuraEnabled(cacheable=true)
    public static List<Car__c> getAllVehicles() {
        try {
            return [
                SELECT Id, Name, Type__c, Seats__c, Daily_Rate__c, 
                       Image_URL__c, Main_Image_URL__c, City__c, Status__c
                FROM Car__c
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    private static void sendReceiptEmail(Rental_Booking__c booking, String toEmail) {
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new String[] { toEmail });
        email.setSubject('Safar Sathi Car Reservation Confirmed! — ' + booking.Name);
        
        String body = 'Dear Customer,\n\n';
        body += 'Thank you for booking with Safar Sathi Car Rentals! Your reservation is confirmed.\n\n';
        body += 'Reservation Summary:\n';
        body += '--------------------------------------------------\n';
        body += 'Booking Ref ID: ' + booking.Id + '\n';
        body += 'Car Details: ' + booking.Name + '\n';
        body += 'Pickup Time: ' + (booking.Pickup_DateTime__c != null ? booking.Pickup_DateTime__c.format() : '') + '\n';
        body += 'Dropoff Time: ' + (booking.Dropoff_DateTime__c != null ? booking.Dropoff_DateTime__c.format() : '') + '\n';
        body += 'Total Amount Paid/Due: INR ' + booking.Total_Amount__c + '\n';
        body += 'Booking Status: ' + booking.Status__c + '\n';
        body += 'Payment Status: ' + booking.Payment_Status__c + '\n';
        body += '--------------------------------------------------\n\n';
        body += 'Thank you again for choosing us. Have a safe and happy journey!\n\n';
        body += 'Best Regards,\n';
        body += 'The Safar Sathi Team';
        
        email.setPlainTextBody(body);
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
    }
}
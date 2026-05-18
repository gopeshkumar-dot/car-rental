public without sharing class VehicleController {
    @AuraEnabled(cacheable=true)
    public static List<Car__c> getAllVehicles() {
        try {
            return [
                SELECT Id, Name, Type__c, Seats__c, Daily_Rate__c, 
                       Image_URL__c, Main_Image_URL__c,City__c, Status__c
                FROM Car__c
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

   @AuraEnabled(cacheable=true)
public static List<Car__c> searchVehicles(String searchTerm) {

    if (String.isBlank(searchTerm)) {
        return getAllVehicles();
    }

    String query = '%' + searchTerm + '%';

    try {
        return [
            SELECT Id, Name, Car_Type__c, Seats__c, Daily_Rate__c,
                   Image_URL__c, Main_Image_URL__c, City__c, Status__c
            FROM Car__c
            WHERE Name LIKE :query
               OR Car_Type__c LIKE :query
               OR City__c LIKE :query
        ];
    } catch (Exception e) {
        throw new AuraHandledException(e.getMessage());
    }
}

    // @AuraEnabled
    // public static String createRentalBooking(String vehicleId, String customerId, String customerName, String customerEmail, String customerPhone, String pickupLoc, String dropoffLoc, String pickupAddress, String pickupState, String dropoffAddress, String dropoffState, Datetime pickupTime, Datetime dropoffTime, Decimal totalAmount) {
    //     try {
    //         // If no customerId, try to find by email or create new
    //         if (String.isBlank(customerId) && String.isNotBlank(customerEmail)) {
    //             List<Sign_Up__c> existing = [SELECT Id FROM Sign_Up__c WHERE Email__c = :customerEmail LIMIT 1];
    //             if (!existing.isEmpty()) {
    //                 customerId = existing[0].Id;
    //             } else {
    //                 Sign_Up__c newUser = new Sign_Up__c(
    //                     Name = customerName,
    //                     Email__c = customerEmail,
    //                     Phone__c = customerPhone
    //                 );
    //                 insert newUser;
    //                 customerId = newUser.Id;
    //             }
    //         }

    //         Id pickupId = getOrCreateLocation(pickupLoc, pickupAddress, pickupState);
    //         Id dropoffId = String.isNotBlank(dropoffLoc) ? getOrCreateLocation(dropoffLoc, dropoffAddress, dropoffState) : null;

    //         Rental_Booking__c booking = new Rental_Booking__c(
    //             Vehicle__c = vehicleId,
    //             Customer__c = customerId,
    //             Pickup_Location__c = pickupId,
    //             Dropoff_Location__c = dropoffId,
    //             Pickup_DateTime__c = pickupTime,
    //             Dropoff_DateTime__c = dropoffTime,
    //             Total_Amount__c = totalAmount,
    //             Status__c = 'Confirmed',
    //             Payment_Status__c = 'Pending'
    //         );

    //         insert booking;

    //         // Create Availability Calendar records
    //         Date startDate = pickupTime.date();
    //         Date endDate = dropoffTime.date();
    //         List<Availability_Calendar__c> calendarRecords = new List<Availability_Calendar__c>();
    //         for (Date d = startDate; d <= endDate; d = d.addDays(1)) {
    //             calendarRecords.add(new Availability_Calendar__c(
    //                 Vehicle__c = vehicleId,
    //                 Date__c = d,
    //                 Is_Booked__c = true,
    //                 Booking__c = booking.Id
    //             ));
    //         }
    //         insert calendarRecords;
            
    //         return booking.Id;
    //     } catch (Exception e) {
    //         throw new AuraHandledException(e.getMessage());
    //     }
    // }


    // private static Id getOrCreateLocation(String locName, String address, String state) {
    //     if (String.isBlank(locName)) return null;
        
    //     List<Location__c> locs = [SELECT Id FROM Location__c WHERE Name = :locName LIMIT 1];
    //     if (!locs.isEmpty()) {
    //         return locs[0].Id;
    //     }
        
    //     Location__c newLoc = new Location__c(
    //         Name = locName,
    //         City__c = locName,
    //         Address__c = String.isNotBlank(address) ? address : locName,
    //         State__c = String.isNotBlank(state) ? state : 'Not Specified'
    //     );
    //     insert newLoc;
    //     return newLoc.Id;
    // }
    // @AuraEnabled(cacheable=true)
    // public static Sign_Up__c getLoggedInUser(String email) {
    //     try {
    //         return [
    //             SELECT Id, Name, Email__c, Phone__c
    //             FROM Sign_Up__c
    //             WHERE Email__c = :email
    //             LIMIT 1
    //         ];
    //     } catch (Exception e) {
    //         return null;
    //     }
    // }

    // @AuraEnabled(cacheable=true)
    // public static List<Location__c> getLocations() {
    //     return [SELECT Id, Name, City__c FROM Location__c];
    // }

    // @AuraEnabled(cacheable=true)
    // public static List<Sign_Up__c> searchCustomers(String searchTerm) {
    //     if (String.isBlank(searchTerm)) return new List<Sign_Up__c>();
    //     String query = '%' + searchTerm + '%';
    //     return [
    //         SELECT Id, Name, Email__c, Phone__c 
    //         FROM Sign_Up__c 
    //         WHERE Name LIKE :query OR Email__c LIKE :query 
    //         LIMIT 10
    //     ];
    // }
    // @AuraEnabled(cacheable=true)
    // public static List<Map<String, String>> getPicklistOptions(String fieldName) {
    //     List<Map<String, String>> options = new List<Map<String, String>>();
    //     try {
    //         Schema.DescribeFieldResult fieldResult = Schema.SObjectType.Car__c
    //             .fields.getMap()
    //             .get(fieldName)
    //             .getDescribe();

    //         for (Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
    //             if (entry.isActive()) {
    //                 Map<String, String> option = new Map<String, String>();
    //                 option.put('label', entry.getLabel());
    //                 option.put('value', entry.getValue());
    //                 options.add(option);
    //             }
    //         }
    //     } catch (Exception e) {
    //         throw new AuraHandledException('Error fetching picklist for field: ' + fieldName + ' — ' + e.getMessage());
    //     }
    //     return options;
    // }
}
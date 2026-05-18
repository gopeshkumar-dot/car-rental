public without sharing class CarSearchController {
    @AuraEnabled(cacheable=true)
    public static List<Car__c> searchCars(String searchTerm) {
        String searchQuery = '%' + searchTerm + '%';
        return [SELECT Id, Name,Type__c, Color__c,Status__c
                FROM Car__c 
                WHERE Type__c LIKE :searchQuery 
                OR Name LIKE :searchQuery
                OR Status__c LIKE :searchQuery 
                OR Rating__c LIKE :searchQuery 
                OR Model__c LIKE :searchQuery 
                OR Color__c LIKE :searchQuery];
    }
    
    @AuraEnabled(cacheable=true)
    public static Car__c getCarDetails(Id carId) {
        return [SELECT Id, Name,Type__c, Color__c,Status__c,Model__c,Rating__c
                FROM Car__c 
                WHERE Id = :carId 
                LIMIT 1];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getContentVersionsAsBase64(String carIds) {
        System.debug(carIds);
        List<Map<String, String>> contentVersionList = new List<Map<String, String>>();

        List<Car__c> carList = new List<Car__c>();
        carList = [SELECT Id, Name,Type__c, Color__c,Status__c,Model__c,Rating__c FROM Car__c];
        Set<Id> carIdSet = new Set<Id>();
        
        for(Car__c van : carList){
             carIdSet.add(van.Id);
        }
        
        // Query for ContentVersions linked to the record
        List<ContentDocumentLink> contentDocumentLinks = [
            SELECT ContentDocumentId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId IN :carIdSet LIMIT 1
        ];
        
        for (ContentDocumentLink cdl : contentDocumentLinks) {
            ContentVersion contentVersion = [
                SELECT Id, Title, VersionData , FileExtension
                FROM ContentVersion 
                WHERE ContentDocumentId = :cdl.ContentDocumentId 
                ORDER BY VersionNumber DESC 
                LIMIT 1
            ];
            
            String base64Data = EncodingUtil.base64Encode(contentVersion.VersionData);
            Map<String, String> contentVersionMap = new Map<String, String>();
            contentVersionMap.put('Id', contentVersion.Id);
            contentVersionMap.put('Title', contentVersion.Title);
            contentVersionMap.put('FileExtension', contentVersion.FileExtension);
            contentVersionMap.put('Base64Data', base64Data);            
            contentVersionList.add(contentVersionMap);
        }
        
        return contentVersionList;
    }

    //Add method getSearchSuggestions by bhaskar 

   /* @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getSearchSuggestions(String searchTerm) {
        List<Map<String, String>> suggestions = new List<Map<String, String>>();
        if (String.isBlank(searchTerm)) {
            return suggestions;
        }
        
        String query = '%' + searchTerm + '%';
        
        // Search Locations
        try {
            List<SObject> locs = Database.query('SELECT Id, Name, City__c FROM Location__c WHERE Name LIKE :query OR City__c LIKE :query LIMIT 5');
            for (SObject loc : locs) {
                Map<String, String> sug = new Map<String, String>();
                sug.put('id', (String)loc.get('Id'));
                sug.put('text', (String)loc.get('Name'));
                sug.put('subtitle', 'Location');
                suggestions.add(sug);
            }
        } catch (Exception e) {
            System.debug('Location__c object not found or error: ' + e.getMessage());
        }
        // Search Cars
        try {
            List<Car__c> cars = [SELECT Id, Name, City__c FROM Car__c WHERE Name LIKE :query OR Car_Type__c LIKE :query OR City__c LIKE :query LIMIT 25];
            for (Car__c car : cars) {
                Map<String, String> sug = new Map<String, String>();
                sug.put('id', car.Id);
                sug.put('text', car.Name);
                sug.put('subtitle', String.isNotBlank(car.Type__c) ? car.Type__c : 'Car');
                suggestions.add(sug);
            }
        } catch (Exception e) {
             System.debug('Car__c search error: ' + e.getMessage());
        }
        
        return suggestions;
    }
*/

    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getSearchSuggestions(String searchTerm) {

    List<Map<String, String>> suggestions = new List<Map<String, String>>();

    if (String.isBlank(searchTerm)) {
        return suggestions;
    }

    String query = '%' + searchTerm.trim() + '%';

    Set<String> uniqueValues = new Set<String>();

    List<Car__c> cars = [
        SELECT Id, Name, Type__c, City__c
        FROM Car__c
        WHERE Name LIKE :query
        OR Type__c LIKE :query
        OR City__c LIKE :query
        LIMIT 10
    ];

    for (Car__c car : cars) {

        // Car Name Suggestion
        if (String.isNotBlank(car.Name) && !uniqueValues.contains(car.Name)) {

            suggestions.add(new Map<String, String>{
                'id' => car.Id,
                'text' => car.Name,
                'subtitle' => 'Car'
            });

            uniqueValues.add(car.Name);
        }

        // City Suggestion
        if (String.isNotBlank(car.City__c) && !uniqueValues.contains(car.City__c)) {

            suggestions.add(new Map<String, String>{
                'id' => car.Id + '_city',
                'text' => car.City__c,
                'subtitle' => 'City'
            });

            uniqueValues.add(car.City__c);
        }

        // Car Type Suggestion
        if (String.isNotBlank(car.Type__c) && !uniqueValues.contains(car.Type__c)) {

            suggestions.add(new Map<String, String>{
                'id' => car.Id + '_type',
                'text' => car.Type__c,
                'subtitle' => 'Type'
            });

            uniqueValues.add(car.Type__c);
        }
    }

    return suggestions;
}

    //*************************** Add method getCarDetails************************* 

    public class CarWrapper {
        @AuraEnabled public Car__c carRecord;
        @AuraEnabled public String imageUrl;
        @AuraEnabled public Decimal price;
        @AuraEnabled public String location;
    }

    // @AuraEnabled(cacheable=true)
    // public static List<CarWrapper> getAllCarsWithDetails() {
    //     List<CarWrapper> result = new List<CarWrapper>();
    //     Map<String, Schema.SObjectField> carFieldMap = Schema.SObjectType.Car__c.fields.getMap();
    //     Boolean hasLocationField = carFieldMap.containsKey('Location__c');
    //     Boolean hasCityField = carFieldMap.containsKey('City__c');
    //     String locationFieldApiName = hasLocationField ? 'Location__c' : (hasCityField ? 'City__c' : null);

    //     String soql = 'SELECT Id, Name, Type__c, Color__c, Status__c, Model__c, Rating__c, Seat__c';
    //     if (locationFieldApiName != null) {
    //         soql += ', ' + locationFieldApiName;
    //     }
    //     soql += ' FROM Car__c';
    //     List<SObject> carRecords = Database.query(soql);

    //     List<Car__c> cars = new List<Car__c>();
    //     for (SObject rawCar : carRecords) {
    //         cars.add((Car__c)rawCar);
    //     }
        
    //     Set<Id> carIds = new Set<Id>();
    //     for (Car__c car : cars) {
    //         carIds.add(car.Id);
    //     }
        
    //     Map<Id, Id> carToDocId = new Map<Id, Id>();
    //     for (ContentDocumentLink cdl : [SELECT LinkedEntityId, ContentDocument.LatestPublishedVersionId FROM ContentDocumentLink WHERE LinkedEntityId IN :carIds]) {
    //         if(!carToDocId.containsKey(cdl.LinkedEntityId)) {
    //             carToDocId.put(cdl.LinkedEntityId, cdl.ContentDocument.LatestPublishedVersionId);
    //         }
    //     }
        
    //     for (Car__c car : cars) {
    //         CarWrapper wrapper = new CarWrapper();
    //         wrapper.carRecord = car;
    //         wrapper.imageUrl = carToDocId.containsKey(car.Id) ? '/sfc/servlet.shepherd/version/download/' + carToDocId.get(car.Id) : 'https://via.placeholder.com/400x200?text=No+Image';
    //         Decimal seatCount = (car.Seat__c == null) ? 5.0 : Decimal.valueOf(car.Seat__c);
    //         Decimal seatBased = seatCount * 4;
    //         Decimal typePremium = 0;
    //         if (car.Type__c != null) {
    //             String normalizedType = car.Type__c.toLowerCase();
    //             if (normalizedType.contains('suv')) {
    //                 typePremium = 18;
    //             } else if (normalizedType.contains('luxury')) {
    //                 typePremium = 30;
    //             } else if (normalizedType.contains('sedan')) {
    //                 typePremium = 10;
    //             }
    //         }
    //         // Deterministic dynamic pricing derived from car attributes.
    //         wrapper.price = 40 + seatBased + typePremium;
    //         String resolvedLocation = (locationFieldApiName == null) ? null : (String)car.get(locationFieldApiName);
    //         wrapper.location = String.isBlank(resolvedLocation) ? 'Bhagalpur' : resolvedLocation;
    //         result.add(wrapper);
    //     }
    //     return result;
    // }
    

}
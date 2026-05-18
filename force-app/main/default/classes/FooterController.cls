public without sharing class FooterController {
    @AuraEnabled(cacheable=true)
    public static List<Footer__c> getFooterData() {
        try {
            return [SELECT Id, Name, About__c, Describe__c,Site_Name__c,Terms_Conditions__c,Logo__c,Subscribe__c,FooterContact__c,Right_side_Text__c,Left_Side_Text__c,Location__c,Footer_Email__c FROM Footer__c];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
     @AuraEnabled(cacheable=true)
    public static List<Footer__c> getLocations() {
        return [SELECT Id,Street__c,title__c,State__c,PostalCode__c,Name,icon__c,descriptionLocation__c,Country__c ,City__c FROM Footer__c];
    }

    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getSectionPicklistValues() {
        List<Map<String, String>> options = new List<Map<String, String>>();
        try {
            Schema.DescribeFieldResult fieldResult = Footer__c.About__c.getDescribe();
            for(Schema.PicklistEntry entry : fieldResult.getPicklistValues()) {
                Map<String, String> option = new Map<String, String>();
                option.put('label', entry.getLabel());
                option.put('value', entry.getValue());
                options.add(option);
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        return options;
    }
}
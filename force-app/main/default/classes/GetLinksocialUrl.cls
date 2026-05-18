public without sharing class GetLinksocialUrl {
    @AuraEnabled(cacheable=true)
    public static Map<String, String> fetchSocialUrls() {
        Map<String, String> urlMap = new Map<String, String>();
        List<social_media_url__mdt> customSettings = [SELECT Label, url__c FROM social_media_url__mdt];
        
        for (social_media_url__mdt setting : customSettings) {
            if (setting.Label == 'Facebook' || setting.Label == 'faccebook') {
                urlMap.put('Facebook', setting.url__c);
            } else if (setting.Label == 'Instagram') {
                urlMap.put('Instagram', setting.url__c);
            } else if (setting.Label == 'LinkedIn') {
                urlMap.put('LinkedIn', setting.url__c);
            } else if (setting.Label == 'CompanyUrl') {
                urlMap.put('CompanyUrl', setting.url__c);
            }
        }
        return urlMap;
    }
}
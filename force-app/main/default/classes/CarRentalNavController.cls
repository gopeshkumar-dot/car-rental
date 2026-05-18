public without sharing class CarRentalNavController {

    public class NavTabWrapper {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String path;
        @AuraEnabled public Decimal displayOrder;
        @AuraEnabled public String tabPosition;
        @AuraEnabled public List<NavTabWrapper> children;

        public NavTabWrapper() {
            children = new List<NavTabWrapper>();
            tabPosition = 'Left';
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<NavTabWrapper> getNavTabs() {

        List<NavTabWrapper> result = new List<NavTabWrapper>();

        List<Community_Site_Item__c> items = [
            SELECT Id,
                   Name,
                   Parent_Item__c,
                   Type__c,
                   Display_Order__c,
                   Tab_Position__c,
                   Page_Url__c
            FROM Community_Site_Item__c
            ORDER BY Display_Order__c ASC
        ];

        Map<Id, NavTabWrapper> parentMap = new Map<Id, NavTabWrapper>();

        for (Community_Site_Item__c item : items) {

            if (item.Parent_Item__c == null) {

                NavTabWrapper tab = new NavTabWrapper();

                tab.id = item.Id;
                tab.name = item.Name;
                tab.path = String.isNotBlank(item.Page_Url__c)
                    ? item.Page_Url__c
                    : '/' + item.Name.toLowerCase().replace(' ','-');

                tab.displayOrder = item.Display_Order__c;
                tab.tabPosition = item.Tab_Position__c;

                parentMap.put(item.Id, tab);

                result.add(tab);
            }
        }

        for (Community_Site_Item__c item : items) {

            if (item.Parent_Item__c != null &&
                parentMap.containsKey(item.Parent_Item__c)) {

                NavTabWrapper child = new NavTabWrapper();

                child.id = item.Id;
                child.name = item.Name;

                child.path = String.isNotBlank(item.Page_Url__c)
                    ? item.Page_Url__c
                    : '/' + item.Name.toLowerCase().replace(' ','-');

                parentMap.get(item.Parent_Item__c)
                    .children
                    .add(child);
            }
        }

        return result;
    }
}
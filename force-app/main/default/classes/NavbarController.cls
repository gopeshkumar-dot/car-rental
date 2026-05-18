/**
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 * Class Name      : NavBarController
 * Author          : <YourName>
 * Created Date    : May 8, 2026
 * Last Modified By: <YourName>
 * Last Modified On: May 8, 2026
 * Description     : This class implements for......
 *  
 * Change History  :
 *  Date          │   Author     │   Change
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 *  May 8, 2026  │ <YourName>   │ Initial version
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 */

public with sharing class NavbarController {

    @AuraEnabled(cacheable=true)
    public static List<community_site_item__c> getNavbarItems() {

        return [
            SELECT
                Id,
                Name,
                Page_Url__c,
                Display_Order__c,
                Tab_Position__c,
                Type__c,
                Parent_Item__c
            FROM community_site_item__c
            WHERE Tab_Position__c = 'Header'
            ORDER BY Display_Order__c ASC
        ];
    }
}
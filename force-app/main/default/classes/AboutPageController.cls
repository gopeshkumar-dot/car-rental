public without sharing class AboutPageController {

    /* =========================================
       ABOUT PAGE MAIN CONTENT
    ========================================= */

    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getAboutPageData() {

        Map<String, Object> result = new Map<String, Object>();

        try {

            About_Page_Content__c pageData = [

                SELECT

                    /* HERO */

                    Hero_Badge__c,
                    Hero_Title_Line_1__c,
                    Hero_Title_Highlight__c,
                    Hero_Title_Line_2__c,
                    Hero_Description__c,
                    Hero_Background_Image__c,
                    Hero_Car_Image__c,

                    /* COMPANY */

                    Company_Label__c,
                    Company_Title__c,
                    Company_Desc_1__c,
                    Company_Desc_2__c,
                    Team_Image_URL__c,
                    Experience_Years__c,
                    Experience_Label__c,
                    CTA_Button_Text__c,

                    /* ASPIRATION */

                    Aspiration_Label__c,
                    Aspiration_Title__c,
                    Aspiration_Description__c,

                    /* SERVICES */

                    Service_Label__c,
                    Service_Title__c,
                    Service_CTA_Title__c,
                    Service_CTA_Desc__c,
                    Service_CTA_Button__c,
                    Service_CTA_Car_Image__c,

                    /* STATS */

                    Fleet_Count__c,
                    Fleet_Label__c,

                    Customer_Count__c,
                    Customer_Label__c,

                    Experience_Count__c,
                    Experience_Stat_Label__c,

                    Support_Text__c,
                    Support_Label__c

                FROM About_Page_Content__c

                LIMIT 1
            ];

            result.put('pageData', pageData);

        }
        catch (Exception e) {

            System.debug(
                'Error fetching About Page Data: ' +
                e.getMessage()
            );
        }

        return result;
    }

    /* =========================================
       ASPIRATION FEATURES
    ========================================= */

    @AuraEnabled(cacheable=true)
    public static List<About_Features__c> getFeatures() {

        return [

            SELECT
                Id,
                Title__c,
                Vision_Description__c,
                Full_Content__c,
                Icon_Name__c,
                Display_Order__c

            FROM About_Features__c

            WHERE Active__c = true

            ORDER BY Display_Order__c ASC
        ];
    }

    /* =========================================
       SERVICES
    ========================================= */

    @AuraEnabled(cacheable=true)
    public static List<About_Service__c> getServices() {

        return [

            SELECT
                Id,
                Service_Name__c,
                Service_Description__c,
                Icon_Name__c,
                Display_Order__c

            FROM About_Service__c

            WHERE Active__c = true

            ORDER BY Display_Order__c ASC
        ];
    }
}
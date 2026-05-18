public without sharing class HeaderControllerTestHelper {
    public static String getOtp(String email) {
        try {
            List<Sign_Up__c> users = [
                SELECT Id, Password_Reset_OTP__c 
                FROM Sign_Up__c 
                WHERE Email__c = :email 
                LIMIT 1
            ];
            if (!users.isEmpty()) {
                return users[0].Password_Reset_OTP__c;
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
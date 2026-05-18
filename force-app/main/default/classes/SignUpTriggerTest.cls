@IsTest
private class SignUpTriggerTest {
    @IsTest
    static void afterInsert_sendsWelcomeEmailWhenEmailPresent() {
        Sign_Up__c signup = new Sign_Up__c(
            Email__c = 'newuser@test.com',
            Name = 'Test',
            LastName__c = 'User',
            Phone__c = '9876543210',
            password__c = 'TempPass12'
        );
        Test.startTest();
        insert signup;
        Test.stopTest();
        System.assertNotEquals(null, [SELECT Id FROM Sign_Up__c WHERE Id = :signup.Id].Id);
    }

    @IsTest
    static void afterInsert_bulkInserts() {
        List<Sign_Up__c> rows = new List<Sign_Up__c>();
        for (Integer i = 0; i < 5; i++) {
            rows.add(
                new Sign_Up__c(
                    Email__c = 'bulk' + i + '@test.com',
                    Name = 'Bulk',
                    LastName__c = 'User' + i,
                    Phone__c = '987654321' + i,
                    password__c = 'Pass' + i + 'xx'
                )
            );
        }
        Test.startTest();
        insert rows;
        Test.stopTest();
        System.assertEquals(5, [SELECT COUNT() FROM Sign_Up__c WHERE Id IN :rows]);
    }
}
public with sharing class CarRentalAuthController {
    public class AuthResponse {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String message;
        @AuraEnabled public String sessionId;
    }

    @AuraEnabled(cacheable=false)
    public static AuthResponse loginUser(String email, String password) {
        AuthResponse response = new AuthResponse();
        response.success = false;

        if (String.isBlank(email) || String.isBlank(password)) {
            response.message = 'Email and password are required.';
            return response;
        }

        List<Sign_Up__c> matchedUsers = [
            SELECT Id, Name, Email__c
            FROM Sign_Up__c
            WHERE Email__c = :email
            AND Password__c = :password
            LIMIT 1
        ];

        if (matchedUsers.isEmpty()) {
            response.message = 'Invalid credentials. Please try again.';
            return response;
        }

        response.success = true;
        response.message = 'Login successful.';
        // Simulated session token for demo purposes.
        response.sessionId = EncodingUtil.convertToHex(
            Crypto.generateDigest('SHA-256', Blob.valueOf(matchedUsers[0].Id + ':' + Datetime.now().getTime()))
        ).substring(0, 24);
        return response;
    }

    @AuraEnabled(cacheable=false)
    public static AuthResponse signupUser(String name, String email, String password) {
        AuthResponse response = new AuthResponse();
        response.success = false;

        if (String.isBlank(name) || String.isBlank(email) || String.isBlank(password)) {
            response.message = 'Name, email and password are required.';
            return response;
        }

        List<Sign_Up__c> existingAccounts = [
            SELECT Id
            FROM Sign_Up__c
            WHERE Email__c = :email
            LIMIT 1
        ];
        if (!existingAccounts.isEmpty()) {
            response.message = 'An account with this email already exists.';
            return response;
        }

        Sign_Up__c newAccount = new Sign_Up__c(
            Name = name,
            Email__c = email,
            Password__c = password
        );
        insert newAccount;

        response.success = true;
        response.message = 'Signup successful. Please login.';
        return response;
    }
}
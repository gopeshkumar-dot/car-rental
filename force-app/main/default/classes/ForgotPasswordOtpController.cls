public with sharing class ForgotPasswordOtpController {
    private static final String OTP_FIELD = 'Password_Reset_OTP__c';
    private static final String OTP_EXPIRY_FIELD = 'OTP_Expiry__c';

    @AuraEnabled
    public static String requestOtp(String email) {
        if (String.isBlank(email)) {
            throw new AuraHandledException('Email is required.');
        }
        ensureOtpFieldsExist();

        List<Sign_Up__c> users = [
            SELECT Id, Name, LastName__c, Email__c
            FROM Sign_Up__c
            WHERE Email__c = :email
            LIMIT 1
        ];
        if (users.isEmpty()) {
            throw new AuraHandledException('Account not found for this email.');
        }

        String otp = generateOtp();
        Datetime expiry = Datetime.now().addMinutes(SignUpEmailService.getOtpValidMinutes());
        Sign_Up__c signup = users[0];
        signup.put(OTP_FIELD, otp);
        signup.put(OTP_EXPIRY_FIELD, expiry);
        update signup;

        SignUpEmailService.sendForgotPasswordOtp(signup, otp);
        return 'OTP_SENT';
    }

    @AuraEnabled
    public static String verifyOtpAndResetPassword(String email, String otpCode, String newPassword) {
        if (String.isBlank(email) || String.isBlank(otpCode) || String.isBlank(newPassword)) {
            throw new AuraHandledException('Email, OTP and new password are required.');
        }
        ensureOtpFieldsExist();

        List<Sign_Up__c> users = [
            SELECT Id, Password__c
            FROM Sign_Up__c
            WHERE Email__c = :email
            LIMIT 1
        ];
        if (users.isEmpty()) {
            throw new AuraHandledException('Account not found for this email.');
        }

        Sign_Up__c signup = users[0];
        String storedOtp = (String)signup.get(OTP_FIELD);
        Datetime expiry = (Datetime)signup.get(OTP_EXPIRY_FIELD);

        if (String.isBlank(storedOtp) || expiry == null || Datetime.now() > expiry) {
            throw new AuraHandledException('OTP expired. Please request a new OTP.');
        }
        if (storedOtp != otpCode) {
            throw new AuraHandledException('Invalid OTP.');
        }

        signup.Password__c = newPassword;
        signup.put(OTP_FIELD, null);
        signup.put(OTP_EXPIRY_FIELD, null);
        update signup;
        return 'PASSWORD_RESET_SUCCESS';
    }

    private static void ensureOtpFieldsExist() {
        Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.Sign_Up__c.fields.getMap();
        if (!fieldMap.containsKey(OTP_FIELD) || !fieldMap.containsKey(OTP_EXPIRY_FIELD)) {
            throw new AuraHandledException('Missing fields on Sign_Up__c: Password_Reset_OTP__c and OTP_Expiry__c.');
        }
    }

    private static String generateOtp() {
        Integer value = Math.mod(Math.abs(Crypto.getRandomInteger()), 900000) + 100000;
        return String.valueOf(value);
    }
}
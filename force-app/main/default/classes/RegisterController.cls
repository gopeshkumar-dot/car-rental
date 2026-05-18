public without sharing class RegisterController {

    public String name {get; set;}
    public String email {get; set;}
    public String phone {get; set;}
    public String password {get; set;}

    // ✅ Existing Visualforce Method
    public PageReference registerUser() {

        try {
            // Passing default 'Client' role for legacy VF registrations
            User u = createUser(name, email, '', password, 'Client');

            sendWelcomeEmail(u.Id);

            ApexPages.addMessage(new ApexPages.Message(
                ApexPages.Severity.CONFIRM,
                'Registration successful! Welcome email sent.'
            ));

        } catch (Exception e) {

            ApexPages.addMessage(new ApexPages.Message(
                ApexPages.Severity.ERROR,
                'Error: ' + e.getMessage()
            ));
        }

        return null;
    }

    // ✅ NEW METHOD FOR LWC (no change to logic)
    @AuraEnabled
    public static String registerUserLWC(String name, String email, String password, String role, String recaptchaResponse) {

        try {
            // 🔹 RECAPTCHA SERVER-SIDE VALIDATION (Temporarily Disabled)
            /*
            if (String.isNotBlank(recaptchaResponse)) {
                Http http = new Http();
                HttpRequest req = new HttpRequest();
                req.setEndpoint('https://www.google.com/recaptcha/api/siteverify');
                req.setMethod('POST');
                req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
                
                // 🔹 GOOGLE SECRET KEY 🔹
                String body = 'secret=6Lc91ZUsAAAAAH5ZzK_LBlsmf8UFnWMTEiXIEGNG&response=' + recaptchaResponse;
                req.setBody(body);
                
                HttpResponse res = http.send(req);
                if (res.getStatusCode() == 200) {
                    Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                    if (!(Boolean)result.get('success')) {
                        throw new AuraHandledException('Google reCAPTCHA failed validation. Try again.');
                    }
                } else {
                    throw new AuraHandledException('Failed to connect to Google reCAPTCHA server.');
                }
            } else {
                throw new AuraHandledException('Please complete the reCAPTCHA.');
            }
            */

            User u = createUser(name, email, '', password, role);
            // Optionally store role if there is a custom field for it mappings, etc.
            // u.Role__c = role;
            // update u;

            sendWelcomeEmail(u.Id);

            return 'Success';

        } catch (Exception e) {
            AuraHandledException ex = new AuraHandledException(e.getMessage());
            ex.setMessage(e.getMessage());
            throw ex;
        }
    }

    @AuraEnabled
    public static String loginUserLWC(String username, String password) {
        try {
            PageReference pageRef = Site.login(username, password, '/s/');
            if (pageRef != null) {
                return pageRef.getUrl();
            }
            throw new AuraHandledException('Invalid Login Credentials');
        } catch (Exception e) {
            AuraHandledException ex = new AuraHandledException(e.getMessage());
            ex.setMessage(e.getMessage());
            throw ex;
        }
    }

    @AuraEnabled
    public static String forgotPassword(String username) {
        try {
            // UI/UX Improvement: allow them to reset via Email or actual Username
            List<User> users = [SELECT Username FROM User WHERE (Username = :username OR Email = :username) AND IsActive = true];
            
            String actualUsername = username;

            if (users.isEmpty()) {
                // Return success anyway to prevent username enumeration, or throw error depending on security preference.
                // Standard SF UX is to pretend it worked. But since they want UI/UX validation, let's just use the inputted name.
            } else if (users.size() == 1) {
                actualUsername = users[0].Username;
            } else {
                // If multiple users share the same email, we must require the exact username
                Boolean exactUsernameFound = false;
                for(User u : users) {
                    if (u.Username == username) {
                        actualUsername = u.Username;
                        exactUsernameFound = true;
                        break;
                    }
                }
                if (!exactUsernameFound) {
                    throw new AuraHandledException('Multiple accounts linked to this email. Please enter your exact User ID.');
                }
            }

            Boolean success = Site.forgotPassword(actualUsername);
            if (success) {
                return 'Success';
            } else {
                throw new AuraHandledException('Error resetting password. Please check your username or network settings.');
            }
        } catch (Exception e) {
            AuraHandledException ex = new AuraHandledException(e.getMessage());
            ex.setMessage(e.getMessage());
            throw ex;
        }
    }

    // 🔹 PORTAL USER CREATION LOGIC
    private static User createUser(String name, String email, String phone, String password, String role) {

        // Enforce a default email if missing as Salesforce needs an email
        if (String.isBlank(email) && String.isNotBlank(phone)) {
            email = phone + '@danocloudtechnology.com';
        }
        
        // Bypassing Duplicate Rules
        Database.DMLOptions dml = new Database.DMLOptions();
        dml.DuplicateRuleHeader.allowSave = true;
        dml.DuplicateRuleHeader.runAsCurrentUser = true;

        // Fetch Individual Account Record Type
        List<RecordType> accRts = [SELECT Id FROM RecordType WHERE SobjectType = 'Account' AND Name = 'Individual' LIMIT 1];

        // 1. Create Account
        Account acc = new Account(Name = name + ' Account');
        if (!accRts.isEmpty()) {
           // acc.RecordTypeId = accRts[0].Id;
        }
        Database.insert(acc, dml);
        
        // Determine Contact Record Type based on Role
        String rtName = role;
        if (role == 'Owner') {
            rtName = 'Property Owner';
        }
        
        List<RecordType> rts = [SELECT Id FROM RecordType WHERE SobjectType = 'Contact' AND Name = :rtName LIMIT 1];
        
        // 2. Create Contact
        Contact con = new Contact(LastName = name, Email = email, Phone = phone, AccountId = acc.Id);
        if (!rts.isEmpty()) {
           // con.RecordTypeId = rts[0].Id;
        }
        Database.insert(con, dml);

        // 3. Find Community Profile (Targeting specific custom DC Profile first to avoid license limit on standard profiles)
        List<Profile> communityProfiles = [SELECT Id FROM Profile WHERE Name = 'DC : Customer Community Login User' LIMIT 1];
        Id profileId;
        if (!communityProfiles.isEmpty()) {
            profileId = communityProfiles[0].Id;
        } else {
            // Fallback to standard
            profileId = [SELECT Id FROM Profile WHERE Name = 'Customer Community Login User' LIMIT 1].Id;
        }

        // 4. Create User
        User u = new User();
        u.Username = email;
        u.Email = email;
        u.LastName = name;
        u.Alias = name.length() > 5 ? name.substring(0,5) : name;
        u.CommunityNickname = email.substringBefore('@') + String.valueOf(Crypto.getRandomInteger()).substring(0,4);
        u.MobilePhone = phone;
        u.TimeZoneSidKey = 'Asia/Kolkata';
        u.LocaleSidKey = 'en_US';
        u.EmailEncodingKey = 'UTF-8';
        u.LanguageLocaleKey = 'en_US';
        u.ProfileId = profileId;
        u.ContactId = con.Id; // All community/portal users must have a ContactId
        u.Title = role;

        insert u;

        // 5. Set Password
        if (password != null && password != '') {
            System.setPassword(u.Id, password);
        }

        return u;
    }

    // 🔹 EMAIL METHOD (reused logic)
    private static void sendWelcomeEmail(Id userId) {

        List<EmailTemplate> templates = [
            SELECT Id 
            FROM EmailTemplate 
            WHERE Name = 'Welcome User' 
            LIMIT 1
        ];

        if (!templates.isEmpty()) {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setTargetObjectId(userId);
            mail.setTemplateId(templates[0].Id);
            mail.setSaveAsActivity(false);

            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        } else {
            System.debug('Welcome User email template not found. Please create it.');
        }
    }

}
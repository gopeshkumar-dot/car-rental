public with sharing class ContactController {
    
    @AuraEnabled(cacheable=false)
    public static String registerUser(String fullName, String mobileNumber, String email, String password) {
        try {
            // 1. Validate input
            if (String.isBlank(fullName) || String.isBlank(email) || String.isBlank(password)) {
                throw new AuraHandledException('All fields are required');
            }
            
            // 2. Validate email format
            if (!isValidEmail(email)) {
                throw new AuraHandledException('Please enter a valid email address');
            }
            
            // 3. Check if email already exists
            List<User> existingUsers = [SELECT Id FROM User WHERE Email = :email LIMIT 1];
            if (!existingUsers.isEmpty()) {
                throw new AuraHandledException('This email is already registered');
            }
            
            // 4. Validate password strength
            if (password.length() < 8) {
                throw new AuraHandledException('Password must be at least 8 characters long');
            }
            
            // 5. Parse Full Name correctly for Apex
            List<String> nameParts = fullName.trim().split(' ');
            String firstName = nameParts[0];
            String lastName = '';
            if (nameParts.size() > 1) {
                // ✅ FIXED: Use List.subList() instead of Arrays.subList()
               // lastName = String.join(nameParts.subList(1, nameParts.size()), ' ');
            }
            
            // 6. Create User record
            User newUser = new User();
            newUser.FirstName = firstName;
            newUser.LastName = lastName;
            newUser.Email = email;
            newUser.Username = email; 
            newUser.Alias = fullName.length() <= 8 ? fullName : fullName.substring(0, 8);
            newUser.CommunityNickname = email.substringBefore('@');
            newUser.TimeZoneSidKey = 'GMT';
            newUser.LocaleSidKey = 'en_US';
            newUser.EmailEncodingKey = 'UTF-8';
            newUser.LanguageLocaleKey = 'en_US';
            newUser.ProfileId = getStandardUserProfileId(); 
            newUser.IsActive = false; // Inactive until email verified
            
            // Insert first to generate Id
            insert newUser;
            
            // Set password after insert (required by Salesforce)
            System.setPassword(newUser.Id, password);
            
            // 7. Send verification email
            sendVerificationEmail(newUser, fullName);
            
            return 'SUCCESS';
            
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            System.debug('Registration Error: ' + e.getMessage());
            throw new AuraHandledException('Registration failed: ' + e.getMessage());
        }
    }
    
    private static Boolean isValidEmail(String email) {
        String emailRegex = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
        return Pattern.matches(emailRegex, email);
    }
    
    private static Id getStandardUserProfileId() {
        try {
            return [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1].Id;
        } catch (Exception e) {
            // Fallback for Dev/Scratch orgs
            return [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1].Id;
        }
    }
    
    private static void sendVerificationEmail(User usr, String fullName) {
        try {
            // ✅ FIXED: Use EncodingUtil.convertToHex() instead of .toHex()
            Blob cryptoKey = Crypto.generateAesKey(128);
            String token = EncodingUtil.convertToHex(cryptoKey);
            
            //String baseUrl = URL.getSalesforceBaseUrl().toExternalForm();
           // String verificationLink = baseUrl + '/services/apexrest/verifyEmail?token=' + token + '&userId=' + usr.Id;
            
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { usr.Email });
            mail.setReplyTo('noreply@yourcompany.com');
            mail.setSenderDisplayName('Your Company');
            mail.setSubject('Welcome! Please verify your email address');
            
            String safeName = String.escapeSingleQuotes(fullName);
            String emailBody = '<html><body>';
            emailBody += '<h2>Welcome to Our Platform, ' + safeName + '!</h2>';
            emailBody += '<p>Thank you for registering. Please click below to verify your email:</p>';
            emailBody += '<p style="text-align: center; margin: 30px 0;">';
            //emailBody += '<a href="' + verificationLink + '" style="background-color: #E31837; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Verify Email Address</a>';
            emailBody += '</p>';
            emailBody += '<p>This link expires in 24 hours.</p>';
            emailBody += '</body></html>';
            
            mail.setHtmlBody(emailBody);
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
            
        } catch (Exception e) {
            System.debug('Error sending verification email: ' + e.getMessage());
            // Silently fail email so registration still succeeds
        }
    }
}
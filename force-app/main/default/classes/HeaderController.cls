public without sharing class HeaderController {
     @AuraEnabled(cacheable=true)
    public static Header__c getHeaderDetails() {
        try {
            List<Header__c> headers = [SELECT Id, Helpline__c, Mail_Us__c, Site_Name__c, WhatsApp__c 
                    FROM Header__c 
                    LIMIT 1];
            if (!headers.isEmpty()) {
                return headers[0];
            }
            return null;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

 @AuraEnabled  // ✅ Added missing annotation
    public static String createContact(String firstName, String lastName, String phone, String email, String password) {
        try {
            if (String.isBlank(firstName) || String.isBlank(lastName) || String.isBlank(phone) || String.isBlank(email) || String.isBlank(password)) {
                throw new AuraHandledException('All fields are required.');
            }

            List<Sign_Up__c> existingSignups = [
                SELECT Id
                FROM Sign_Up__c
                WHERE Email__c = :email
                LIMIT 1
            ];
            if (!existingSignups.isEmpty()) {
                return 'ALREADY_EXISTS';
            }

            System.debug('firstName: ' + firstName);
            System.debug('lastName: ' + lastName);
            System.debug('phone: ' + phone);
            System.debug('email: ' + email);
            System.debug('password: ' + password);
            
            Sign_Up__c newContact = new Sign_Up__c(
                Name = firstName,
                LastName__c = lastName,
                Phone__c = phone,
                Email__c = email,
                Password__c = password  // ⚠️ Security Note: Consider hashing passwords in production
            );
            
            insert newContact;
            
            return 'Success';
        } catch (Exception e) {
            String errorText = e.getMessage() == null ? '' : e.getMessage().toLowerCase();
            if (errorText.contains('already exists') || errorText.contains('duplicate')) {
                return 'ALREADY_EXISTS';
            }
            throw new AuraHandledException('Failed to create contact: ' + e.getMessage());
        }
    }

   @AuraEnabled
public static void sendRegistrationEmail(Id signUpRecordId) {
    try {
        // 1️⃣ Naya bana hua Sign_Up__c record fetch karein
        Sign_Up__c newUser = [SELECT Id, Name, Email__c, Phone__c 
                              FROM Sign_Up__c 
                              WHERE Id = :signUpRecordId 
                              LIMIT 1];

        // 2️⃣ Safety check: Agar email field blank hai to mail mat bhejo
        if (String.isBlank(newUser.Email__c)) {
            System.debug('⚠️ Email field empty hai, mail skip kiya ja raha hai.');
            return;
        }

        // 3️⃣ Email object setup
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new String[] { newUser.Email__c }); // ✅ Registered email directly use ho raha hai
        mail.setSenderDisplayName('Safar Team');
        mail.setReplyTo('support@safarcar.in'); // ⚠️ Apna actual support email yahan daalein
        mail.setSaveAsActivity(false);
        mail.setUseSignature(false);

        // 4️⃣ Email Template attach karein
        EmailTemplate et = [SELECT Id FROM EmailTemplate 
                            WHERE DeveloperName = 'User_Registration_Success' 
                            LIMIT 1];
        mail.setTemplateId(et.Id);
        
        // 🔧 FIX: Custom object ke liye setTargetObjectId mein User/Contact/Lead ID dena mandatory hai
        mail.setTargetObjectId(UserInfo.getUserId()); 
        mail.setWhatId(newUser.Id); // Isse template merge fields {!Sign_Up__c.Email__c} kaam karenge

        // 5️⃣ Email send karein
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        System.debug('✅ Success mail sent to: ' + newUser.Email__c);

    } catch (QueryException qe) {
        System.debug('❌ Record nahi mila: ' + qe.getMessage());
    } catch (Exception e) {
        // ❗ Email fail hone par bhi user registration rukna nahi chahiye
        System.debug('❌ Email send failed: ' + e.getMessage());
    }
}

   @AuraEnabled
    public static String loginContact(String email, String password) {
        try {
            List<Sign_Up__c> existingContact = [
                SELECT Id, Name, Phone__c, Email_Verified__c
                FROM Sign_Up__c 
                WHERE Email__c = :email AND Password__c = :password 
                LIMIT 1
            ];
            System.debug(existingContact);
            
            if (!existingContact.isEmpty()) {
                // If Email_Verified__c exists, check if they are verified
                Map<String, Schema.SObjectField> fields = Schema.SObjectType.Sign_Up__c.fields.getMap();
                if (fields.containsKey('Email_Verified__c')) {
                    Boolean isVerified = (Boolean) existingContact[0].get('Email_Verified__c');
                    if (isVerified != null && !isVerified) {
                        return 'UNVERIFIED';
                    }
                }
                
                Map<String, String> resultMap = new Map<String, String>();
                resultMap.put('status', 'Success');
                resultMap.put('name', existingContact[0].Name);
                resultMap.put('phone', existingContact[0].Phone__c);
                return JSON.serialize(resultMap);
            } else {
                return 'Failed';
            }
        } catch (Exception e) {
            throw new AuraHandledException('Invalid email or password.');
        }
    }

    // ==================== 🔐 OTP VERIFICATION & PASSWORD RESET METHODS ====================

    @AuraEnabled(cacheable=false)
    public static Map<String, Object> sendVerificationEmail(String email) {
        try {
            if (String.isBlank(email) || !email.contains('@')) {
                throw new AuraHandledException('Please provide a valid email address.');
            }
            String cleanEmail = email.toLowerCase().trim();
            
            List<Sign_Up__c> users = [
                SELECT Id, Name, Password_Reset_OTP__c, OTP_Expiry__c 
                FROM Sign_Up__c 
                WHERE Email__c = :cleanEmail 
                LIMIT 1
            ];
            
            if (users.isEmpty()) {
                throw new AuraHandledException('Account not found for this email.');
            }
            
            String code = String.valueOf(Math.round(Math.random() * 899999) + 100000);
            
            Sign_Up__c user = users[0];
            user.Password_Reset_OTP__c = code;
            user.OTP_Expiry__c = Datetime.now().addMinutes(10);
            update user;
            
            sendVerificationEmailActual(cleanEmail, code);
            
            return new Map<String, Object>{
                'success' => true,
                'message' => 'Verification code sent successfully.',
                'token' => cleanEmail
            };
        } catch (Exception e) {
            throw new AuraHandledException('Failed to send code: ' + e.getMessage());
        }  
    }

    @AuraEnabled(cacheable=false)
    public static Map<String, Object> verifyEmailCode(String email, String code) {
        try {
            if (String.isBlank(email) || String.isBlank(code)) {
                throw new AuraHandledException('Email and code are required.');
            }
            String cleanEmail = email.toLowerCase().trim();
            
            List<Sign_Up__c> users = [
                SELECT Id, Password_Reset_OTP__c, OTP_Expiry__c 
                FROM Sign_Up__c 
                WHERE Email__c = :cleanEmail 
                LIMIT 1
            ];
            
            if (users.isEmpty()) {
                throw new AuraHandledException('Account not found.');
            }
            
            Sign_Up__c user = users[0];
            if (String.isBlank(user.Password_Reset_OTP__c) || user.OTP_Expiry__c == null || Datetime.now() > user.OTP_Expiry__c) {
                throw new AuraHandledException('Verification code has expired or not found. Please request a new one.');
            }
            if (user.Password_Reset_OTP__c != code) {
                throw new AuraHandledException('Invalid verification code.');
            }
            
            // Clear verification code
            user.Password_Reset_OTP__c = null;
            user.OTP_Expiry__c = null;
            
            // Dynamically check and set Email_Verified__c to true if field exists
            Map<String, Schema.SObjectField> fields = Schema.SObjectType.Sign_Up__c.fields.getMap();
            if (fields.containsKey('Email_Verified__c')) {
                user.put('Email_Verified__c', true);
            }
            
            update user;
            
            return new Map<String, Object>{
                'success' => true,
                'message' => 'Email verified successfully!'
            };
        } catch (Exception e) {
            throw new AuraHandledException('Verification failed: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static Map<String, Object> resendVerificationCode(String email) {
        return sendVerificationEmail(email);
    }

    // 📧 Premium Email Template Generator
    private static String getPremiumEmailTemplate(String title, String content) {
        return '<div style="font-family: \'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f9; margin: 0; padding: 40px 20px;">' +
            '<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">' +
                '<div style="background: linear-gradient(135deg, #673ab7 0%, #512da8 100%); padding: 30px; text-align: center;">' +
                    '<h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px;">Safar Sathi</h1>' +
                    '<p style="color: #d1c4e9; margin: 5px 0 0 0; font-size: 14px;">Premium Car Rental Services</p>' +
                '</div>' +
                '<div style="padding: 40px; color: #334155;">' +
                    '<h2 style="margin-top: 0; color: #1e293b; font-size: 22px; font-weight: 700;">' + title + '</h2>' +
                    content +
                '</div>' +
                '<div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">' +
                    '<p style="margin: 0; color: #64748b; font-size: 13px;">© ' + Date.today().year() + ' Safar Sathi. All rights reserved.</p>' +
                    '<p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">This is an automated message, please do not reply.</p>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    // 📧 Verification Email Sender
    private static void sendVerificationEmailActual(String toEmail, String code) {
        try {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[]{toEmail});
            mail.setSubject('Verify Your Email - Safar Sathi');
            
            String content = '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello,</p>' +
                             '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Thank you for registering. Please use the verification code below to verify your email address:</p>' +
                             '<div style="text-align: center; margin: 32px 0;">' +
                                 '<span style="display: inline-block; background-color: #f3e8ff; color: #673ab7; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 16px 32px; border-radius: 12px; border: 2px dashed #d8b4fe;">' + code + '</span>' +
                             '</div>' +
                             '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">⏰ This code will expire in <strong>10 minutes</strong>.</p>' +
                             '<p style="font-size: 14px; line-height: 1.6; color: #64748b;">If you didn\'t request this, you can safely ignore this email.</p>';
            
            mail.setHtmlBody(getPremiumEmailTemplate('Email Verification', content));
            
            // Use verified Org-Wide Email Address if available
            List<OrgWideEmailAddress> oweas = [
                SELECT Id 
                FROM OrgWideEmailAddress 
                WHERE Address IN ('gopesh.kumar@danocloudtechnology.com', 'noreply@safarcarrental.com') 
                AND IsVerified = true 
                LIMIT 1
            ];
            if (!oweas.isEmpty()) {
                mail.setOrgWideEmailAddressId(oweas[0].Id);
            } else {
                mail.setSenderDisplayName('Safar Car Rental');
            }
            
            Messaging.sendEmail(new Messaging.SingleEmailMessage[]{mail});
            System.debug('✅ Verification email sent to: ' + toEmail);
        } catch (Exception e) {
            System.debug('❌ [EMAIL] sendVerificationEmailActual failed: ' + e.getMessage());
        }
    }

    // ==================== 🔐 PASSWORD RESET METHODS ====================

    @AuraEnabled(cacheable=false)
    public static Map<String, Object> requestPasswordReset(String email) {
        try {
            System.debug('🔐 [FP] Request received for: ' + email);
            
            if (String.isBlank(email) || !email.contains('@')) {
                throw new AuraHandledException('Please provide a valid email address.');
            }
            
            String cleanEmail = email.toLowerCase().trim();
            List<Sign_Up__c> users = [SELECT Id, Name, Email__c FROM Sign_Up__c WHERE Email__c = :cleanEmail LIMIT 1];
            System.debug('🔍 [FP] Query result size: ' + users.size());
            
            if (users.isEmpty()) {
                System.debug('⚠️ [FP] User not found for: ' + cleanEmail);
                return new Map<String, Object>{
                    'success' => true,
                    'message' => 'If this email is registered, you will receive a reset code shortly.',
                    'token' => null
                };
            }
            
            Sign_Up__c user = users[0];
            String resetCode = String.valueOf(Math.round(Math.random() * 899999) + 100000);
            System.debug('🔑 [FP] Code generated for: ' + cleanEmail);
            
            user.Password_Reset_OTP__c = resetCode;
            user.OTP_Expiry__c = Datetime.now().addMinutes(10);
            update user;
            
            sendPasswordResetEmail(user.Name, cleanEmail, resetCode);
            
            return new Map<String, Object>{
                'success' => true,
                'message' => 'If this email is registered, you will receive a reset code shortly.',
                'token' => cleanEmail
            };
        } catch (Exception e) {
            System.debug('❌ [FP] Error: ' + e.getMessage());
            throw new AuraHandledException('Failed to process request: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static Map<String, Object> verifyResetCode(String email, String code) {
        try {
            if (String.isBlank(email) || String.isBlank(code)) {
                throw new AuraHandledException('Email and code are required.');
            }
            String cleanEmail = email.toLowerCase().trim();
            
            List<Sign_Up__c> users = [
                SELECT Id, Password_Reset_OTP__c, OTP_Expiry__c 
                FROM Sign_Up__c 
                WHERE Email__c = :cleanEmail 
                LIMIT 1
            ];
            
            if (users.isEmpty()) {
                throw new AuraHandledException('Account not found.');
            }
            
            Sign_Up__c user = users[0];
            if (String.isBlank(user.Password_Reset_OTP__c) || user.OTP_Expiry__c == null || Datetime.now() > user.OTP_Expiry__c) {
                throw new AuraHandledException('Code expired or not found. Please request a new one.');
            }
            if (user.Password_Reset_OTP__c != code) {
                throw new AuraHandledException('Invalid verification code. Please try again.');
            }
            
            return new Map<String, Object>{
                'success' => true,
                'message' => 'Code verified! You can now set a new password.',
                'token' => cleanEmail
            };
        } catch (Exception e) {
            throw new AuraHandledException('Verification failed: ' + e.getMessage());
        }
    }

    @AuraEnabled(cacheable=false)
    public static Map<String, Object> updatePassword(String email, String code, String newPassword) {
        try {
            if (String.isBlank(email) || String.isBlank(code) || String.isBlank(newPassword)) {
                throw new AuraHandledException('All fields are required.');
            }
            
            String cleanEmail = email.toLowerCase().trim();
            
            List<Sign_Up__c> users = [
                SELECT Id, Name, Password_Reset_OTP__c, OTP_Expiry__c 
                FROM Sign_Up__c 
                WHERE Email__c = :cleanEmail 
                LIMIT 1
            ];
            
            if (users.isEmpty()) {
                throw new AuraHandledException('User not found.');
            }
            
            Sign_Up__c user = users[0];
            if (String.isBlank(user.Password_Reset_OTP__c) || user.Password_Reset_OTP__c != code || user.OTP_Expiry__c == null || Datetime.now() > user.OTP_Expiry__c) {
                throw new AuraHandledException('Invalid or expired reset code.');
            }
            
            if (newPassword.length() < 6) {
                throw new AuraHandledException('Password must be at least 6 characters long.');
            }
            
            user.Password__c = newPassword;
            user.Password_Reset_OTP__c = null;
            user.OTP_Expiry__c = null;
            update user;
            
            sendPasswordChangeConfirmation(user.Name, cleanEmail);
            
            return new Map<String, Object>{
                'success' => true,
                'message' => 'Password updated successfully! You can now login.'
            };
        } catch (Exception e) {
            throw new AuraHandledException('Failed to update password: ' + e.getMessage());
        }
    }

    // 📧 Forgot Password Email Sender
    private static void sendPasswordResetEmail(String userName, String toEmail, String resetCode) {
        try {
            System.debug('📧 [EMAIL] Preparing reset mail for: ' + toEmail);
            
            if (!toEmail.contains('@') || !toEmail.contains('.')) {
                System.debug('❌ [EMAIL] Invalid format: ' + toEmail);
                return;
            }
            
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[]{toEmail});
            mail.setSubject('🔐 Reset Your Password - Safar Car Rental');
            mail.setSaveAsActivity(false);
            
            // Use verified Org-Wide Email Address if available
            List<OrgWideEmailAddress> oweas = [
                SELECT Id 
                FROM OrgWideEmailAddress 
                WHERE Address IN ('gopesh.kumar@danocloudtechnology.com', 'noreply@safarcarrental.com') 
                AND IsVerified = true 
                LIMIT 1
            ];
            if (!oweas.isEmpty()) {
                mail.setOrgWideEmailAddressId(oweas[0].Id);
            } else {
                mail.setSenderDisplayName('Safar Support');
                mail.setReplyTo('support@safarcar.in');
            }
            
            String content = '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello ' + userName + ',</p>' +
                             '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">We received a request to reset your password. Here is your 6-digit recovery code:</p>' +
                             '<div style="text-align: center; margin: 32px 0;">' +
                                 '<span style="display: inline-block; background-color: #fff1f2; color: #e11d48; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 16px 32px; border-radius: 12px; border: 2px dashed #fecdd3;">' + resetCode + '</span>' +
                             '</div>' +
                             '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">⏰ This code will expire in <strong>10 minutes</strong>.</p>' +
                             '<p style="font-size: 14px; line-height: 1.6; color: #64748b;">If you didn\'t request a password reset, please ignore this email or contact support if you have concerns.</p>';
            
            mail.setHtmlBody(getPremiumEmailTemplate('Password Reset Request', content));
            
            Messaging.SendEmailResult[] results = Messaging.sendEmail(new Messaging.SingleEmailMessage[]{mail});
            if (results[0].isSuccess()) {
                System.debug('✅ [EMAIL] Reset email sent successfully to: ' + toEmail);
            } else {
                System.debug('❌ [EMAIL] Send failed: ' + String.join(results[0].getErrors(), ' | '));
            }
        } catch (Exception e) {
            System.debug('❌ [EMAIL] Unexpected error: ' + e.getMessage());
        }
    }

    // 📧 Password Change Confirmation Email
    private static void sendPasswordChangeConfirmation(String userName, String toEmail) {
        try {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[]{toEmail});
            mail.setSubject('✅ Password Changed Successfully - Safar Car Rental');
            
            // Use verified Org-Wide Email Address if available
            List<OrgWideEmailAddress> oweas = [
                SELECT Id 
                FROM OrgWideEmailAddress 
                WHERE Address IN ('gopesh.kumar@danocloudtechnology.com', 'noreply@safarcarrental.com') 
                AND IsVerified = true 
                LIMIT 1
            ];
            if (!oweas.isEmpty()) {
                mail.setOrgWideEmailAddressId(oweas[0].Id);
            } else {
                mail.setSenderDisplayName('Safar Support');
            }
            
            String content = '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hello ' + userName + ',</p>' +
                             '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your password has been successfully updated. You can now use your new password to log in to your account.</p>' +
                             '<div style="text-align: center; margin: 32px 0;">' +
                                 '<span style="display: inline-block; background-color: #f0fdf4; color: #16a34a; font-size: 18px; font-weight: 600; padding: 16px 32px; border-radius: 12px; border: 1px solid #bbf7d0;">✅ Password Changed Successfully</span>' +
                             '</div>' +
                             '<p style="font-size: 14px; line-height: 1.6; color: #64748b;">If you didn\'t make this change, please contact our support team immediately to secure your account.</p>';
            
            mail.setHtmlBody(getPremiumEmailTemplate('Security Update', content));
            Messaging.sendEmail(new Messaging.SingleEmailMessage[]{mail});
            System.debug('✅ [EMAIL] Confirmation sent to: ' + toEmail);
        } catch (Exception e) {
            System.debug('⚠️ [EMAIL] Confirmation failed: ' + e.getMessage());
        }
    }
}
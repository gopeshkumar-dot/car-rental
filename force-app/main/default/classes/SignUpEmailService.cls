public with sharing class SignUpEmailService {
    private static final Integer OTP_VALID_MINUTES = 10;

    public static void sendWelcomeEmails(List<Sign_Up__c> signups) {
        if (signups == null || signups.isEmpty()) {
            return;
        }

        // Query verified Org-Wide Email Address once
        Id oweaId = null;
        try {
            List<OrgWideEmailAddress> oweas = [
                SELECT Id 
                FROM OrgWideEmailAddress 
                WHERE Address IN ('gopesh.kumar@danocloudtechnology.com', 'noreply@safarcarrental.com') 
                AND IsVerified = true 
                LIMIT 1
            ];
            if (!oweas.isEmpty()) {
                oweaId = oweas[0].Id;
            }
        } catch (Exception e) {}

        List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();
        for (Sign_Up__c signup : signups) {
            if (String.isBlank(signup.Email__c)) {
                continue;
            }
            String displayName = buildDisplayName(signup);
            Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
            email.setToAddresses(new String[] { signup.Email__c });
            email.setSubject('Welcome to Car Rental');
            email.setHtmlBody(buildWelcomeEmailHtml(displayName, signup.Email__c, signup.Password__c));
            
            if (oweaId != null) {
                email.setOrgWideEmailAddressId(oweaId);
            }
            
            emails.add(email);
        }
        if (!emails.isEmpty()) {
            try {
                Messaging.sendEmail(emails);
            } catch (Exception e) {
                System.debug('❌ [Welcome Email Failure] ' + e.getMessage());
            }
        }
    }

    public static void sendForgotPasswordOtp(Sign_Up__c signup, String otpCode) {
        if (signup == null || String.isBlank(signup.Email__c) || String.isBlank(otpCode)) {
            return;
        }
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new String[] { signup.Email__c });
        email.setSubject('Car Rental Password Reset OTP');
        email.setHtmlBody(buildOtpEmailHtml(buildDisplayName(signup), otpCode, OTP_VALID_MINUTES));
        
        try {
            List<OrgWideEmailAddress> oweas = [
                SELECT Id 
                FROM OrgWideEmailAddress 
                WHERE Address IN ('gopesh.kumar@danocloudtechnology.com', 'noreply@safarcarrental.com') 
                AND IsVerified = true 
                LIMIT 1
            ];
            if (!oweas.isEmpty()) {
                email.setOrgWideEmailAddressId(oweas[0].Id);
            }
        } catch (Exception e) {}
        
        try {
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { email });
        } catch (Exception e) {
            System.debug('❌ [OTP Email Failure] ' + e.getMessage());
        }
    }

    public static Integer getOtpValidMinutes() {
        return OTP_VALID_MINUTES;
    }

    private static String buildDisplayName(Sign_Up__c signup) {
        String namePart = String.isBlank(signup.Name) ? 'Customer' : signup.Name;
        if (String.isNotBlank(signup.LastName__c)) {
            namePart += ' ' + signup.LastName__c;
        }
        return namePart;
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

    private static String buildWelcomeEmailHtml(String displayName, String username, String password) {
        String content = '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Dear ' + htmlEscape(displayName) + ',</p>' +
                         '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Welcome to Safar Sathi! We are thrilled to have you on board. Your account has been created successfully. Here are your login details:</p>' +
                         '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 32px 0;">' +
                             '<div style="margin-bottom: 16px;">' +
                                 '<span style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 1px;">Username</span><br>' +
                                 '<strong style="font-size: 18px; color: #1e293b;">' + htmlEscape(username) + '</strong>' +
                             '</div>' +
                             '<div>' +
                                 '<span style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 1px;">Password</span><br>' +
                                 '<strong style="font-size: 18px; color: #1e293b;">' + htmlEscape(password) + '</strong>' +
                             '</div>' +
                         '</div>' +
                         '<p style="font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">For your security, we recommend changing your password after your first login.</p>';
                         
        return getPremiumEmailTemplate('Welcome to Safar Sathi', content);
    }

    private static String buildOtpEmailHtml(String displayName, String otpCode, Integer validMinutes) {
        String content = '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Dear ' + htmlEscape(displayName) + ',</p>' +
                         '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Use the OTP below to reset your Safar Sathi password:</p>' +
                         '<div style="text-align: center; margin: 32px 0;">' +
                             '<span style="display: inline-block; background-color: #fff1f2; color: #e11d48; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 16px 32px; border-radius: 12px; border: 2px dashed #fecdd3;">' + htmlEscape(otpCode) + '</span>' +
                         '</div>' +
                         '<p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">⏰ This code will expire in <strong>' + validMinutes + ' minutes</strong>.</p>' +
                         '<p style="font-size: 14px; line-height: 1.6; color: #64748b;">If you didn\'t request this, please ignore this email.</p>';
                         
        return getPremiumEmailTemplate('Password Reset OTP', content);
    }

    private static String htmlEscape(String input) {
        if (input == null) {
            return '';
        }
        return input
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;')
            .replace('\'', '&#39;');
    }
}
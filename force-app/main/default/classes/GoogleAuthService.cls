public class GoogleAuthService {
    private static final Integer TOKEN_REFRESH_BUFFER_SECONDS = 60;
    private static String cachedToken;
    private static Datetime cachedTokenExpiresAt;

    public static String getAccessToken() {
        // Per-transaction cache first.
        if (isTokenUsable(cachedToken, cachedTokenExpiresAt)) {
            return cachedToken;
        }

        // Cross-transaction cache (best effort).
        try {
            String tokenFromCache = (String) Cache.Org.get('googleDrive.accessToken');
            Object expRaw = Cache.Org.get('googleDrive.accessToken.expMs');
            if (tokenFromCache != null && expRaw != null) {
                Long expMs = Long.valueOf(String.valueOf(expRaw));
                if (isTokenUsable(tokenFromCache, expMs)) {
                    cachedToken = tokenFromCache;
                    cachedTokenExpiresAt = Datetime.now().addSeconds(300);
                    return tokenFromCache;
                }
            }
        } catch (Exception ignoreCacheReadError) {
            // Cache may be unavailable in some orgs; continue with direct token call.
        }

        // Corrected the object name from Google_Auth_Config_mdt__mdt to Google_Auth_Config__mdt
        Google_Auth_Config_mdt__mdt cfg = [
            SELECT Client_Id__c, Client_Secret__c, Refresh_Token__c 
            FROM Google_Auth_Config_mdt__mdt 
            LIMIT 1
        ];

        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://oauth2.googleapis.com/token');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
        
        String body = 'client_id=' + EncodingUtil.urlEncode(cfg.Client_Id__c, 'UTF-8') +
                      '&client_secret=' + EncodingUtil.urlEncode(cfg.Client_Secret__c, 'UTF-8') +
                      '&refresh_token=' + EncodingUtil.urlEncode(cfg.Refresh_Token__c, 'UTF-8') +
                      '&grant_type=refresh_token';
        
        req.setBody(body);
        
        Http http = new Http();
        HttpResponse res = http.send(req);
        
        if (res.getStatusCode() != 200) {
            throw new CalloutException('Token Error: ' + res.getBody());
        }
        
        Map<String, Object> jsonMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        String token = (String) jsonMap.get('access_token');
        Integer expiresIn = jsonMap.containsKey('expires_in')
            ? Integer.valueOf(String.valueOf(jsonMap.get('expires_in')))
            : 3600;

        Datetime expAt = Datetime.now().addSeconds(Math.max(60, expiresIn - TOKEN_REFRESH_BUFFER_SECONDS));
        cachedToken = token;
        cachedTokenExpiresAt = expAt;

        // Best-effort org cache with ttl based on token expiry.
        try {
            Integer ttl = Math.max(60, expiresIn - TOKEN_REFRESH_BUFFER_SECONDS);
            Cache.Org.put('googleDrive.accessToken', token, ttl);
            Cache.Org.put('googleDrive.accessToken.expMs', expAt.getTime(), ttl);
        } catch (Exception ignoreCacheWriteError) {
            // Ignore cache write failures; token still returned.
        }
        return token;
    }

    private static Boolean isTokenUsable(String token, Datetime expAt) {
        return String.isNotBlank(token) && expAt != null && expAt.getTime() > Datetime.now().getTime();
    }

    private static Boolean isTokenUsable(String token, Long expMs) {
        return String.isNotBlank(token) && expMs != null && expMs > Datetime.now().getTime();
    }
}
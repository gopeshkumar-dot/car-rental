public with sharing class GoogleDriveDownloader {
    private static final String DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
    private static final Integer FOLDER_CACHE_TTL_SECONDS = 120;

    // ===================== GET ALL FILES =====================
    public static List<GoogleFile> getFilesFromFolder(String folderId) {

        System.debug('🔥 START getFilesFromFolder');
        System.debug('👉 Folder ID: ' + folderId);

        if (String.isBlank(folderId)) {
            System.debug('❌ Folder ID is blank');
            throw new AuraHandledException('Folder ID is required');
        }

        String cached = getCachedJson('googleDrive.files.' + folderId);
        if (String.isNotBlank(cached)) {
            return deserializeGoogleFiles(cached);
        }

        String accessToken = GoogleAuthService.getAccessToken();
        System.debug('👉 Access Token: ' + accessToken);

        String query = EncodingUtil.urlEncode(
            '\'' + folderId + '\' in parents and trashed = false',
            'UTF-8'
        );

        String endpoint = DRIVE_API_URL + '?q=' + query +
            '&fields=files(id,name,mimeType,size,iconLink,webViewLink)';

        System.debug('👉 Endpoint: ' + endpoint);

        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('GET');
        req.setHeader('Authorization', 'Bearer ' + accessToken);

        Http http = new Http();
        HttpResponse res = http.send(req);

        System.debug('👉 Status Code: ' + res.getStatusCode());
        System.debug('👉 Response: ' + res.getBody());

        if (res.getStatusCode() == 200) {
            Map<String, Object> results =
                (Map<String, Object>) JSON.deserializeUntyped(res.getBody());

            List<Object> filesJson = (List<Object>) results.get('files');

            if (filesJson == null) {
                System.debug('⚠️ No files found');
                return new List<GoogleFile>();
            }

            System.debug('👉 Files Count: ' + filesJson.size());

            List<GoogleFile> fileList = new List<GoogleFile>();

            for (Object obj : filesJson) {
                GoogleFile gf = new GoogleFile((Map<String, Object>)obj);
                System.debug('✅ File: ' + gf.name);
                fileList.add(gf);
            }

            putCachedJson('googleDrive.files.' + folderId, JSON.serialize(fileList), FOLDER_CACHE_TTL_SECONDS);
            return fileList;
        } else {
            System.debug('❌ API Error: ' + res.getBody());
            throw new AuraHandledException('Google Drive API Error: ' + res.getBody());
        }
    }

    // ===================== GET IMAGE FILES =====================
    public static List<GoogleFile> getImageFilesFromFolder(String folderId) {

        System.debug('🔥 START getImageFilesFromFolder');
        System.debug('👉 Folder ID: ' + folderId);

        if (String.isBlank(folderId)) {
            System.debug('❌ Folder ID is blank');
            throw new AuraHandledException('Folder ID is required');
        }

        String cached = getCachedJson('googleDrive.images.' + folderId);
        if (String.isNotBlank(cached)) {
            return deserializeGoogleFiles(cached);
        }

        String accessToken = GoogleAuthService.getAccessToken();
        System.debug('👉 Access Token: ' + accessToken);

        String query = EncodingUtil.urlEncode(
            '\'' + folderId + '\' in parents and trashed = false' +
            ' and mimeType contains \'image/\'',
            'UTF-8'
        );

        System.debug('👉 Query: ' + query);

        String endpoint = DRIVE_API_URL + '?q=' + query +
            '&fields=files(id,name,mimeType,iconLink,webViewLink)';

        System.debug('👉 Endpoint: ' + endpoint);

        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('GET');
        req.setHeader('Authorization', 'Bearer ' + accessToken);

        Http http = new Http();
        HttpResponse res = http.send(req);

        System.debug('👉 Status Code: ' + res.getStatusCode());
        System.debug('👉 Response Body: ' + res.getBody());

        if (res.getStatusCode() == 200) {
            Map<String, Object> results =
                (Map<String, Object>) JSON.deserializeUntyped(res.getBody());

            List<Object> filesJson = (List<Object>) results.get('files');

            if (filesJson == null) {
                System.debug('⚠️ No image files found');
                return new List<GoogleFile>();
            }

            System.debug('👉 Image Count: ' + filesJson.size());

            List<GoogleFile> fileList = new List<GoogleFile>();

            for (Object obj : filesJson) {
                GoogleFile gf = new GoogleFile((Map<String, Object>)obj);

                gf.directImageUrl =
                    'https://drive.google.com/thumbnail?id=' + gf.id + '&sz=w800';

                System.debug('🖼 Image: ' + gf.name);
                System.debug('🔗 URL: ' + gf.directImageUrl);

                fileList.add(gf);
            }

            System.debug('🔥 FINAL IMAGE LIST SIZE: ' + fileList.size());
            putCachedJson('googleDrive.images.' + folderId, JSON.serialize(fileList), FOLDER_CACHE_TTL_SECONDS);
            return fileList;

        } else {
            System.debug('❌ Image API Error: ' + res.getBody());
            throw new AuraHandledException('Error: ' + res.getBody());
        }
    }

    // ===================== DOWNLOAD FILE =====================
    public static String downloadAndLinkFile(String googleFileId, String fileName,
        String parentRecordId, String mimeType) {

        System.debug('🔥 START downloadAndLinkFile');
        System.debug('👉 File ID: ' + googleFileId);
        System.debug('👉 File Name: ' + fileName);

        try {
            String accessToken = GoogleAuthService.getAccessToken();
            System.debug('👉 Access Token: ' + accessToken);

            String endpoint;

            if (mimeType != null &&
                mimeType.startsWith('application/vnd.google-apps.')) {

                String exportMimeType = getExportMimeType(mimeType);
                endpoint = DRIVE_API_URL + '/' + googleFileId +
                    '/export?mimeType=' + exportMimeType;

                System.debug('👉 Export Endpoint: ' + endpoint);

            } else {
                endpoint = DRIVE_API_URL + '/' + googleFileId + '?alt=media';
                System.debug('👉 Download Endpoint: ' + endpoint);
            }

            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint);
            req.setMethod('GET');
            req.setHeader('Authorization', 'Bearer ' + accessToken);
            req.setTimeout(120000);

            Http http = new Http();
            HttpResponse res = http.send(req);

            System.debug('👉 Status Code: ' + res.getStatusCode());

            if (res.getStatusCode() == 200) {

                ContentVersion cv = new ContentVersion();
                cv.Title = fileName;
                cv.PathOnClient = fileName;
                cv.VersionData = res.getBodyAsBlob();
                cv.IsMajorVersion = true;

                insert cv;
                System.debug('✅ File inserted in ContentVersion: ' + cv.Id);

                Id contentDocId = [
                    SELECT ContentDocumentId
                    FROM ContentVersion
                    WHERE Id = :cv.Id
                ].ContentDocumentId;

                ContentDocumentLink cdl = new ContentDocumentLink();
                cdl.ContentDocumentId = contentDocId;
                cdl.LinkedEntityId = (Id)parentRecordId;
                cdl.ShareType = 'V';
                cdl.Visibility = 'AllUsers';

                insert cdl;

                System.debug('✅ File linked to record: ' + parentRecordId);

                return cv.Id;

            } else {
                System.debug('❌ Download Failed: ' + res.getBody());
                throw new AuraHandledException('Download Failed: ' + res.getBody());
            }

        } catch (Exception e) {
            System.debug('❌ Exception: ' + e.getMessage());
            throw new AuraHandledException('Exception: ' + e.getMessage());
        }
    }

    private static String getExportMimeType(String googleMimeType) {
        if (googleMimeType.contains('document'))
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (googleMimeType.contains('spreadsheet'))
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        return 'application/pdf';
    }

    // ===================== WRAPPER =====================
    public class GoogleFile {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String mimeType;
        @AuraEnabled public String size;
        @AuraEnabled public String iconLink;
        @AuraEnabled public String webViewLink;
        @AuraEnabled public String directImageUrl;

        public GoogleFile(Map<String, Object> data) {
            this.id = (String)data.get('id');
            this.name = (String)data.get('name');
            this.mimeType = (String)data.get('mimeType');
            this.size = String.valueOf(data.get('size'));
            this.iconLink = (String)data.get('iconLink');
            this.webViewLink = (String)data.get('webViewLink');
            this.directImageUrl = '';
        }
    }

    private static String getCachedJson(String key) {
        try {
            return (String) Cache.Org.get(key);
        } catch (Exception e) {
            return null;
        }
    }

    private static void putCachedJson(String key, String value, Integer ttlSeconds) {
        try {
            Cache.Org.put(key, value, ttlSeconds);
        } catch (Exception e) {
            // Cache optional.
        }
    }

    private static List<GoogleFile> deserializeGoogleFiles(String jsonText) {
        List<GoogleFile> out = new List<GoogleFile>();
        if (String.isBlank(jsonText)) return out;
        List<Object> rows = (List<Object>) JSON.deserializeUntyped(jsonText);
        for (Object row : rows) {
            Map<String, Object> m = (Map<String, Object>) row;
            GoogleFile g = new GoogleFile(m);
            if (m.containsKey('directImageUrl') && m.get('directImageUrl') != null) {
                g.directImageUrl = String.valueOf(m.get('directImageUrl'));
            }
            out.add(g);
        }
        return out;
    }
}
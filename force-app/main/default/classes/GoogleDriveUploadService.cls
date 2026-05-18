public without sharing class GoogleDriveUploadService {

    private static final String DRIVE_UPLOAD_URL =
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    private static final String DRIVE_API_URL =
        'https://www.googleapis.com/drive/v3/files';

    // ============================================================
    // @future — Main Upload Method
    // Triggered when Image_Public_URL__c is null
    // ============================================================
    @future(callout=true)
    public static void uploadToDrive(Id contentVersionId, Id propertyImageId) {
        Long t0 = System.now().getTime();
        System.debug(LoggingLevel.INFO, 'DC-ImgUpload @future uploadToDrive START cv=' + contentVersionId
            + ' propertyImage=' + propertyImageId + ' t0=' + t0);

        try {
            // ── 1. Fetch file from Salesforce ───────────────────
            ContentVersion cv = [
                SELECT Id, Title, VersionData,
                       FileExtension, ContentDocumentId
                FROM   ContentVersion
                WHERE  Id = :contentVersionId
                LIMIT  1
            ];
            System.debug('✅ File fetched: ' + cv.Title);

            // ── 2. Get Access Token ─────────────────────────────
            String accessToken = GoogleAuthService.getAccessToken();
            System.debug('✅ Access Token ready');

            // ── 3. MIME Type ────────────────────────────────────
            String mimeType = getMimeType(cv.FileExtension);
            System.debug('👉 MIME Type: ' + mimeType);

            // ── 4. Metadata ─────────────────────────────────────
            String metadata = '{"name":"' + cv.Title + '",' +
                               '"mimeType":"' + mimeType + '"}';
            System.debug('👉 Metadata: ' + metadata);

            // ── 5. Build Multipart Body ─────────────────────────
            String boundary   = 'sf_drive_boundary_2024';
            String delimiter  = '--' + boundary;
            String closeDelim = delimiter + '--';

            String bodyStr =
                delimiter + '\r\n' +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                metadata + '\r\n' +
                delimiter + '\r\n' +
                'Content-Type: ' + mimeType + '\r\n' +
                'Content-Transfer-Encoding: base64\r\n\r\n' +
                EncodingUtil.base64Encode(cv.VersionData) + '\r\n' +
                closeDelim;

            // ── 6. Upload to Google Drive ───────────────────────
            HttpRequest uploadReq = new HttpRequest();
            uploadReq.setEndpoint(DRIVE_UPLOAD_URL);
            uploadReq.setMethod('POST');
            uploadReq.setHeader('Authorization', 'Bearer ' + accessToken);
            uploadReq.setHeader('Content-Type',
                'multipart/related; boundary="' + boundary + '"');
            uploadReq.setBody(bodyStr);
            uploadReq.setTimeout(120000);

            HttpResponse uploadRes = new Http().send(uploadReq);
            System.debug('👉 Upload Status Code: ' + uploadRes.getStatusCode());
            System.debug('👉 Upload Response   : ' + uploadRes.getBody());

            if (uploadRes.getStatusCode() != 200) {
                System.debug('❌ Upload failed');
                updateStatus(propertyImageId, 'Failed', null, null);
                return;
            }

            // ── 7. Extract Drive File ID ────────────────────────
            Map<String,Object> uploadResult =
                (Map<String,Object>) JSON.deserializeUntyped(
                    uploadRes.getBody()
                );
            String driveFileId = (String) uploadResult.get('id');
            System.debug('✅ Drive File ID: ' + driveFileId);

            // ── 8. Make File Public ─────────────────────────────
            makeFilePublic(driveFileId, accessToken);

            // ── 9. Build Public URL ─────────────────────────────
            String publicUrl =
                'https://drive.google.com/thumbnail?id=' +
                driveFileId + '&sz=w800';
            System.debug('✅ Public URL: ' + publicUrl);

            // ── 10. Update Property_Image__c ────────────────────
            //    Image_Public_URL__c was NULL → now has Drive URL
            updateStatus(propertyImageId, 'Uploaded', publicUrl, driveFileId);
            System.debug('✅ Image_Public_URL__c updated with Drive URL');

            // ── 11. Delete SF file to free storage ──────────────
            deleteSFFile(cv.ContentDocumentId, propertyImageId);
            System.debug('✅ SF file deleted');

            System.debug(LoggingLevel.INFO, 'DC-ImgUpload @future uploadToDrive SUCCESS totalMs=' + (System.now().getTime() - t0));

        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'DC-ImgUpload @future uploadToDrive FAIL totalMs=' + (System.now().getTime() - t0)
                + ' err=' + e.getMessage());
            System.debug('❌ Stack    : ' + e.getStackTraceString());
            updateStatus(propertyImageId, 'Failed', null, null);
        }
    }

    // ============================================================
    // PRIVATE — Make file public "Anyone with link"
    // ============================================================
    private static void makeFilePublic(String fileId, String accessToken) {
        System.debug('🔥 makeFilePublic: ' + fileId);
        try {
            HttpRequest req = new HttpRequest();
            req.setEndpoint(DRIVE_API_URL + '/' + fileId + '/permissions');
            req.setMethod('POST');
            req.setHeader('Authorization', 'Bearer ' + accessToken);
            req.setHeader('Content-Type', 'application/json');
            req.setBody('{"role":"reader","type":"anyone"}');

            HttpResponse res = new Http().send(req);
            System.debug('👉 Permission Status: ' + res.getStatusCode());
            System.debug('👉 Permission Body  : ' + res.getBody());
        } catch(Exception e) {
            System.debug('⚠️ Permission error (non-fatal): ' + e.getMessage());
        }
    }

    // ============================================================
    // PRIVATE — Update Property_Image__c
    // Image_Public_URL__c null tha → ab Drive URL set hoga
    // ============================================================
    private static void updateStatus(
        Id     propertyImageId,
        String status,
        String url,
        String driveId
    ) {
        try {
            Car_Image__c img = new Car_Image__c();
            img.Id               = propertyImageId;
            img.Upload_Status__c = status;

            if (url != null) {
                img.Image_Public_URL__c     = url;
                img.Google_Drive_File_ID__c = driveId;
                img.Uploaded_At__c          = System.now();
                img.Is_Public_Image__c      = true;
            }
            update img;
            System.debug('✅ Status updated → ' + status);

            if (status == 'Uploaded' && url != null) {
                updateMainImageIfNeeded(propertyImageId, url);
            }

        } catch(Exception e) {
            System.debug('❌ updateStatus error: ' + e.getMessage());
        }
    }

    // ============================================================
    // PRIVATE — If Is_Main_Image = true → update Property URL
    // ============================================================
    private static void updateMainImageIfNeeded(Id imgId, String url) {
        try {
            Car_Image__c img = [
                SELECT Is_Main_Image__c, Car__c
                FROM   Car_Image__c
                WHERE  Id = :imgId
                LIMIT  1
            ];
            if (img.Is_Main_Image__c) { 
                update new Car__c(
                    Id                = img.Car__c,
                    Main_Image_URL__c = url
                );
                System.debug('✅ Property Main_Image_URL__c updated');
            }
        } catch(Exception e) {
            System.debug('⚠️ updateMainImage error: ' + e.getMessage());
        }
    }

    // ============================================================
    // PRIVATE — Delete SF file to free storage
    // ============================================================
    private static void deleteSFFile(Id contentDocId, Id propertyImageId) {
        try {
            delete [
                SELECT Id FROM ContentDocument
                WHERE  Id = :contentDocId
            ];
            System.debug('✅ ContentDocument deleted from Salesforce');

            update new Car_Image__c(
                Id                 = propertyImageId,
                SF_File_Deleted__c = true
            );
        } catch(Exception e) {
            System.debug('⚠️ Delete error (non-fatal): ' + e.getMessage());
        }
    }

    /**
     * Permanently deletes a file from Google Drive (API v3).
     * @return HTTP status code; 204 = deleted, 404 = already absent, other = error
     */
    public static Integer deleteDriveFileById(String driveFileId) {
        if (String.isBlank(driveFileId)) {
            return 400;
        }
        try {
            String accessToken = GoogleAuthService.getAccessToken();
            HttpRequest req = new HttpRequest();
            req.setEndpoint(DRIVE_API_URL + '/' + EncodingUtil.urlEncode(driveFileId, 'UTF-8'));
            req.setMethod('DELETE');
            req.setHeader('Authorization', 'Bearer ' + accessToken);
            req.setTimeout(60000);
            HttpResponse res = new Http().send(req);
            System.debug('deleteDriveFileById ' + driveFileId + ' → ' + res.getStatusCode());
            return res.getStatusCode();
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'deleteDriveFileById failed: ' + e.getMessage());
            return 0;
        }
    }

    // ============================================================
    // PRIVATE — File extension → MIME type
    // ============================================================
    private static String getMimeType(String ext) {
        if (ext == null) return 'image/jpeg';
        String e = ext.toLowerCase();
        if (e == 'jpg' || e == 'jpeg') return 'image/jpeg';
        if (e == 'png')                return 'image/png';
        if (e == 'webp')               return 'image/webp';
        if (e == 'mp4')                return 'video/mp4';
        if (e == 'pdf')                return 'application/pdf';
        return 'image/jpeg';
    }
@future(callout=true)
public static void uploadAgentToDrive(Id contentVersionId, Id contactId) {

    try {
        ContentVersion cv = [
            SELECT Id, Title, VersionData, FileExtension, ContentDocumentId
            FROM ContentVersion
            WHERE Id = :contentVersionId
            LIMIT 1
        ];

        String accessToken = GoogleAuthService.getAccessToken();
        String mimeType = getMimeType(cv.FileExtension);

        String metadata = '{"name":"' + cv.Title + '","mimeType":"' + mimeType + '"}';

        String boundary = 'agent_boundary';
        String body =
            '--' + boundary + '\r\n' +
            'Content-Type: application/json\r\n\r\n' +
            metadata + '\r\n' +
            '--' + boundary + '\r\n' +
            'Content-Type: ' + mimeType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            EncodingUtil.base64Encode(cv.VersionData) + '\r\n' +
            '--' + boundary + '--';

        HttpRequest req = new HttpRequest();
        req.setEndpoint(DRIVE_UPLOAD_URL);
        req.setMethod('POST');
        req.setHeader('Authorization', 'Bearer ' + accessToken);
        req.setHeader('Content-Type', 'multipart/related; boundary=' + boundary);
        req.setBody(body);

        HttpResponse res = new Http().send(req);

        if (res.getStatusCode() != 200) return;

        Map<String,Object> result =
            (Map<String,Object>) JSON.deserializeUntyped(res.getBody());

        String fileId = (String) result.get('id');

        makeFilePublic(fileId, accessToken);

        String publicUrl =
            'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';

        // ✅ UPDATE CONTACT
        update new Contact(
            Id = contactId,
            Profile_Image__c = publicUrl
        );

        // delete SF file
        delete [
            SELECT Id FROM ContentDocument
            WHERE Id = :cv.ContentDocumentId
        ];

    } catch (Exception e) {
        System.debug('❌ Agent upload failed: ' + e.getMessage());
    }
}

public static void uploadAboutPageImage(

    Id contentVersionId,
    Id aboutPageId,
    String imageType

) {

    try {

        /* =========================================
           FETCH FILE
        ========================================= */

        ContentVersion cv = [

            SELECT
                Id,
                Title,
                VersionData,
                FileExtension

            FROM ContentVersion

            WHERE Id = :contentVersionId

            LIMIT 1
        ];

        /* =========================================
           ACCESS TOKEN
        ========================================= */

        String accessToken =
            GoogleAuthService.getAccessToken();

        /* =========================================
           MIME TYPE
        ========================================= */

        String mimeType =
            getMimeType(cv.FileExtension);

        /* =========================================
           METADATA
        ========================================= */

        String metadata =
            '{"name":"' + cv.Title + '"}';

        /* =========================================
           MULTIPART BODY
        ========================================= */

        String boundary = 'about_boundary';

        String body =

            '--' + boundary + '\r\n' +

            'Content-Type: application/json\r\n\r\n' +

            metadata + '\r\n' +

            '--' + boundary + '\r\n' +

            'Content-Type: ' + mimeType + '\r\n' +

            'Content-Transfer-Encoding: base64\r\n\r\n' +

            EncodingUtil.base64Encode(
                cv.VersionData
            ) +

            '\r\n--' + boundary + '--';

        /* =========================================
           REQUEST
        ========================================= */

        HttpRequest req = new HttpRequest();

        req.setEndpoint(
            DRIVE_UPLOAD_URL
        );

        req.setMethod('POST');

        req.setHeader(
            'Authorization',
            'Bearer ' + accessToken
        );

        req.setHeader(
            'Content-Type',
            'multipart/related; boundary=' +
            boundary
        );

        req.setBody(body);

        req.setTimeout(120000);

        HttpResponse res =
            new Http().send(req);

        /* =========================================
           VALIDATE
        ========================================= */

        if (res.getStatusCode() != 200) {

            System.debug(
                'Upload Failed: ' +
                res.getBody()
            );

            return;
        }

        /* =========================================
           FILE ID
        ========================================= */

        Map<String,Object> uploadResult =

            (Map<String,Object>)
            JSON.deserializeUntyped(
                res.getBody()
            );

        String driveFileId =

            (String)
            uploadResult.get('id');

        /* =========================================
           MAKE FILE PUBLIC
        ========================================= */

        makeFilePublic(
            driveFileId,
            accessToken
        );

        /* =========================================
           PUBLIC URL
        ========================================= */

        String publicUrl =

            'https://drive.google.com/thumbnail?id=' +

            driveFileId +

            '&sz=w1200';

        /* =========================================
           UPDATE ABOUT PAGE
        ========================================= */

        About_Page_Content__c aboutPage = [

    SELECT
        Id,
        Hero_Car_Image__c,
        Hero_Background_Image__c,
        Team_Image_URL__c

    FROM About_Page_Content__c

    WHERE Id = :aboutPageId

    LIMIT 1
];

        if (imageType == 'HeroCar') {

            aboutPage.Hero_Car_Image__c =
                publicUrl;
                
        }

        else if (imageType == 'HeroBackground') {

            aboutPage.Hero_Background_Image__c =
                publicUrl;
        }

        else if (imageType == 'TeamImage') {

            aboutPage.Team_Image_URL__c =
                publicUrl;
                System.debug('PUBLIC URL => ' + publicUrl);
        }

        update aboutPage;

        System.debug(
            'About Page Image Uploaded'
        );
        
System.debug('IMAGE TYPE => ' + imageType);


System.debug(
    JSON.serializePretty(aboutPage)
);

    }
    catch (Exception e) {

        System.debug(
            'About Upload Error: ' +
            e.getMessage()
        );
    }
}
}
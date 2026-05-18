public without sharing class PropertyImageController {
    private static void ensurePropertyImageObjectAvailable() {
        if (!Schema.getGlobalDescribe().containsKey('Car_Image__c')) {
            throw new AuraHandledException(
                'Property image feature is not deployed in this org. Missing object: Car_Image__c.'
            );
        }
    }

    // ============================================================
    // STEP 1 — Placeholder Car_Image__c record banao
    // ============================================================
    @AuraEnabled
    public static Id createPlaceholderImage(Id propertyId) {
        Long t0 = System.now().getTime();
        System.debug(LoggingLevel.INFO, 'DC-ImgUpload createPlaceholderImage START propertyId=' + propertyId);
        try {
            ensurePropertyImageObjectAvailable();
            // Max 10 check
            // Cleanup orphaned failed records first to free up limits
            delete [
                SELECT Id FROM Car_Image__c
                WHERE Car__c = :propertyId
                  AND Upload_Status__c = 'Failed'
            ];

            Long tCount = System.now().getTime();
            Integer count = [
                SELECT COUNT() FROM Car_Image__c
                WHERE Car__c = :propertyId
            ];
            System.debug(LoggingLevel.INFO, 'DC-ImgUpload COUNT query ms=' + (System.now().getTime() - tCount) + ' count=' + count);

            if (count >= 15) {
                throw new AuraHandledException(
                    'Maximum 15 images allowed. Please delete an existing image first.'
                );
            }

            Car_Image__c img = new Car_Image__c();
            img.Car__c        = propertyId;
            img.Upload_Status__c   = 'Pending';
            img.Is_Public_Image__c = true;
            img.Is_Main_Image__c   = false;
            Long tIns = System.now().getTime();
            insert img;

            System.debug(LoggingLevel.INFO, 'DC-ImgUpload createPlaceholderImage DONE id=' + img.Id
                + ' insertMs=' + (System.now().getTime() - tIns)
                + ' totalMs=' + (System.now().getTime() - t0));
            return img.Id;

        } catch(AuraHandledException e) {
            throw e;
        } catch(Exception e) {
            System.debug('❌ ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ============================================================
    // STEP 2 — SF mein file save + @future Drive upload trigger
    // ============================================================
    @AuraEnabled
    public static void uploadImageToSalesforce(
        String base64Data,
        String fileName,
        Id     propertyImageId
    ) {
        Long t0 = System.now().getTime();
        System.debug(LoggingLevel.INFO, 'DC-ImgUpload uploadImageToSalesforce START t0=' + t0
            + ' file=' + fileName + ' propertyImageId=' + propertyImageId
            + ' base64Len=' + (base64Data == null ? 0 : base64Data.length()));

        try {
            ensurePropertyImageObjectAvailable();
            Id propertyId;
            if (propertyImageId != null) {
                Car_Image__c seed = [
                    SELECT Id, Car__c
                    FROM Car_Image__c
                    WHERE Id = :propertyImageId
                    LIMIT 1
                ];
                propertyId = seed.Car__c;
            }
            // ── Type validate ───────────────────────────────────
            String ext = fileName.substringAfterLast('.').toLowerCase();
            System.debug('👉 Extension: ' + ext);

            if (ext != 'jpg' && ext != 'jpeg' &&
                ext != 'png' && ext != 'webp' && ext != 'pdf' && ext != 'mp4') {
                throw new AuraHandledException(
                    'Invalid file type: ' + ext +
                    '. Sirf jpg, png, webp, pdf, mp4 allowed hai.'
                );
            }

            // ── Size validate ───────────────────────────────────
            Integer sizeKB = (base64Data.length() * 3 / 4) / 1024;
            System.debug('👉 Size (KB): ' + sizeKB);

            if (sizeKB > 10240) {
                throw new AuraHandledException(
                    'File bahut bada hai: ' + sizeKB +
                    ' KB. Max 10MB (10240 KB) allowed hai.'
                );
            }

            Long tBeforeDecode = System.now().getTime();
            Blob fileBlob = EncodingUtil.base64Decode(base64Data);
            System.debug(LoggingLevel.INFO, 'DC-ImgUpload base64Decode ms=' + (System.now().getTime() - tBeforeDecode)
                + ' blobSize=' + (fileBlob == null ? 0 : fileBlob.size()));

            // ── ContentVersion create ───────────────────────────
            ContentVersion cv = new ContentVersion();
            cv.Title          = fileName;
            cv.PathOnClient   = fileName;
            cv.VersionData    = fileBlob;
            cv.IsMajorVersion = true;
            
            // CRITICAL FIX: Attach the file to the record so Community Users have visibility
            cv.FirstPublishLocationId = propertyImageId;
            
            Long tBeforeCv = System.now().getTime();
            insert cv;
            System.debug(LoggingLevel.INFO, 'DC-ImgUpload ContentVersion insert ms=' + (System.now().getTime() - tBeforeCv)
                + ' cvId=' + cv.Id);

            String sfUrl = '/sfc/servlet.shepherd/version/download/' + cv.Id;

            // ── Car_Image__c → Uploading ───────────────────
            Car_Image__c img = new Car_Image__c();
            img.Id               = propertyImageId;
            img.Upload_Status__c = 'Uploading'; // Stay in Processing state for Google Drive future method
            img.Image_Size_KB__c = sizeKB;
            img.Image_Type__c    = ext;
            img.Image_Public_URL__c = sfUrl; // Temporary SF URL for immediate preview
            Long tBeforePi = System.now().getTime();
            update img;
            System.debug(LoggingLevel.INFO, 'DC-ImgUpload Car_Image__c update ms=' + (System.now().getTime() - tBeforePi));

            // Ensure property gets a cover image URL on first upload.
            if (propertyId != null) {
                Integer existingMainCount = [
                    SELECT COUNT()
                    FROM Car_Image__c
                    WHERE Car__c = :propertyId
                    AND Is_Main_Image__c = true
                ];
                if (existingMainCount == 0) {
                    update new Car_Image__c(
                        Id = propertyImageId,
                        Is_Main_Image__c = true
                    );
                    update new Car__c(
                        Id = propertyId,
                        Main_Image_URL__c = sfUrl
                    );
                } else {
                    Car__c p = [
                        SELECT Id, Main_Image_URL__c
                        FROM Car__c
                        WHERE Id = :propertyId
                        LIMIT 1
                    ];
                    if (String.isBlank(p.Main_Image_URL__c)) {
                        update new Car__c(
                            Id = propertyId,
                            Main_Image_URL__c = sfUrl
                        );
                    }
                }
            }

            // Google Drive upload is deferred until the user confirms Submit in the LWC
            // (finalizeMediaToGoogleDrive). Files stay in Salesforce as previews until then.

        } catch(AuraHandledException e) {
            throw e;
        } catch(Exception e) {
            System.debug('❌ ' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * Fallback uploader when Car_Image__c is not deployed/accessible.
     * Saves files directly against Car__c via FirstPublishLocationId.
     */
    @AuraEnabled
    public static void uploadFileDirectToProperty(
        String base64Data,
        String fileName,
        Id propertyId
    ) {
        if (propertyId == null) {
            throw new AuraHandledException('Property record is required for direct upload.');
        }
        if (String.isBlank(base64Data) || String.isBlank(fileName)) {
            throw new AuraHandledException('File data is required.');
        }
        try {
            String ext = fileName.substringAfterLast('.').toLowerCase();
            if (ext != 'jpg' && ext != 'jpeg' && ext != 'png' && ext != 'webp') {
                throw new AuraHandledException('Invalid file type: ' + ext + '. Allowed: jpg, jpeg, png, webp.');
            }
            Integer sizeKB = (base64Data.length() * 3 / 4) / 1024;
            if (sizeKB > 5120) {
                throw new AuraHandledException('File is too large. Max 5MB allowed.');
            }

            ContentVersion cv = new ContentVersion();
            cv.Title = fileName;
            cv.PathOnClient = fileName;
            cv.VersionData = EncodingUtil.base64Decode(base64Data);
            cv.IsMajorVersion = true;
            cv.FirstPublishLocationId = propertyId;
            insert cv;

            String sfUrl = '/sfc/servlet.shepherd/version/download/' + cv.Id;
            Car__c p = [
                SELECT Id, Main_Image_URL__c
                FROM Car__c
                WHERE Id = :propertyId
                LIMIT 1
            ];
            if (String.isBlank(p.Main_Image_URL__c)) {
                update new Car__c(
                    Id = propertyId,
                    Main_Image_URL__c = sfUrl
                );
            }
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ============================================================
    // STEP 3 — 3 Tabs ke liye images fetch (Public/Private/Main)
    // ============================================================
    @AuraEnabled(cacheable=true)
    public static Map<String, List<Car_Image__c>> getImagesByTab(Id propertyId) {
        Map<String, List<Car_Image__c>> tabs = new Map<String, List<Car_Image__c>>{
            'public'  => new List<Car_Image__c>(),
            'private' => new List<Car_Image__c>(),
            'main'    => new List<Car_Image__c>()
        };
        System.debug('🔥 getImagesByTab → ' + propertyId);

        // Fail-safe: when record context is not ready yet, return an empty payload.
        if (propertyId == null) {
            return tabs;
        }

        try {
            ensurePropertyImageObjectAvailable();

            List<Car_Image__c> allImages = [
                SELECT Id, Name,
                       Image_Public_URL__c,
                       Is_Main_Image__c,
                       Is_Public_Image__c,
                       Upload_Status__c,
                       Image_Type__c,
                       Image_Size_KB__c,
                       Uploaded_At__c,
                       Sort_Order__c,
                       SF_File_Deleted__c,
                       Google_Drive_File_ID__c
                FROM   Car_Image__c
                WHERE  Car__c       = :propertyId
                  AND  (Upload_Status__c = 'Uploaded' OR Upload_Status__c = 'Completed' OR Upload_Status__c = 'Uploading')
                  AND  Image_Public_URL__c != null
                ORDER BY Sort_Order__c ASC NULLS LAST, Is_Main_Image__c DESC, Uploaded_At__c ASC
            ];

            System.debug('👉 Total Uploaded Images: ' + allImages.size());

            for (Car_Image__c img : allImages) {
                if (img.Is_Main_Image__c)   tabs.get('main').add(img);
                if (img.Is_Public_Image__c) tabs.get('public').add(img);
                else                        tabs.get('private').add(img);
            }
        } catch (Exception e) {
            // Return empty lists instead of throwing so the LWC can stop loading gracefully.
            System.debug(LoggingLevel.ERROR, 'getImagesByTab failed: ' + e.getMessage());
        }

        return tabs;
    }

    // ============================================================
    // Upload Configuration (T-02 Dynamic Env Config)
    // ============================================================
    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getUploadConfig() {
        // Here you would query Custom Metadata e.g., [SELECT Max_Size_KB__c, Max_Files__c FROM Upload_Config__mdt LIMIT 1].
        // Falling back to standards to ensure compilation limits are respected dynamically.
        return new Map<String, Integer>{
            'maxFiles'  => 15,
            'maxSizeKB' => 10240
        };
    }

    // ============================================================
    // DB Assignment of File Owner (T-11 Persistence)
    // ============================================================
    @AuraEnabled
    public static void updateFileOwner(Id propertyImageId, String ownerType) {
        try {
            ensurePropertyImageObjectAvailable();
            // Use dynamic sobject assignment to prevent compile errors if File_Owner__c hasn't been created yet.
            SObject img = Schema.getGlobalDescribe().get('Car_Image__c').newSObject();
            img.put('Id', propertyImageId);
            img.put('File_Owner__c', ownerType);
            update img;
        } catch (System.SObjectException e) {
            throw new AuraHandledException('Database Field Missing: Kindly create the "File_Owner__c" picklist in Object Manager first.');
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ============================================================
    // AI Image Validation Stub (T-10 property-related check)
    // ============================================================
    @AuraEnabled
    public static Boolean validateImageWithAI(String base64Data) {
        // T-10 Technical Spike implementation
        // Real implementation would pass base64Data to Google Cloud Vision API / AWS Rekognition
        // and check label map for property schemas (Room, Home, Field, etc).
        // Returning true by default. To fail it arbitrarily for testing, uncomment the false branch.
        return true; 
    }

    // ============================================================
    // Update Image Sorting Order
    // ============================================================
    @AuraEnabled
    public static void updateImageOrder(List<Id> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) return;
        try {
            ensurePropertyImageObjectAvailable();
            List<Car_Image__c> updates = new List<Car_Image__c>();
            for (Integer i = 0; i < orderedIds.size(); i++) {
                updates.add(new Car_Image__c(
                    Id = orderedIds[i],
                    Sort_Order__c = i
                ));
            }
            update updates;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ============================================================
    // Main Image set karo
    // ============================================================
    @AuraEnabled
    public static void setMainImage(Id propertyImageId, Id propertyId) {
        System.debug('🔥 setMainImage → ' + propertyImageId);
        try {
            ensurePropertyImageObjectAvailable();
            // Pehle sab ka main = false
            List<Car_Image__c> all = [
                SELECT Id FROM Car_Image__c
                WHERE Car__c = :propertyId
            ];
            for(Car_Image__c i : all) i.Is_Main_Image__c = false;
            update all;

            // Selected = main true
            Car_Image__c main = new Car_Image__c(Id = propertyImageId);
            main.Is_Main_Image__c  = true;
            update main;

            // Property pe URL update karo
            Car_Image__c data = [
                SELECT Image_Public_URL__c
                FROM   Car_Image__c
                WHERE  Id = :propertyImageId
            ];
            update new Car__c(
                Id = propertyId,
                Main_Image_URL__c = data.Image_Public_URL__c
            );
            System.debug('✅ Main image + Property URL updated');

        } catch(Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ============================================================
    // Public/Private toggle
    // ============================================================
    @AuraEnabled
    public static void togglePublicImage(Id propertyImageId, Boolean isPublic) {
        System.debug('🔥 togglePublicImage → ' + isPublic);
        try {
            ensurePropertyImageObjectAvailable();
            update new Car_Image__c(
                Id             = propertyImageId,
                Is_Public_Image__c = isPublic
            );
            System.debug('✅ Toggle done');
        } catch(Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    // ============================================================
    // Image count (LWC max-limit check ke liye)
    // ============================================================
    @AuraEnabled(cacheable=true)
    public static Integer getImageCount(Id propertyId) {
        ensurePropertyImageObjectAvailable();
        return [
            SELECT COUNT() FROM Car_Image__c
            WHERE Car__c = :propertyId
              AND Upload_Status__c != 'Failed'
        ];
    }

    // ============================================================
    // Delete image
    // ============================================================
    @AuraEnabled
    public static void deletePropertyImage(Id propertyImageId) {
        ensurePropertyImageObjectAvailable();
        if (propertyImageId == null) {
            throw new AuraHandledException('Image id is required.');
        }
        try {
            Car_Image__c img = [
                SELECT Id, Car__c, Is_Main_Image__c
                FROM Car_Image__c
                WHERE Id = :propertyImageId
                LIMIT 1
            ];

            Id propertyId = img.Car__c;
            Boolean wasMain = img.Is_Main_Image__c;
            delete img;

            if (wasMain && propertyId != null) {
                update new Car__c(
                    Id = propertyId,
                    Main_Image_URL__c = null
                );
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * Files in the linked Google Drive folder (property or related account).
     */
    @AuraEnabled
    public static List<GoogleDriveDownloader.GoogleFile> getDriveFolderFilesForProperty(Id propertyId) {
        ensurePropertyImageObjectAvailable();
        String folderId = resolvePropertyDriveFolderId(propertyId);
        if (String.isBlank(folderId)) {
            throw new AuraHandledException(
                'No Google Drive folder is linked. Set Google_Drive_Folder_ID__c on the property or link an account that has Google_Drive_Folder_ID__c.'
            );
        }
        return GoogleDriveDownloader.getFilesFromFolder(folderId);
    }

    private static String resolvePropertyDriveFolderId(Id propertyId) {
        if (propertyId == null) {
            return null;
        }
        if (!Schema.getGlobalDescribe().containsKey('Car__c')) {
            return null;
        }

        Map<String, Schema.SObjectField> fm = Schema.SObjectType.Car__c.fields.getMap();
        List<String> fields = new List<String>{ 'Id' };
        if (fm.containsKey('google_drive_folder_id__c')) {
            fields.add('Google_Drive_Folder_ID__c');
        }

        String accountFieldApi;
        List<String> accountLookupCandidates = new List<String>{
            'accountid',
            'account__c',
            'broker__c',
            'listing_account__c',
            'seller_account__c'
        };
        for (String token : accountLookupCandidates) {
            if (fm.containsKey(token)) {
                accountFieldApi = fm.get(token).getDescribe().getName();
                fields.add(accountFieldApi);
                break;
            }
        }

        String soql = 'SELECT ' + String.join(fields, ', ') + ' FROM Car__c WHERE Id = :propertyId LIMIT 1';
        List<SObject> rows = Database.query(soql);
        if (rows.isEmpty()) {
            return null;
        }
        SObject prop = rows[0];

        if (fm.containsKey('google_drive_folder_id__c')) {
            String direct = (String) prop.get('Google_Drive_Folder_ID__c');
            if (String.isNotBlank(direct)) {
                return direct;
            }
        }

        if (accountFieldApi != null) {
            Id accId = (Id) prop.get(accountFieldApi);
            if (accId != null) {
                List<Account> accRows = [
                    SELECT Google_Drive_Folder_ID__c
                    FROM Account
                    WHERE Id = :accId
                    LIMIT 1
                ];
                if (!accRows.isEmpty()) {
                    return accRows[0].Google_Drive_Folder_ID__c;
                }
            }
        }
        return null;
    }

    /**
     * Link an existing Drive file to this property (already stored in Drive; no duplicate upload).
     */
    @AuraEnabled
    public static Id importDriveFileToProperty(Id propertyId, String driveFileId, String fileName, String mimeType) {
        ensurePropertyImageObjectAvailable();
        if (propertyId == null || String.isBlank(driveFileId) || String.isBlank(fileName)) {
            throw new AuraHandledException('Property, Drive file id, and file name are required.');
        }

        String ext = fileName.substringAfterLast('.').toLowerCase();
        if (String.isBlank(ext)) {
            ext = guessExtFromMime(mimeType);
        }
        if (ext != 'jpg' && ext != 'jpeg' && ext != 'png' && ext != 'webp' && ext != 'pdf' && ext != 'mp4') {
            throw new AuraHandledException('Unsupported type. Allowed: jpg, png, webp, pdf, mp4.');
        }

        Id placeholderId = createPlaceholderImage(propertyId);
        String thumbUrl = 'https://drive.google.com/thumbnail?id=' + driveFileId + '&sz=w800';

        update new Car_Image__c(
            Id                     = placeholderId,
            Upload_Status__c       = 'Uploaded',
            Image_Public_URL__c    = thumbUrl,
            Google_Drive_File_ID__c = driveFileId,
            Image_Type__c          = ext,
            Is_Public_Image__c     = true,
            Uploaded_At__c         = System.now()
        );
        return placeholderId;
    }

    private static String guessExtFromMime(String mt) {
        if (String.isBlank(mt)) {
            return '';
        }
        if (mt.startsWith('image/jpeg')) {
            return 'jpg';
        }
        if (mt.startsWith('image/png')) {
            return 'png';
        }
        if (mt.startsWith('image/webp')) {
            return 'webp';
        }
        if (mt.startsWith('video/')) {
            return 'mp4';
        }
        if (mt.contains('pdf')) {
            return 'pdf';
        }
        return '';
    }

    /**
     * Deletes staged media not selected, then enqueues Google Drive upload for selected rows
     * that still have binary content in Salesforce (no Drive file id yet).
     */
    @AuraEnabled
    public static void finalizeMediaToGoogleDrive(Id propertyId, List<Id> selectedImageIds) {
        ensurePropertyImageObjectAvailable();
        if (propertyId == null) {
            throw new AuraHandledException('Property is required.');
        }
        if (selectedImageIds == null || selectedImageIds.isEmpty()) {
            throw new AuraHandledException('Select at least one media item to finalize to Google Drive.');
        }

        Integer foreignIds = [
            SELECT COUNT()    
            FROM Car_Image__c
            WHERE Id IN :selectedImageIds AND Car__c != :propertyId
        ];
        if (foreignIds > 0) {
            throw new AuraHandledException('Invalid media selection for this property.');
        }

        List<Car_Image__c> unstaged = [
            SELECT Id
            FROM Car_Image__c
            WHERE Car__c = :propertyId
            AND Id NOT IN :selectedImageIds
        ];

        for (Car_Image__c row : unstaged) {
            for (ContentVersion cv : [
                SELECT ContentDocumentId
                FROM ContentVersion
                WHERE FirstPublishLocationId = :row.Id
            ]) {
                if (cv.ContentDocumentId != null) {
                    try {
                        delete new ContentDocument(Id = cv.ContentDocumentId);
                    } catch (Exception e) {
                        System.debug('ContentDocument delete skipped: ' + e.getMessage());
                    }
                }
            }
        }
        delete unstaged;

        for (Id imgId : selectedImageIds) {
            List<Car_Image__c> selectedRows = [
                SELECT Id, Google_Drive_File_ID__c
                FROM Car_Image__c
                WHERE Id = :imgId
                LIMIT 1
            ];
            if (selectedRows.isEmpty()) {
                continue;
            }
            Car_Image__c row = selectedRows[0];
            if (String.isNotBlank(row.Google_Drive_File_ID__c)) {
                continue;
            }

            List<ContentVersion> cvs = [
                SELECT Id
                FROM ContentVersion
                WHERE FirstPublishLocationId = :imgId
                ORDER BY CreatedDate DESC
                LIMIT 1
            ];
            if (cvs.isEmpty()) {
                continue;
            }
            try {
                GoogleDriveUploadService.uploadToDrive(cvs[0].Id, imgId);
            } catch (Exception e) {
                System.debug('finalizeMediaToGoogleDrive enqueue failed: ' + e.getMessage());
            }
        }
    }

    @AuraEnabled
public static void uploadAgentImageToDrive(String base64Data, String fileName, Id contactId) {

    // 1. Convert base64 → Blob
    Blob fileBlob = EncodingUtil.base64Decode(base64Data);

    // 2. Save temp file in Salesforce
    ContentVersion cv = new ContentVersion();
    cv.Title = fileName;
    cv.PathOnClient = fileName;
    cv.VersionData = fileBlob;
    cv.IsMajorVersion = true;
    cv.FirstPublishLocationId = contactId;
    insert cv;

    // 3. Upload to Google Drive (reuse your service)
    GoogleDriveUploadService.uploadAgentToDrive(cv.Id, contactId);
}
public static String uploadSingleFile(Id contentVersionId) {

    // Upload to Google Drive
    // (reuse your existing logic)

    String fileId = 'generated_drive_file_id';

    return 'https://drive.google.com/uc?export=view&id=' + fileId;
}
@AuraEnabled(cacheable=true)
public static String getAgentImage(Id contactId) {
    return [
        SELECT Profile_Image__c
        FROM Contact
        WHERE Id = :contactId
    ].Profile_Image__c;
}
}
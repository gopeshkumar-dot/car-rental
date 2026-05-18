import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent }       from 'lightning/platformShowToastEvent';
import { refreshApex }          from '@salesforce/apex';
import createPlaceholderImage   from '@salesforce/apex/PropertyImageController.createPlaceholderImage';
import uploadImageToSalesforce  from '@salesforce/apex/PropertyImageController.uploadImageToSalesforce';
import uploadFileDirectToProperty from '@salesforce/apex/PropertyImageController.uploadFileDirectToProperty';
import getImagesByTab           from '@salesforce/apex/PropertyImageController.getImagesByTab';
import togglePublicImage        from '@salesforce/apex/PropertyImageController.togglePublicImage';
import deletePropertyImage      from '@salesforce/apex/PropertyImageController.deletePropertyImage';
// Note: setMainImage is called when the grid array is sorted so the first item gets marked as main.
import setMainImage             from '@salesforce/apex/PropertyImageController.setMainImage';
import updateImageOrder         from '@salesforce/apex/PropertyImageController.updateImageOrder';
import getUploadConfig          from '@salesforce/apex/PropertyImageController.getUploadConfig';
import updateFileOwner          from '@salesforce/apex/PropertyImageController.updateFileOwner';
import validateImageWithAI      from '@salesforce/apex/PropertyImageController.validateImageWithAI';
import getDriveFolderFilesForProperty from '@salesforce/apex/PropertyImageController.getDriveFolderFilesForProperty';
import importDriveFileToProperty from '@salesforce/apex/PropertyImageController.importDriveFileToProperty';
import finalizeMediaToGoogleDrive from '@salesforce/apex/PropertyImageController.finalizeMediaToGoogleDrive';

const LOG_PREFIX = '[DC-ImgUpload]';

export default class PropertyImageUploader extends LightningElement {

    _recordId;
    loadingGuardTimer;

    @api
    get recordId() {
        return this._recordId;
    }
    set recordId(value) {
        this._recordId = value;
        this.scheduleLoadingGuard();
    }

    // ── State ────────────────────────────────────────────────────
    @track selectedFiles     = [];
    @track selectedFilesInfo = [];
    @track isUploading       = false;
    @track isRefreshingGrid  = false;
    @track isLoading         = true;
    @track imageCount        = 0;
    
    @track allImages         = [];
    @track removedFilesMessage = null;

    // T-02 Configurations (loaded dynamically from wire with fallbacks)
    maxFilesAllowed = 15;
    maxSizeBytes    = 10 * 1024 * 1024; // 10MB

    // Drag and Drop state
    dragSourceIndex = null;

    // Local object URLs for fast optimistic UI
    tempUrls = {};
    optimisticMeta = {};
    localOrderOverride = null; // will store ordered Ids
    localOwnerOverrides = {};  // map of ID -> Owner Type
    
    wiredImagesResult;

    connectedCallback() {
        this.scheduleLoadingGuard();
    }

    disconnectedCallback() {
        if (this.loadingGuardTimer) {
            clearTimeout(this.loadingGuardTimer);
            this.loadingGuardTimer = null;
        }
    }

    scheduleLoadingGuard() {
        if (this.loadingGuardTimer) {
            clearTimeout(this.loadingGuardTimer);
            this.loadingGuardTimer = null;
        }

        // If parent hasn't created/bound record yet, don't keep endless loader.
        if (!this.recordId) {
            this.isLoading = false;
            return;
        }

        // Safety net: if wire never returns due to transient issue, stop spinner.
        this.isLoading = true;
        this.loadingGuardTimer = setTimeout(() => {
            if (this.isLoading) {
                this.isLoading = false;
                console.warn(LOG_PREFIX, 'Loading guard released spinner for propertyId', this.recordId);
            }
        }, 12000);
    }

    // ── Getters ──────────────────────────────────────────────────
    get isMaxReached()      { return this.imageCount >= this.maxFilesAllowed; }
    get slotsLeft()         { return Math.max(0, this.maxFilesAllowed - this.imageCount); }
    get uploadBtnDisabled() { return this.isUploading || this.selectedFiles.length === 0; }
    get hasSelectedFiles()  { return this.selectedFilesInfo && this.selectedFilesInfo.length > 0; }
    get driveImportDisabled() { return this.isUploading || this.isMaxReached; }
    get computerButtonClass() {
        const base = 'computer-upload-btn';
        if (this.slotsLeft > 0 && !this.isUploading) {
            return `${base} computer-upload-btn--ready`;
        }
        return base;
    }
    get driveButtonClass() {
        const base = 'drive-import-btn';
        if (this.driveModalOpen) {
            return `${base} drive-import-btn--open`;
        }
        if (!this.driveImportDisabled) {
            return `${base} drive-import-btn--active`;
        }
        return base;
    }
    get submitButtonClass() {
        if (
            this.isFinalizing ||
            this.imageCount === 0 ||
            this.isUploading ||
            this.hasPendingWork ||
            !this.hasFinalizeSelection
        ) {
            return 'styled-submit-btn styled-submit-btn--idle';
        }
        return 'styled-submit-btn styled-submit-btn--ready';
    }
    get hasPendingWork() {
        return this.allImages.some((i) => i.isProcessing);
    }
    get hasFinalizeSelection() {
        return this.allImages.some((i) => this.isIncludedInSubmission(i.Id));
    }
    get selectedForSubmitCount() {
        return this.allImages.filter((i) => this.isIncludedInSubmission(i.Id)).length;
    }
    get submitDisabled() {
        return (
            this.imageCount === 0 ||
            this.isUploading ||
            this.hasPendingWork ||
            !this.hasFinalizeSelection ||
            this.isFinalizing
        );
    }
    get hasRecordContext() {
        return Boolean(this.recordId);
    }

    get maxSizeMB() {
        return Math.round(this.maxSizeBytes / 1024 / 1024);
    }

    get progressBarStyle() {
        let pct = 0;
        if (this.maxFilesAllowed > 0) {
            pct = (this.imageCount / this.maxFilesAllowed) * 100;
        }
        return `width: ${pct}%;`;
    }

    triggerFileInput() {
        const fileInput = this.template.querySelector('input[type="file"]');
        if (fileInput) fileInput.click();
    }

    // ── Wire Configuration (T-02) ──────────────────────────────
    @wire(getUploadConfig)
    wiredConfig({ error, data }) {
        if (data) {
            this.maxFilesAllowed = data.maxFiles || 15;
            this.maxSizeBytes = (data.maxSizeKB || 10240) * 1024;
        } else if (error) {
            console.error('Failed to load upload config', error);
        }
    }

    // ── File Select ──────────────────────────────────────────────
    handleFileChange(event) {
        this.removedFilesMessage = null;
        
        const files = Array.from(event.target.files);
        if (!files.length) return;

        let validFiles = [];
        let infoList = [];

        // Validation limits
        const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'mp4'];
        
        for (let file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!allowedExts.includes(ext)) {
                this.showToast('Invalid File Type', `"${file.name}" is not allowed.`, 'error');
                continue;
            }
            if (file.size > this.maxSizeBytes) {
                this.showToast('File Too Large', `"${file.name}" exceeds ${this.maxSizeMB}MB limit.`, 'error');
                continue;
            }
            validFiles.push(file);
            infoList.push({ name: file.name, sizeKB: Math.round(file.size / 1024) });
        }

        // Limit to max count check
        if (this.imageCount + validFiles.length > this.maxFilesAllowed) {
            const allowed = this.maxFilesAllowed - this.imageCount;
            if (allowed <= 0) {
                this.showToast('Limit Exceeded', `Maximum ${this.maxFilesAllowed} items allowed.`, 'error');
                event.target.value = '';
                this.selectedFiles = [];
                this.selectedFilesInfo = [];
                return;
            }
            // Truncate and record removed files
            const removedFiles = validFiles.slice(allowed).map(f => f.name);
            validFiles = validFiles.slice(0, allowed);
            infoList = infoList.slice(0, allowed);
            
            this.removedFilesMessage = `${removedFiles.length} items removed (limit is ${this.maxFilesAllowed}): ${removedFiles.join(', ')}`;
        }

        this.selectedFiles = validFiles;
        this.selectedFilesInfo = infoList;

        if (validFiles.length > 0) {
            this.handleUpload();
        }
    }

    // ── Wire & Data Prep ─────────────────────────────────────────
    @wire(getImagesByTab, { propertyId: '$recordId' })
    wiredImages(result) {
        this.wiredImagesResult = result;
        if (result.data) {
            if (this.loadingGuardTimer) {
                clearTimeout(this.loadingGuardTimer);
                this.loadingGuardTimer = null;
            }
            this.rebuildListsWithOptimistic();
            this.isLoading = false;
        }
        if (result.error) {
            if (this.loadingGuardTimer) {
                clearTimeout(this.loadingGuardTimer);
                this.loadingGuardTimer = null;
            }
            console.error(LOG_PREFIX, 'getImagesByTab error', result.error);
            this.isLoading = false;
        }
    }

    rebuildListsWithOptimistic() {
        const result = this.wiredImagesResult;
        let flattenedServerImages = [];
        
        if (result && result.data) {
            // Flatten the 3 arrays into one
            flattenedServerImages = [
                ...(result.data['main'] || []),
                ...(result.data['public'] || []),
                ...(result.data['private'] || [])
            ];
        }

        const merged = this.mergeOptimisticImages(flattenedServerImages);
        
        // Re-apply local drag ordering if overridden
        if (this.localOrderOverride && this.localOrderOverride.length > 0) {
            const ordered = [];
            const idMap = new Map();
            merged.forEach(i => idMap.set(i.Id, i));
            
            // push in order
            this.localOrderOverride.forEach(id => {
                if(idMap.has(id)) {
                    ordered.push(idMap.get(id));
                    idMap.delete(id);
                }
            });
            // append any new items not in local order
            idMap.forEach(i => ordered.push(i));
            this.allImages = this.mapImages(ordered);
            // Update local override to the new precise valid order
            this.localOrderOverride = this.allImages.map(i => i.Id);
        } else {
            this.allImages = this.mapImages(merged);
            // Initialize local order
            this.localOrderOverride = this.allImages.map(i => i.Id);
        }

        this.revokeStaleTempUrls();
        this.recalculateImageCount();
        this.ensureSubmissionDefaults();
    }

    mergeOptimisticImages(serverImages) {
        const serverIds = new Set(serverImages.map(i => i.Id));
        const pending = [];
        
        Object.keys(this.tempUrls).forEach((id) => {
            if (serverIds.has(id)) return;
            
            const url = this.tempUrls[id];
            const meta = this.optimisticMeta[id] || {};
            pending.push({
                Id: id,
                Name: meta.name || 'Saving…',
                Image_Public_URL__c: null,
                Is_Public_Image__c: true,
                Image_Type__c: meta.ext,
                Upload_Status__c: 'Uploading',
                Google_Drive_File_ID__c: null,
                _tempUrl: url
            });
        });
        
        return [...serverImages, ...pending];
    }

    mapImages(images) {
        if (!images) return [];
        return images
            .filter(img => {
                const displayUrl = img.Image_Public_URL__c || img._tempUrl || this.tempUrls[img.Id];
                const statusBusy =
                    img.Upload_Status__c === 'Pending' || img.Upload_Status__c === 'Uploading';
                // Staged SF files stay "Uploading" until Drive sync on submit — show preview, not spinner.
                return !(statusBusy && !displayUrl);
            })
            .map((img, index) => {
                const displayUrl = img.Image_Public_URL__c || img._tempUrl || this.tempUrls[img.Id];
                const statusBusy =
                    img.Upload_Status__c === 'Pending' || img.Upload_Status__c === 'Uploading';
                const isProcessing = statusBusy && !displayUrl;
                
                const isVideo = img.Image_Type__c === 'mp4';
                const isPdf = img.Image_Type__c === 'pdf';
                const isCover = (index === 0);
                
                const showAsPublic = img.Is_Public_Image__c;
                
                const ownerValue = this.localOwnerOverrides[img.Id] || img.File_Owner__c || 'Agent';

                // Force browser to fetch the first frame for video thumbnails by appending time tracking
                const previewVideoUrl = isVideo && displayUrl && !displayUrl.includes('#') 
                                        ? displayUrl + '#t=0.001' 
                                        : displayUrl;

                const onDrive = Boolean(img.Google_Drive_File_ID__c);
                const needsDriveSync =
                    !onDrive &&
                    displayUrl &&
                    typeof displayUrl === 'string' &&
                    displayUrl.indexOf('/sfc/') !== -1;

                return {
                    ...img,
                    displayUrl,
                    previewVideoUrl,
                    isProcessing,
                    showAsPublic,
                    isVideo,
                    isPdf,
                    isCover,
                    onDrive,
                    needsDriveSync,
                    driveStatusLabel: onDrive ? 'On Google Drive' : needsDriveSync ? 'Pending sync' : '',
                    includeInSubmit: this.isIncludedInSubmission(img.Id),
                    
                    privacyBadgeClass: showAsPublic ? 'green-text' : 'red-text',
                    privacyLabel: showAsPublic ? 'Public' : 'Private',
                    lockIcon: showAsPublic ? 'utility:unlock' : 'utility:lock',
                    lockClass: showAsPublic ? 'icon-green-bg' : 'icon-red-bg',
                    
                    roleLabel: isCover ? 'Cover' : ownerValue,
                    
                    cardClasses: `image-card ${isProcessing ? 'processing-state' : ''}`,
                    isOwnerAgent: ownerValue === 'Agent',
                    isOwnerOwner: ownerValue === 'Owner',
                    isOwnerClient: ownerValue === 'Client'
                };
            });
    }

    revokeStaleTempUrls() {
        const doneIds = new Set();
        this.allImages.forEach((img) => {
            if (img.Image_Public_URL__c && img.Id && !img.isProcessing) {
                doneIds.add(img.Id);
            }
        });
        Object.keys(this.tempUrls).forEach((id) => {
            if (doneIds.has(id)) {
                URL.revokeObjectURL(this.tempUrls[id]);
                delete this.tempUrls[id];
                delete this.optimisticMeta[id];
            }
        });
    }

    // ── File Upload ─────────────────────────────────────────────
    async handleUpload() {
        if (!this.recordId) {
            this.showToast('Record not ready', 'Please save property details first, then upload media.', 'warning');
            return;
        }
        if (!this.selectedFiles || this.selectedFiles.length === 0) return;

        this.isUploading = true;
        const filesToUpload = [...this.selectedFiles];
        this.selectedFiles = [];
        this.selectedFilesInfo = [];
        const fileInput = this.template.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';
        
        this.removedFilesMessage = null;
        this.showToast('Uploading', 'Files are being processed...', 'info');

        for (const file of filesToUpload) {
            let placeholderId;
            try {
                placeholderId = await createPlaceholderImage({ propertyId: this.recordId });

                const objectUrl = URL.createObjectURL(file);
                const ext = file.name.split('.').pop().toLowerCase();
                
                this.tempUrls[placeholderId] = objectUrl;
                this.optimisticMeta[placeholderId] = { name: file.name, ext: ext };
                
                if(this.localOrderOverride) {
                    this.localOrderOverride.push(placeholderId);
                }
                this.rebuildListsWithOptimistic();

                const base64 = await this.toBase64(file);
                
                // T-10 AI Image Validation Check
                const isPropertyRelated = await validateImageWithAI({ base64Data: base64.substring(0, 500) });
                if (!isPropertyRelated) {
                     this._removeOptimisticImage(placeholderId);
                     this.showToast('AI Validation Failed', 'Please upload a valid property-related image.', 'error');
                     continue;
                }

                await uploadImageToSalesforce({
                    base64Data: base64,
                    fileName: file.name,
                    propertyImageId: placeholderId
                });
                
            } catch (e) {
                console.error(LOG_PREFIX, 'Upload iteration failed', e);
                const msg = e.body?.message || e.message;
                if(msg && (msg.includes('Property image feature is not deployed') || msg.includes('Property_Image__c\' is not supported'))) {
                   await this.uploadUsingDirectFallback(file);
                } else {
                   this._removeOptimisticImage(placeholderId);
                   this.showToast('Upload Failed', `Failed to upload ${file.name}: ${msg}`, 'error');
                }
            }
        }
        
        this.isUploading = false;
        this.showToast('Saved', 'Upload initiated for all files.', 'success');
        this.isRefreshingGrid = true;
        try {
            await this.pollForImagesAsync();
        } finally {
            this.isRefreshingGrid = false;
        }
    }

    async pollForImagesAsync() {
        for (let attempt = 0; attempt < 30; attempt++) {
            await refreshApex(this.wiredImagesResult);
            if (Object.keys(this.tempUrls).length === 0) break;
            await new Promise(r => setTimeout(r, attempt < 5 ? 500 : 1500));
        }
    }

    async uploadUsingDirectFallback(file) {
        try {
            const base64 = await this.toBase64(file);
            await uploadFileDirectToProperty({
                base64Data: base64,
                fileName: file.name,
                propertyId: this.recordId
            });
            await refreshApex(this.wiredImagesResult);
        } catch (e) {
            this.showToast('Fallback Failed', e.body?.message || e.message, 'error');
        }
    }

    _removeOptimisticImage(id) {
        if (!id) return;
        if (this.tempUrls[id]) URL.revokeObjectURL(this.tempUrls[id]);
        delete this.tempUrls[id];
        delete this.optimisticMeta[id];
        if (this.localOrderOverride) {
            this.localOrderOverride = this.localOrderOverride.filter(oid => oid !== id);
        }
        this.rebuildListsWithOptimistic();
    }

    @track submissionIncluded = {};
    @track driveModalOpen = false;
    @track driveFiles = [];
    @track driveLoading = false;
    @track driveImporting = false;
    @track showFinalizeModal = false;
    @track isFinalizing = false;

    isIncludedInSubmission(imageId) {
        if (!imageId) return true;
        if (Object.prototype.hasOwnProperty.call(this.submissionIncluded, imageId)) {
            return this.submissionIncluded[imageId] !== false;
        }
        return true;
    }

    ensureSubmissionDefaults() {
        const next = { ...this.submissionIncluded };
        let changed = false;
        this.allImages.forEach((img) => {
            if (img.Id && !Object.prototype.hasOwnProperty.call(next, img.Id)) {
                next[img.Id] = true;
                changed = true;
            }
        });
        if (changed) {
            this.submissionIncluded = next;
        }
    }

    toggleSubmissionIncluded(event) {
        const id = event.target.dataset.id;
        if (!id) return;
        const checked = event.target.checked;
        this.submissionIncluded = { ...this.submissionIncluded, [id]: checked };
        this.allImages = this.allImages.map((row) =>
            row.Id === id ? { ...row, includeInSubmit: checked } : row
        );
    }

    // ── Feature Actions ──────────────────────────────────────────
    @track showDeleteModal = false;
    @track isDeleting = false;
    imageToDelete = null;

    handleDeleteImage(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this.imageToDelete = id;
        this.showDeleteModal = true;
    }

    closeDeleteModal() {
        if (this.isDeleting) {
            return;
        }
        this.showDeleteModal = false;
        this.imageToDelete = null;
    }

    async confirmDelete() {
        const id = this.imageToDelete;
        if (!id) return;

        this.isDeleting = true;
        try {
            await deletePropertyImage({ propertyImageId: id });

            if (this.localOrderOverride) {
                this.localOrderOverride = this.localOrderOverride.filter((oid) => oid !== id);
            }
            const rest = { ...this.submissionIncluded };
            delete rest[id];
            this.submissionIncluded = rest;
            this.showToast('Deleted', 'File removed successfully.', 'success');
            this.showDeleteModal = false;
            this.imageToDelete = null;
            await refreshApex(this.wiredImagesResult);
        } catch (e) {
            this.showToast('Delete Failed', e.body?.message || e.message, 'error');
        } finally {
            this.isDeleting = false;
        }
    }

    async openDriveModal() {
        if (this.driveImportDisabled) return;
        this.driveModalOpen = true;
        this.driveLoading = true;
        this.driveFiles = [];
        try {
            const rows = await getDriveFolderFilesForProperty({ propertyId: this.recordId });
            this.driveFiles = (rows || []).map((f) => ({
                ...f,
                picked: false,
                isGoogleDoc: f.mimeType && f.mimeType.indexOf('application/vnd.google-apps') === 0
            }));
        } catch (e) {
            this.showToast('Google Drive', e.body?.message || e.message, 'error');
            this.driveModalOpen = false;
        } finally {
            this.driveLoading = false;
        }
    }

    closeDriveModal() {
        this.driveModalOpen = false;
    }

    toggleDrivePick(event) {
        const id = event.target.dataset.id;
        if (!id) return;
        const checked = event.target.checked;
        this.driveFiles = this.driveFiles.map((r) =>
            r.id === id ? { ...r, picked: checked } : r
        );
    }

    async importSelectedFromDrive() {
        const picks = this.driveFiles.filter((r) => r.picked && !r.isGoogleDoc).map((r) => r.id);
        if (!picks.length) {
            this.showToast('Drive import', 'Select one or more files from the list.', 'info');
            return;
        }
        const remaining = this.maxFilesAllowed - this.imageCount;
        if (remaining <= 0) {
            this.showToast('Limit', `Maximum ${this.maxFilesAllowed} items allowed.`, 'error');
            return;
        }

        this.driveImporting = true;
        let imported = 0;
        try {
            for (const fileId of picks) {
                if (imported >= remaining) break;
                const row = this.driveFiles.find((r) => r.id === fileId);
                if (!row || row.isGoogleDoc) {
                    continue;
                }
                await importDriveFileToProperty({
                    propertyId: this.recordId,
                    driveFileId: row.id,
                    fileName: row.name,
                    mimeType: row.mimeType || ''
                });
                imported += 1;
            }
            if (imported === 0) {
                this.showToast(
                    'Drive import',
                    'No supported files selected (Google Docs/Sheets must be exported as PDF or image first).',
                    'warning'
                );
                return;
            }
            this.showToast('Imported', `${imported} file(s) added from Google Drive.`, 'success');
            this.closeDriveModal();
            await refreshApex(this.wiredImagesResult);
        } catch (e) {
            this.showToast('Import failed', e.body?.message || e.message, 'error');
        } finally {
            this.driveImporting = false;
        }
    }

    closeFinalizeModal() {
        this.showFinalizeModal = false;
    }

    async confirmFinalizeToDrive() {
        const selectedIds = this.allImages
            .filter((i) => this.isIncludedInSubmission(i.Id))
            .map((i) => i.Id)
            .filter((id) => id && String(id).length >= 15);

        if (selectedIds.length === 0) {
            this.showToast('Nothing selected', 'Choose files to finalize to Google Drive.', 'warning');
            return;
        }

        this.isFinalizing = true;
        try {
            await finalizeMediaToGoogleDrive({
                propertyId: this.recordId,
                selectedImageIds: selectedIds
            });
            this.showFinalizeModal = false;
            this.showToast(
                'Submitted',
                'Selected media is being finalized to Google Drive. Sync may take a moment.',
                'success'
            );
            this.dispatchEvent(
                new CustomEvent('submitmedia', { detail: { count: selectedIds.length } })
            );
            this.isRefreshingGrid = true;
            try {
                await refreshApex(this.wiredImagesResult);
                await this.pollForImagesAsync();
            } finally {
                this.isRefreshingGrid = false;
            }
        } catch (e) {
            this.showToast('Finalize failed', e.body?.message || e.message, 'error');
        } finally {
            this.isFinalizing = false;
        }
    }

    async handleTogglePrivacy(event) {
        const id = event.currentTarget.dataset.id;
        const currentPublic = event.currentTarget.dataset.public === 'true';
        const newPublic = !currentPublic;
        
        try {
            await togglePublicImage({ propertyImageId: id, isPublic: newPublic });
            await refreshApex(this.wiredImagesResult);
        } catch(e) {
            this.showToast('Privacy Update Failed', e.body?.message, 'error');
        }
    }

    handleOwnerChange(event) {
        const id = event.currentTarget.dataset.id;
        const newOwner = event.target.value;
        this.localOwnerOverrides[id] = newOwner;
        
        // Push DB persistence (T-11)
        if (id && id.length >= 15 && !id.startsWith('blob:')) {
            updateFileOwner({ propertyImageId: id, ownerType: newOwner })
                .catch(e => {
                    this.showToast('Field Info', e.body?.message || e.message, 'info');
                });
        }
        
        this.rebuildListsWithOptimistic();
    }

    handleSubmit() {
        if (this.imageCount === 0) {
            this.showToast('Hold Up', 'Please upload at least one image before submitting.', 'warning');
            return;
        }
        if (!this.hasFinalizeSelection) {
            this.showToast(
                'Selection required',
                'Select at least one file (checkbox) to include in final submission.',
                'warning'
            );
            return;
        }
        this.showFinalizeModal = true;
    }

    // ── Drag & Drop ──────────────────────────────────────────────
    handleDragStart(event) {
        event.target.classList.add('dragging');
        this.dragSourceIndex = parseInt(event.currentTarget.dataset.index, 10);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', this.dragSourceIndex);
    }
    
    handleDragEnter(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }
    
    handleDragEnd(event) {
        event.target.classList.remove('dragging');
        const cards = this.template.querySelectorAll('.image-card');
        cards.forEach(c => c.classList.remove('drag-over'));
    }

    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        event.currentTarget.classList.remove('drag-over');
        const targetIndex = parseInt(event.currentTarget.dataset.index, 10);
        const sourceIndex = this.dragSourceIndex;

        if (sourceIndex === targetIndex || sourceIndex === null || isNaN(targetIndex)) {
            return;
        }

        let copied = [...this.allImages];
        const [movedItem] = copied.splice(sourceIndex, 1);
        copied.splice(targetIndex, 0, movedItem);

        this.localOrderOverride = copied.map(i => i.Id);
        
        this.allImages = this.mapImages(copied);

        // Sync new Sort_Order__c to the backend
        const savedIds = this.localOrderOverride.filter(id => id && id.length >= 15 && !id.startsWith('blob:'));
        if (savedIds.length > 0) {
            updateImageOrder({ orderedIds: savedIds })
                .catch(e => console.error('Failed to sync sort order to backend', e));
        }

        const newFirstId = this.allImages[0]?.Id;
        if (newFirstId && savedIds.includes(newFirstId)) {
            setMainImage({ propertyImageId: newFirstId, propertyId: this.recordId })
                .then(() => refreshApex(this.wiredImagesResult))
                .catch(e => console.error('Silent fail setting new Main Image', e));
        }
    }
    
    handleGridDragOver(event) {
        event.preventDefault();
    }
    handleGridDrop(event) {
        event.preventDefault();
        const cards = this.template.querySelectorAll('.image-card');
        cards.forEach(c => c.classList.remove('drag-over'));
    }

    // ── Utilities ────────────────────────────────────────────────
    handleImgError(event) {
        event.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"%3E%3Crect fill="%23f3f4f6" width="200" height="150"/%3E%3Ctext fill="%236b7280" font-family="sans-serif" font-size="12" dy="4" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Available%3C/text%3E%3C/svg%3E';
    }

    toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result.split(',')[1]);
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsDataURL(file);
        });
    }

    recalculateImageCount() {
        this.imageCount = this.allImages.length;
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
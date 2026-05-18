import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';

const FIELDS = [
    'User.Name',
    'User.Email',
    'User.Profile.Name' // Profile field or any other custom status field
];

export default class ProfileDisplay extends LightningElement {
    userId = USER_ID;
    userName;
    userStatus;
    userAvatar;

    @wire(getRecord, { recordId: USER_ID, fields: FIELDS })
    wiredUser({ error, data }) {
        if (data) {
            this.userName = data.fields.Name.value;
            this.userStatus = data.fields.Profile.displayValue; // or use a custom field
            this.userAvatar = `https://ui-avatars.com/api/?name=${this.userName}&background=random`;
        } else if (error) {
            console.error(error);
        }
    }
}
import { LightningElement, track } from 'lwc';

export default class CarTracker extends LightningElement {
    @track zoomLevel = 18;
    @track currentSpeed = 45;
    @track fuelLevel = 78;
    @track engineTemp = 92;
    @track batteryLevel = 98;
    @track lastUpdate = new Date().toLocaleTimeString();
    
    @track mapMarkers = [
        {
            location: {
                Latitude: 25.2425, // Centered near Bhagalpur
                Longitude: 86.9718
            },
            title: 'Safar Cars - Toyota Fortuner',
            description: 'Vehicle ID: V-1029 | Moving North',
            icon: 'standard:location'
        }
    ];

    timer;

    get fuelStyle() {
        return `width: ${this.fuelLevel}%; background-color: ${this.fuelLevel > 20 ? '#4caf50' : '#f44336'};`;
    }

    connectedCallback() {
        // Simulate live movement
        this.timer = setInterval(() => {
            this.updateLocation();
        }, 3000); // Updated every 3 seconds for smoother tracking
    }

    disconnectedCallback() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    updateLocation() {
        // Simulate slight coordinate changes (moving towards Tilkamanjhi)
        const currentMarker = this.mapMarkers[0];
        const newLat = currentMarker.location.Latitude + 0.0001;
        const newLng = currentMarker.location.Longitude + 0.0001;
        
        this.mapMarkers = [
            {
                ...currentMarker,
                location: {
                    Latitude: newLat,
                    Longitude: newLng
                }
            }
        ];
        
        this.currentSpeed = Math.floor(40 + Math.random() * 10);
        this.engineTemp = Math.floor(90 + Math.random() * 5);
        this.batteryLevel = 98 - (Math.random() * 0.1).toFixed(1);
        this.lastUpdate = new Date().toLocaleTimeString();
    }

    handleRefresh() {
        this.updateLocation();
    }

    handleMarkerSelect(event) {
        console.log('Marker selected:', event.detail.selectedMarkerValue);
    }
}
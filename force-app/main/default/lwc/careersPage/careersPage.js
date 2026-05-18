import { LightningElement } from 'lwc';

export default class RideMitroCareer extends LightningElement {

    emailValue = '';
    showSuccess = false;
    
    // -- STATE VARIABLES --
    searchTerm = '';
    selectedDepartment = '';
    selectedLocation = '';

     // -- MODAL STATE --
    isModalOpen = false;
    selectedJob = null;
    showSuccessModal = false;
    fileName = '';

    // -- FORM DATA --
    formData = {
        fullName: '',
        email: '',
        phone: '',
        currentCompany: '',
        experience: '',
        linkedin: '',
        portfolio: '',
        coverLetter: ''
    };

    // -- STATIC DROPDOWN OPTIONS --
    departments = ['Engineering', 'Sales', 'Marketing', 'Product'];
    locations = ['Remote', 'Bangalore', 'New York', 'London'];
    
    // DATA FOR THE HERO STATS
    statsData = [
        { id: '1', value: '500+', label: 'Employees' },
        { id: '2', value: '15+', label: 'Cities' },
        { id: '3', value: '50+', label: 'Open Positions' },
        { id: '4', value: '4.5★', label: 'Rating' }
    ];

    // DATA FOR THE 'WHY JOIN US' CARDS
    // Replaced SVG paths with standard Salesforce icon names
    featuresData = [
        { 
            id: '1', 
            title: 'Innovation First',
            iconName: 'utility:light_bulb' // Represents ideas/innovation
        },
        { 
            id: '2', 
            title: 'Work-Life Balance',
            iconName: 'utility:clock' // Represents time/balance
        },
        { 
            id: '3', 
            title: 'Growth Opportunities',
            iconName: 'utility:trending' // Represents growth
        },
        { 
            id: '4', 
            title: 'Collaborative Environment',
            iconName: 'utility:people' // Represents team/collaboration
        }
    ];




    // -- DYNAMIC BENEFITS DATA --
    benefitsList = [
        { id: 1, title: 'Health Insurance', color: '#ff6b6b', iconPath: 'utility:heart' },
        { id: 2, title: 'Flexible Hours', color: '#4ecdc4', iconPath: 'utility:holiday_operating_hours' },
        { id: 3, title: 'Learning Stipend', color: '#ff9f43', iconPath: 'utility:trending' },
        { id: 4, title: 'Stock Options', color: '#54a0ff', iconPath: 'utility:customer_workspace' },
        { id: 5, title: 'Paid Time Off', color: '#5f27cd', iconPath: 'utility:shift_scheduling_operation' },
        { id: 6, title: 'Free Ride Credits', color: '#ee5253', iconPath: 'utility:transport_walking' },
        { id: 7, title: 'Gym Membership', color: '#0abde3', iconPath: 'utility:customer' },
        { id: 8, title: 'Remote Work', color: '#2e86de', iconPath: 'utility:questions_and_answers' },
    ];

    // -- DYNAMIC JOB DATA --
    jobsData = [
        { id: 101, title: 'Software Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time', posted: '2 days ago' },
        { id: 102, title: 'Frontend Developer', department: 'Engineering', location: 'New York', type: 'Full-time', posted: '1 day ago' },
        { id: 103, title: 'Sales Executive', department: 'Sales', location: 'London', type: 'Part-time', posted: '5 days ago' },
        { id: 104, title: 'Product Manager', department: 'Product', location: 'Bangalore', type: 'Full-time', posted: '3 days ago' },
        { id: 105, title: 'DevOps Engineer', department: 'Engineering', location: 'Remote', type: 'Contract', posted: '4 days ago' },
        { id: 106, title: 'Marketing Lead', department: 'Marketing', location: 'New York', type: 'Full-time', posted: '1 week ago' },
        { id: 107, title: 'DevOps Engineer', department: 'Engineering', location: 'Remote', type: 'Contract', posted: '4 days ago' }

    ];

    // -- FUNCTIONAL LOGIC: FILTERING --
    get filteredJobs() {
        let result = this.jobsData;

        // 1. Filter by Search Text
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            result = result.filter(job => 
                job.title.toLowerCase().includes(term) || 
                job.department.toLowerCase().includes(term)
            );
        }

        // 2. Filter by Department
        if (this.selectedDepartment) {
            result = result.filter(job => job.department === this.selectedDepartment);
        }

        // 3. Filter by Location
        if (this.selectedLocation) {
            result = result.filter(job => job.location === this.selectedLocation);
        }

        return result;
    }

    get showNoResults() {
        return this.filteredJobs.length === 0;
    }

    // -- EVENT HANDLERS --
    
    // Triggers when user types in search bar
    handleSearch(event) {
        this.searchTerm = event.target.value;
    }

    // Triggers when dropdowns change or Filter button is clicked
    handleFilterChange(event) {
        const name = event.target.name;
        const value = event.target.value;

        if (name === 'department') {
            this.selectedDepartment = value;
        } else if (name === 'location') {
            this.selectedLocation = value;
        }
    }





   

    

    // 1. GALLERY IMAGES (Placeholders matching the theme)
    galleryImages = [
        { id: 1, url: 'https://images.pexels.com/photos/6913298/pexels-photo-6913298.jpeg' },
        { id: 2, url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop' },
        { id: 3, url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop' },
        { id: 4, url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2032&auto=format&fit=crop' },
        { id: 5, url: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070&auto=format&fit=crop' },
        { id: 6, url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=1932&auto=format&fit=crop' },
        { id: 7, url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=2070&auto=format&fit=crop' },
        { id: 8, url: 'https://images.unsplash.com/photo-1515169067750-d51a73b20909?q=80&w=2070&auto=format&fit=crop' },
    ];

    // 2. TESTIMONIALS DATA
    testimonials = [
        { 
            id: 1, 
            name: 'Priyanka Sharma', 
            role: 'UX Designer', 
            rating: 5,
            ratingStars: [1, 2, 3, 4, 5],
            avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
            quote: 'The growth here is unmatched. I love the creative freedom.'
        },
        { 
            id: 2, 
            name: 'Tanya Singh', 
            role: 'Developer', 
            rating: 5,
            ratingStars: [1, 2, 3, 4, 5],
            avatarUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
            quote: 'A supportive culture that encourages work-life balance.'
        },
        { 
            id: 3, 
            name: 'Mayank Jain', 
            role: 'Product Manager', 
            rating: 4,
            ratingStars: [1, 2, 3, 4, 0],
            avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
            quote: 'Challenging projects and a collaborative team spirit.'
        }
    ];

    // 3. INTERVIEW PROCESS DATA
    get interviewSteps() {
        const steps = [
            { id: 1, title: 'Screening', question: '"What makes RideMitro\'s culture unique?"', description: 'Quick chat with HR to understand your vibe and goals.' },
            { id: 2, title: '1st Interview', question: '"How do employees benefit structurally?"', description: 'Meet your future team lead to discuss role expectations.' },
            { id: 3, title: 'Technical', question: '"What does the application process look like?"', description: 'Technical assessment or case study relevant to the role.' },
            { id: 4, title: 'Final Offer', question: '"What growth opportunities exist for employees?"', description: 'Final interview with leadership and offer discussion.', isLast: true }
        ];
        return steps;
    }

    // 4. FUNCTIONALITY: SUBSCRIPTION FORM
    handleEmailChange(event) {
        this.emailValue = event.target.value;
    }

    handleSubscribe() {
        if (this.emailValue && this.emailValue.includes('@')) {
            this.showSuccess = true;
            this.emailValue = ''; // Clear input
            // Hide success message after 3 seconds
            setTimeout(() => {
                this.showSuccess = false;
            }, 3000);
        } else {
            alert('Please enter a valid email address');
        }
    }





  // -- MODAL FUNCTIONS --
    
    // Open modal when "Apply Now" is clicked
    openApplyModal(event) {
        const jobId = parseInt(event.target.dataset.jobId);
        this.selectedJob = this.jobsData.find(job => job.id === jobId);
        this.isModalOpen = true;
        
        // Reset form data
        this.formData = {
            fullName: '',
            email: '',
            phone: '',
            currentCompany: '',
            experience: '',
            linkedin: '',
            portfolio: '',
            coverLetter: ''
        };
        this.fileName = '';
        
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }

    // Close modal
    closeModal() {
        this.isModalOpen = false;
        this.selectedJob = null;
        document.body.style.overflow = 'auto';
    }

    // Close modal when clicking overlay
    closeModalOnOverlay() {
        this.closeModal();
    }

    // Prevent closing when clicking inside modal
    preventClose(event) {
        event.stopPropagation();
    }

    // Close success modal
    closeSuccessModal() {
        this.showSuccessModal = false;
    }

    // -- FORM HANDLERS --
    
    handleFormChange(event) {
        const name = event.target.name;
        const value = event.target.value;
        this.formData = { ...this.formData, [name]: value };
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.fileName = file.name;
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size exceeds 5MB limit. Please upload a smaller file.');
                this.fileName = '';
                event.target.value = '';
            }
        }
    }

    handleSubmitApplication(event) {
        event.preventDefault();
        
        // Validate required fields
        if (!this.formData.fullName || !this.formData.email || !this.formData.phone || !this.formData.experience) {
            alert('Please fill in all required fields.');
            return;
        }

        if (!this.fileName) {
            alert('Please upload your resume.');
            return;
        }

        // Here you would typically send the data to a server
        console.log('Application Submitted:', {
            job: this.selectedJob,
            formData: this.formData,
            fileName: this.fileName
        });

        // Close apply modal and show success modal
        this.isModalOpen = false;
        this.showSuccessModal = true;
        document.body.style.overflow = 'hidden';

        // Reset form
        this.formData = {
            fullName: '',
            email: '',
            phone: '',
            currentCompany: '',
            experience: '',
            linkedin: '',
            portfolio: '',
            coverLetter: ''
        };
        this.fileName = '';
    }

    // -- SEARCH HANDLERS --
    handleSearch(event) {
        this.searchTerm = event.target.value;
    }

    handleFilterChange(event) {
        const name = event.target.name;
        const value = event.target.value;

        if (name === 'department') {
            this.selectedDepartment = value;
        } else if (name === 'location') {
            this.selectedLocation = value;
        }
    }
}
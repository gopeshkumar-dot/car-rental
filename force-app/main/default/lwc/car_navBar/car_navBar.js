import { LightningElement, track, wire, api } from 'lwc';
import getNavTabs from '@salesforce/apex/CarRentalNavController.getNavTabs';
import getSearchSuggestions from '@salesforce/apex/CarSearchController.getSearchSuggestions';
import { refreshApex } from '@salesforce/apex';
import isGuest from '@salesforce/user/isGuest';
import basePath from '@salesforce/community/basePath';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import logo1 from '@salesforce/resourceUrl/logo1';
//import {translate,getStoredLocale,setStoredLocale,localeFromUrlParam,LOCALE_EVENT} from 'c/dcSiteTranslator';

const ACTIVE_TAB_STORAGE_KEY = 'dc_navbar_active_tab_id';
const PROFILE_ACTIVE_STORAGE_KEY = 'dc_navbar_profile_active';

export default class Dc_NavBar extends LightningElement {
    /** When true, enables the select option. Configurable in App Builder / Experience Builder. */
    @api selectProperty = false;
    @api dashboardPageName = '/dashboard';
    @api myProfilePageName = 'My_Account';
    @api manageRentalsPath = '/manage-rentals';
    @api myListingsPath = '/my-listings';

    @track menuOpen = false;
    @track navTabs = [];
    @track openTabId = '';
    @track activeTabId = '';
    @track profileMenuActive = false;
    @track reportOpen = false;

    _wiredNavTabsResult;

    @wire(getNavTabs)
    wiredNavTabs({ error, data }) {
        this._wiredNavTabsResult = { error, data };
        if (data && Array.isArray(data) && data.length > 0) {
            this.navTabs = this.normalizeTabs(data);
        } else if (error) {
            this.navTabs = this.normalizeTabs(this.getDefaultNavTabs());
        } else {
            this.navTabs = this.normalizeTabs(this.getDefaultNavTabs());
        }
    }
    // home page show button 
     showButton = false;

    @track searchTerm = '';
    @track showDropdown = false;
    searchTimeout;
    
    //Search Location func. bhaskar
    textCurrentLocation = 'Use Current Location';
    textSuggestions = 'Suggestions';
    textSearchHistory = 'Recent Searches';

    @track suggestions = [];

    @track historyItems = [
        { id: 'h1', text: 'Bhagalpur' },
        { id: 'h2', text: 'Patna' }
    ];

    get hasSuggestions() {
        return this.suggestions && this.suggestions.length > 0;
    }

    get showHistorySection() {
        return this.historyItems && this.historyItems.length > 0;
    }

    handleSearchClick() {
        this.showDropdown = true;
    }

    handleDropdownMouseDown(event) {
        // Prevent default to avoid blur events closing the dropdown prematurely if implemented
        event.preventDefault();
    }

    handleCurrentLocation() {
        this.searchTerm = 'Current Location';
        this.showDropdown = false;
    }

    handleSuggestionClick(event) {
        this.searchTerm = event.currentTarget.dataset.text;
        this.showDropdown = false;
    }
    async handleLoginClick(event) {
            event.preventDefault();
            
            if (!this.validateLoginForm()) {
                this.showToast('Error', 'Please fix the form errors', 'error');
                return;
            }
    
            this.isLoading = true;
    
            try {
                const result = await loginContact({ 
                    email: this.email, 
                    password: this.password 
                });
                
                if (result === 'Failed') {
                    throw new Error('Invalid email or password');
                }
                
                const parsedResult = JSON.parse(result);
                
                this.showToast('Success', 'Login successful! Welcome back.', 'success');
                
                const loginSuccessEvent = new CustomEvent('loginsuccess', {
                    detail: {
                        email: this.email,
                        name: parsedResult.name,
                        phone: parsedResult.phone,
                        timestamp: new Date().toISOString()
                    },
                    bubbles: true,
                    composed: true
                });
                this.dispatchEvent(loginSuccessEvent);
                
                this.closeAllModals();
            } catch (error) {
                this.showToast('Login Failed', error.message || 'Invalid email or password', 'error');
            } finally {
                this.isLoading = false;
            }
        }

    handleHistoryClick(event) {
        this.searchTerm = event.currentTarget.dataset.text;
        this.showDropdown = false;
    }
    handleSearchTermChange(event) {
        this.searchTerm = event.target.value;
        this.showDropdown = true;

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (this.searchTerm && this.searchTerm.trim().length > 0) {
            this.searchTimeout = setTimeout(() => {
                getSearchSuggestions({ searchTerm: this.searchTerm })
                    .then(result => {
                        this.suggestions = result;
                    })
                    .catch(error => {
                        console.error('Error fetching suggestions', error);
                    });
            }, 200);
        } else {
            this.suggestions = [];
        }
    }

    handleSearchCommit() {
    if (this.searchTerm && this.searchTerm.trim().length > 0) {

        getSearchSuggestions({ searchTerm: this.searchTerm })
            .then(result => {

                this.suggestions = result;

                if (result && result.length === 0) {

                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'No Results',
                            message: 'No Cars Found',
                            variant: 'error'
                        })
                    );

                } else {

                    // optional event
                    window.dispatchEvent(
                        new CustomEvent('performSearch', {
                            detail: this.searchTerm
                        })
                    );

                    const bp = (basePath || '/s').replace(/\/$/, '');

const searchUrl =
    `${bp}/dcfilterallcars?search=${encodeURIComponent(this.searchTerm)}`;

window.location.href = searchUrl;
            }})
            .catch(error => {
                console.error('Error fetching suggestions', error);
            });
    }
}
    //End Of Search Func

    /** Client UI locale: English or Hindi (persists in localStorage). */
   // @track siteLocale = 'en';

    _boundLocaleChange = this.handleExternalLocaleChange.bind(this);
    _boundDocumentClick = this.handleDocumentClick.bind(this);

    get languageOptions() {
        return [
            { label: 'English', value: 'en' },
            { label: 'हिंदी (Hindi)', value: 'hi' }
        ];
    }

    get logoText() {
        return 'DC Property';
    }

    get logoUrl() {
        return logo1;
    }

    // get toggleMenuAria() {
    //     return translate('Toggle menu', this.siteLocale);
    // }

    // get toggleSubmenuAria() {
    //     return translate('Toggle submenu', this.siteLocale);
    // }

    handleLanguageChange(event) {
        const selected = event.detail.value;
        const next = selected === 'hi' ? 'hi' : 'en';
        if (next === this.siteLocale) {
            return;
        }
        this.siteLocale = next;
       // setStoredLocale(next);
        // Refresh wired Apex data immediately after locale switch (no full page reload).
        if (this._wiredNavTabsResult) {
            refreshApex(this._wiredNavTabsResult).catch(() => {
                // Keep UI responsive even if refresh fails.
            });
        }
    }

    handleExternalLocaleChange(event) {
        const loc = event.detail && event.detail.locale === 'hi' ? 'hi' : 'en';
        if (loc !== this.siteLocale) {
            this.siteLocale = loc;
        }
    }

    // initSiteLocaleFromUrlAndStorage() {
    //     let loc = getStoredLocale();
    //     try {
    //         const params = new URLSearchParams(window.location.search);
    //         const fromUrl = localeFromUrlParam(params.get('language'));
    //         if (fromUrl) {
    //             loc = fromUrl;
    //         }
    //     } catch {
    //         /* ignore */
    //     }
    //     this.siteLocale = loc;
    //     try {
    //         if (getStoredLocale() !== loc) {
    //             setStoredLocale(loc);
    //         } else {
    //             document.documentElement.setAttribute('lang', loc === 'hi' ? 'hi' : 'en');
    //         }
    //     } catch {
    //         /* ignore */
    //     }
    // }

    withDisplayNames(tabs) {
        const loc = this.siteLocale;
        const currentPath = this.getCurrentPathname();
        return (tabs || []).map((tab) => ({
            ...tab,
            displayName: tab.name,
            navLinkClass: this.getTopNavLinkClass(tab.id, tab.path, tab.children, currentPath),
            mobileNavLinkClass: this.getMobileNavLinkClass(tab.id, tab.path, tab.children, currentPath),
            dropdownClass:
                tab.hasChildren && this.openTabId === tab.id
                    ? 'dropdown-menu dropdown-open'
                    : 'dropdown-menu',
            manageRentalsDropdownClass:
                tab.hasChildren && this.openTabId === tab.id
                    ? 'dropdown-menu dropdown-manage-rentals dropdown-open'
                    : 'dropdown-menu dropdown-manage-rentals',
            children: (Array.isArray(tab.children) ? tab.children : []).map((child) => ({
                ...child,
                displayName: child.name,
                dropdownLinkClass: this.getDropdownLinkClass(child.path, currentPath),
                mobileSubLinkClass: this.getMobileSubLinkClass(child.path, currentPath)
            }))
        }));
    }

    getCurrentPathname() {
        if (typeof window === 'undefined' || !window.location) {
            return '';
        }
        const pathname = String(window.location.pathname || '')
            .toLowerCase()
            .replace(/\/+$/, '');
        return pathname || '/';
    }

    isPathActive(targetPath, currentPath) {
        if (!targetPath) {
            return false;
        }
        const candidate = String(targetPath).toLowerCase().replace(/\/+$/, '') || '/';
        const current = currentPath || this.getCurrentPathname();
        if (candidate === '/') {
            return current === '/';
        }
        return (
            current === candidate ||
            current.endsWith(candidate) ||
            current.includes(`${candidate}/`)
        );
    }

    hasActiveChild(children, currentPath) {
        return (Array.isArray(children) ? children : []).some((child) =>
            this.isPathActive(child?.path, currentPath)
        );
    }

    getTopNavLinkClass(tabId, path, children, currentPath) {
        if (this.profileMenuActive) {
            return 'nav-link';
        }
        const active =
            this.activeTabId === tabId ||
            this.isPathActive(path, currentPath) ||
            this.hasActiveChild(children, currentPath);
        return active ? 'nav-link nav-link-active' : 'nav-link';
    }

    getMobileNavLinkClass(tabId, path, children, currentPath) {
        if (this.profileMenuActive) {
            return 'mobile-nav-link';
        }
        const active =
            this.activeTabId === tabId ||
            this.isPathActive(path, currentPath) ||
            this.hasActiveChild(children, currentPath);
        return active ? 'mobile-nav-link mobile-nav-link-active' : 'mobile-nav-link';
    }

    getDropdownLinkClass(path, currentPath) {
        if (this.profileMenuActive) {
            return 'dropdown-link';
        }
        return this.isPathActive(path, currentPath) ? 'dropdown-link dropdown-link-active' : 'dropdown-link';
    }

    getMobileSubLinkClass(path, currentPath) {
        if (this.profileMenuActive) {
            return 'mobile-nav-sublink';
        }
        return this.isPathActive(path, currentPath)
            ? 'mobile-nav-sublink mobile-nav-sublink-active'
            : 'mobile-nav-sublink';
    }

    getStoredActiveTabId() {
        try {
            return sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || '';
        } catch {
            return '';
        }
    }

    getStoredProfileMenuActive() {
        try {
            return sessionStorage.getItem(PROFILE_ACTIVE_STORAGE_KEY) === '1';
        } catch {
            return false;
        }
    }

    setActiveTabId(tabId) {
        const next = tabId || '';
        this.activeTabId = next;
        try {
            if (next) {
                sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, next);
            } else {
                sessionStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
            }
        } catch {
            /* ignore */
        }
    }

    setProfileMenuActive(active) {
        this.profileMenuActive = Boolean(active);
        try {
            if (this.profileMenuActive) {
                sessionStorage.setItem(PROFILE_ACTIVE_STORAGE_KEY, '1');
            } else {
                sessionStorage.removeItem(PROFILE_ACTIVE_STORAGE_KEY);
            }
        } catch {
            /* ignore */
        }
    }

    setActiveTabByPath(path) {
        const p = (path || '').trim();
        if (!p) {
            return;
        }
        const owner = (this.navTabs || []).find((tab) => {
            if (tab.path === p) {
                return true;
            }
            return (Array.isArray(tab.children) ? tab.children : []).some((child) => child.path === p);
        });
        if (owner?.id) {
            this.setActiveTabId(owner.id);
        }
    }

    connectedCallback() {
    this.activeTabId = this.getStoredActiveTabId();
    this.profileMenuActive = this.getStoredProfileMenuActive();

    if (typeof window !== 'undefined') {
        document.addEventListener('click', this._boundDocumentClick);
    }

    const currentPath = window.location.pathname;

    // Home page check
    if (
        currentPath === '/' ||
        currentPath.endsWith('/s/') ||
        currentPath.endsWith('/s')
    ) {
        this.showButton = false;
    } else {
        this.showButton = true;
    }
}

    disconnectedCallback() {
        if (typeof window !== 'undefined') {
            //window.removeEventListener(LOCALE_EVENT, this._boundLocaleChange);
            document.removeEventListener('click', this._boundDocumentClick);
        }
        document.body.style.overflow = '';
    }

    handleHomeClick(event) {
        if (event) {
            event.preventDefault();
        }
        const bp = (basePath || '/s').replace(/\/$/, '');
        window.location.assign(`${bp}/`);
    }
    
    handleLogoutClick(event) {
        if (event) {
            event.preventDefault();
        }
        this.navigateTo('/logout');
    }


    normalizeTabs(items) {
        let filteredItems = items || [];
        
        // 🔹 Filter logical tabs based on User Login Status
       filteredItems = filteredItems.filter(tab => {
    const tName = (tab.name || '').trim().toLowerCase();

    // Hide profile-only menu items
    const isProfileMenuOnly =
        tName === 'logout' ||
        tName === 'log out' ||
        tName === 'my listings';

    if (isProfileMenuOnly) {
        return false;
    }

    // Protected tabs
    const protectedNames = [
        'Sign In',
        'login'
        // 'dashboard',
        // 'my profile',
        // 'manage-rentals'
    ];

    const isProtected = protectedNames.includes(tName);

    // Guest-only tabs
    const guestOnlyNames = [
        'sign in',
        'sign-in',
        'signin',
        'login',
        'register',
        'create account'
    ];

    const isGuestOnly = guestOnlyNames.includes(tName);

    // Hide protected tabs for guests
    if (isProtected && isGuest) {
        return false;
    }

    // Hide login tabs for logged-in users
    if (isGuestOnly && !isGuest) {
        return false;
    }

    return true;
});

        // Guest-only tabs and protected tabs logic kept same, dynamic 'Sign In' tab removed so we can render a custom button in HTML instead.

        return filteredItems.map((tab) => {
            const children = Array.isArray(tab.children) ? tab.children : [];
            const tabPath = this.remapRentCalculatorPath(this.normalizePath(tab.path, tab.name));
            return {
                ...tab,
                path: tabPath,
                siteUrl: this.resolveSiteUrl(tabPath),
                children: children.map((child) => {
                    const childPath = this.remapRentCalculatorPath(this.normalizePath(child.path, child.name));
                    return {
                        ...child,
                        path: childPath,
                        siteUrl: this.resolveSiteUrl(childPath)
                    };
                }),
                hasChildren: children.length > 0
            };
        });
    }

    remapRentCalculatorPath(path) {
        const p = (path || '').trim().toLowerCase();
        if (p === '/rent-calculator' || p.endsWith('/rent-calculator')) {
            return '/rent/search-all-rental-listings';
        }
        return path;
    }

    /** Full community URL for href and for window.location.assign (same path rules). */
    resolveSiteUrl(path) {
        const raw = (path || '').trim();
        if (!raw) {
            return '#';
        }
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
            return raw;
        }
        const rel = raw.startsWith('/') ? raw : `/${raw}`;
        const bp = (basePath || '/s').replace(/\/$/, '');
        return `${bp}${rel}`;
    }

    normalizePath(path, fallbackLabel) {
        if (path && typeof path === 'string' && path.trim()) {
            const p = path.trim();
            if (p.startsWith('http://') || p.startsWith('https://')) {
                return p;
            }
            return p.startsWith('/') ? p : '/' + p;
        }
        const slug = (fallbackLabel || 'item')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return '/' + (slug || 'item');
    }

    getDefaultNavTabs() {
        return [
            { id: 'About', name: 'About', path: '/about', displayOrder: 1, tabPosition: 'Left', children: [] },
            { id: 'Offer', name: 'Offer', path: '/offer', displayOrder: 2, tabPosition: 'Left', children: [] },
            { id: 'Careers', name: 'Careers', path: '/careers', displayOrder: 3, tabPosition: 'Left', children: [] },
            { id: 'Contact-us', name: 'Contact-us', path: '/contact-us', displayOrder: 4, tabPosition: 'Left', children: [] },
            { id: 'Sign In', name: 'Sign In', path: '/sign-in', displayOrder: 5, tabPosition: 'Right', children: [] },
            { id: 'Login', name: 'Login', path: '/login', displayOrder: 6, tabPosition: 'Right', children: [] }
        ];
    }

    get leftNavTabs() {
        const tabs = this.navTabs || [];
        const filtered = tabs.filter((t) => ((t.tabPosition || 'Left') + '').trim().toLowerCase() !== 'right');
        return this.withDisplayNames(filtered);
    }

    get rightNavTabs() {
        const tabs = this.navTabs || [];
        const filtered = tabs.filter((t) => ((t.tabPosition || '') + '').trim().toLowerCase() === 'right');
        return this.withDisplayNames(filtered);
    }

    get navTabsWithClasses() {
        const openId = this.openTabId;
        const withNames = this.withDisplayNames(this.navTabs || []);
        return withNames.map((tab) => ({
            ...tab,
            children: (Array.isArray(tab.children) ? tab.children : []).map((child) => ({
                ...child,
                ...this.getMobileChildMeta(child)
            })),
            submenuClass: openId === tab.id ? 'mobile-nav-sublinks mobile-nav-sublinks-open' : 'mobile-nav-sublinks',
            isSubmenuOpen: openId === tab.id
        }));
    }

    // getMobileChildMeta(child) {
    //     const label = ((child && (child.displayName || child.name)) || '').toLowerCase();
    //     const fallback = {
    //         icon: '•',
    //         subtitle: translate('Quick access item', this.siteLocale)
    //     };

    //     if (!label) {
    //         return fallback;
    //     }

    //     if (label.includes('home') && label.includes('sale')) {
    //         return { icon: '🏠', subtitle: translate('Curated homes available now', this.siteLocale) };
    //     }
    //     if (label.includes('recent') || label.includes('sold')) {
    //         return { icon: '📈', subtitle: translate('Market trends and latest sales', this.siteLocale) };
    //     }
    //     if (label.includes('all home') || label.includes('all properties')) {
    //         return { icon: '🧭', subtitle: translate('Browse full verified listings', this.siteLocale) };
    //     }
    //     if (label.includes('foreclosure')) {
    //         return { icon: '⚖️', subtitle: translate('Distressed and auction opportunities', this.siteLocale) };
    //     }
    //     if (label.includes('down payment') || label.includes('assistance')) {
    //         return { icon: '💳', subtitle: translate('Programs to reduce upfront cost', this.siteLocale) };
    //     }
    //     if (label.includes('new construction')) {
    //         return { icon: '🏗️', subtitle: translate('Brand-new project inventory', this.siteLocale) };
    //     }
    //     if (label.includes('owner') || label.includes('fsbo')) {
    //         return { icon: '🤝', subtitle: translate('Direct deals from owners', this.siteLocale) };
    //     }
    //     if (label.includes('guide') || label.includes('buying')) {
    //         return { icon: '📘', subtitle: translate('Step-by-step buying support', this.siteLocale) };
    //     }
    //     if (label.includes('app')) {
    //         return { icon: '📱', subtitle: translate('Manage search from mobile app', this.siteLocale) };
    //     }

    //     return fallback;
    // }

    get mobileMenuClass() {
        return this.menuOpen ? 'mobile-menu mobile-menu-open' : 'mobile-menu';
    }

    get mobileOverlayClass() {
        return this.menuOpen ? 'mobile-overlay mobile-overlay-visible' : 'mobile-overlay';
    }

    get headerClass() {
        const menuClass = this.menuOpen ? 'header header-menu-open' : 'header';
        return this.profileMenuActive ? `${menuClass} profile-active` : menuClass;
    }

    get isGuestUser() {
        return isGuest;
    }

    get headerInnerClass() {
        return !this.isGuestUser ? 'header-inner header-inner--member' : 'header-inner';
    }

    handleToggleMenu() {
        this.menuOpen = !this.menuOpen;
        if (!this.menuOpen) {
            this.openTabId = '';
        }
        document.body.style.overflow = this.menuOpen ? 'hidden' : '';
    }

    handleToggleSubmenu(event) {
        event.preventDefault();
        event.stopPropagation();
        const tabId = event.currentTarget?.dataset?.tabId;
        if (tabId) {
            this.openTabId = this.openTabId === tabId ? '' : tabId;
        }
    }

    handleCloseMenu(event) {
        if (event) event.preventDefault();
        this.menuOpen = false;
        this.openTabId = '';
        document.body.style.overflow = '';
    }

    handleNavClick(event) {
        this.clearProfileMenuActive();
        const path = event.currentTarget?.dataset?.path;
        if (!path) {
            return;
        }
        const hasChildren = event.currentTarget?.dataset?.hasChildren === 'true';
        if (hasChildren) {
            // Parent tabs with dropdown should only open submenu, not navigate.
            event.preventDefault();
            const tabId = event.currentTarget?.dataset?.tabId;
            if (tabId) {
                this.setActiveTabId(tabId);
            }
            this.openTabId = this.openTabId === tabId ? '' : tabId;
            return;
        }
        this.setActiveTabByPath(path);
        // Let normal links use native anchor navigation (more reliable for top-level tabs).
        // Keep custom JS navigation only for special routes.
        if (this.shouldUseCustomNav(path)) {
            event.preventDefault();
            this.navigateTo(path);
        }
    }

    handleDocumentClick(event) {
        const path = event.composedPath();

        if (this.menuOpen) {
            const clickedInsideMenu = path.some(
                (node) =>
                    node?.classList?.contains?.('mobile-menu') ||
                    node?.classList?.contains?.('hamburger')
            );

            if (!clickedInsideMenu) {
                this.menuOpen = false;
                this.openTabId = '';
                document.body.style.overflow = '';
            }
        }

        if (this.openTabId && !this.menuOpen) {
            const clickedInsideDropdown = path.some(
                (node) =>
                    node?.classList?.contains?.('nav-item-with-dropdown') ||
                    node?.classList?.contains?.('dropdown-menu')
            );

            if (!clickedInsideDropdown) {
                this.openTabId = '';
            }
        }

        if (this.showDropdown) {
            const clickedInsideSearch = path.some(
                (node) => node?.classList?.contains?.('search-section')
            );

            if (!clickedInsideSearch) {
                this.showDropdown = false;
            }
        }
    }

    handleMobileNavClick(event) {
        this.clearProfileMenuActive();
        const path = event.currentTarget?.dataset?.path;
        const hasChildren = event.currentTarget?.dataset?.hasChildren === 'true';
        if (hasChildren) {
            event.preventDefault();
            const tabId = event.currentTarget?.dataset?.tabId;
            if (tabId) {
                this.setActiveTabId(tabId);
                this.openTabId = this.openTabId === tabId ? '' : tabId;
            }
            return;
        }
        if (path) {
            this.setActiveTabByPath(path);
            if (this.shouldUseCustomNav(path)) {
                event.preventDefault();
                this.navigateTo(path);
            }
        }
        this.handleCloseMenu();
    }

    shouldUseCustomNav(path) {
        const raw = (path || '').trim().toLowerCase();
        if (!raw) {
            return false;
        }
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
            return true;
        }
        return (
            raw === '/signin' ||
            raw === '/login' ||
            raw === '/sign-in' ||
            raw === '/logout' ||
            raw === 'logout' ||
            raw.endsWith('/logout') ||
            raw === '/log-out' ||
            raw.endsWith('/log-out') ||
            raw === '/rent-calculator' ||
            raw.endsWith('/rent-calculator')
        );
    }

    navigateTo(path) {
        let normalizedPath = (path || '').trim();
        const lower = normalizedPath.toLowerCase();

        if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
            window.location.assign(normalizedPath);
            return;
        }

        if (lower === '/rent-calculator' || lower.endsWith('/rent-calculator')) {
            normalizedPath = '/rent/search-all-rental-listings';
        }

        const normalized = normalizedPath.toLowerCase();
        if (normalized === '/signin' || normalized === '/login' || normalized === '/sign-in') {
            const bp = (basePath || '/s').replace(/\/$/, '');
            window.location.assign(`${bp}/sign-in`);
            return;
        }

        const isLogout =
            normalized === '/logout' ||
            normalized === 'logout' ||
            normalized.endsWith('/logout') ||
            normalized === '/log-out' ||
            normalized.endsWith('/log-out');
        if (isLogout && !normalizedPath.startsWith('http')) {
            const bp = (basePath || '').replace(/\/$/, '');
            const sitePrefix = bp.replace(/\/s$/i, '');
            const signInPath = `${bp || '/s'}/sign-in`;
            const logoutBase = sitePrefix ? `${sitePrefix}/secur/logout.jsp` : '/secur/logout.jsp';
            const logoutUrl = `${logoutBase}?retUrl=${encodeURIComponent(signInPath)}`;
            window.location.assign(logoutUrl);
            return;
        }

        const targetPath = this.normalizePath(normalizedPath, '');
        window.location.assign(this.resolveSiteUrl(targetPath));
    }

    handleOpenReport(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.reportOpen = true;
        document.body.style.overflow = 'hidden';
    }

    handleProfileToggle(event) {
        const open = Boolean(event?.detail?.open);
        if (open) {
            this.activateProfileMenu();
        }
    }

    handleProfileIconClick() {
        this.activateProfileMenu();
    }

    activateProfileMenu() {
        this.setProfileMenuActive(true);
        this.setActiveTabId('');
        this.openTabId = '';
    }

    clearProfileMenuActive() {
        this.setProfileMenuActive(false);
    }

    closeReport(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.reportOpen = false;
        document.body.style.overflow = this.menuOpen ? 'hidden' : '';
    }

    keepReportOpen(event) {
        if (event) {
            event.stopPropagation();
        }
    }

    /**
     * Builds the full URL for in-app navigation (e.g. Find an agent -> dc_FindAnAgent page).
     * Strips the current page from pathname so /s/sitename/home + /find-agent -> /s/sitename/find-agent.
     */
    getTargetUrl(path) {
        const normalizedPath = path.startsWith('/') ? path : '/' + path;
        if (typeof window === 'undefined' || !window.location) {
            return normalizedPath;
        }
        const pathname = window.location.pathname || '';
        const siteBase = pathname.replace(/\/[^/]*$/, '') || '';
        const baseUrl = window.location.origin + siteBase;
        return baseUrl + normalizedPath;
    }
}
// Function to track style views
function trackStyleView(styleName) {
    fbq('track', 'ViewContent', {
        content_type: 'hairstyle',
        content_name: styleName,
        content_category: 'Hairstyle'
    });
}

// Function to track booking initiation
function trackBookingStart(styleName, price) {
    fbq('track', 'InitiateCheckout', {
        content_type: 'hairstyle_booking',
        content_name: styleName,
        value: price,
        currency: 'USD'
    });
}

// Function to track successful booking
function trackBookingComplete(styleName, price) {
    fbq('track', 'Purchase', {
        content_type: 'hairstyle_booking',
        content_name: styleName,
        value: price,
        currency: 'USD'
    });
}

// Function to track search
function trackSearch(searchTerm) {
    fbq('track', 'Search', {
        search_string: searchTerm,
        content_category: 'Hairstyles'
    });
}

// Function to get URL parameters (for ad tracking)
function getURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const utm_source = urlParams.get('utm_source');
    const utm_medium = urlParams.get('utm_medium');
    const utm_campaign = urlParams.get('utm_campaign');
    
    // If we have UTM parameters, track them
    if (utm_source || utm_medium || utm_campaign) {
        fbq('trackCustom', 'AdVisitor', {
            utm_source: utm_source || 'none',
            utm_medium: utm_medium || 'none',
            utm_campaign: utm_campaign || 'none'
        });
    }
}

// Track UTM parameters on page load
document.addEventListener('DOMContentLoaded', function() {
    getURLParameters();

    // Add click tracking to all style links
    const styleLinks = document.querySelectorAll('[data-style-name]');
    styleLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const styleName = this.getAttribute('data-style-name');
            trackStyleView(styleName);
        });
    });

    // Track search
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        let timeoutId;
        searchInput.addEventListener('input', function(e) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if (this.value.trim().length > 2) {
                    trackSearch(this.value.trim());
                }
            }, 1000);
        });
    }

    // Track booking form submission
    const bookingForm = document.querySelector('form[data-booking-form]');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            const styleName = this.querySelector('[name="style"]').value;
            const price = this.querySelector('[name="price"]').value;
            trackBookingComplete(styleName, parseFloat(price));
        });
    }

    // Track booking button clicks
    const bookingButtons = document.querySelectorAll('[data-book-style]');
    bookingButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const styleName = this.getAttribute('data-book-style');
            const price = this.getAttribute('data-price');
            trackBookingStart(styleName, parseFloat(price));
        });
    });
}); 
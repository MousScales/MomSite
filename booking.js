document.addEventListener('DOMContentLoaded', function() {
    const bookingForm = document.getElementById('booking-form');
    const styleSelect = document.getElementById('style');
    const durationDisplay = document.getElementById('duration-display');
    const durationInput = document.getElementById('duration');

    const hairLengthSelect = document.getElementById('hair-length');

    
    // Initialize Stripe
const stripe = Stripe('pk_live_51REifLRqvuBtPAdXaNce44j5Fe7h0Z1G0pqr1x4i6TRK4Z1TppknBz0lU8jmb48a1epPphqTY558sMO5rBzG5z62007VHMn2IL');
    const elements = stripe.elements();
    
    // Create card element
    const cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
            invalid: {
                color: '#9e2146',
            },
        },
    });
    
    // Mount card element
    const cardElementContainer = document.getElementById('card-element');
    if (cardElementContainer) {
        cardElement.mount('#card-element');
        console.log('Card element mounted successfully');
    } else {
        console.error('Card element container not found');
    }
    
    // Handle card element errors
    cardElement.on('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });

        // Apple Pay temporarily disabled
    /*
    // Initialize Apple Pay
    let applePaySupported = false;
    let paymentRequest = null;

    // Check if Apple Pay is supported
    console.log('=== APPLE PAY DEBUG ===');
    console.log('Checking Apple Pay support...');
    console.log('ApplePaySession available:', !!window.ApplePaySession);
    console.log('ApplePaySession.canMakePayments available:', !!(window.ApplePaySession && ApplePaySession.canMakePayments));
    console.log('User agent:', navigator.userAgent);
    console.log('Protocol:', window.location.protocol);
    console.log('Hostname:', window.location.hostname);
    
    // Check if we're on a supported device
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMac = /Mac/.test(navigator.userAgent);
    
    console.log('Is Safari:', isSafari);
    console.log('Is iOS:', isIOS);
    console.log('Is Mac:', isMac);
    
    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
        applePaySupported = true;
        console.log('Apple Pay is supported');
        
        // Create payment request for Apple Pay
        paymentRequest = stripe.paymentRequest({
            country: 'US',
            currency: 'usd',
            total: {
                label: 'Maya African Hair Braiding',
                amount: 50, // Start with 50 cents, will be updated
            },
            requestPayerName: true,
            requestPayerEmail: true,
            requestPayerPhone: true,
            // Apple Pay configuration
            paymentRequestButton: {
                type: 'plain',
                theme: 'dark',
            },
        });
        
        // Check if the payment request is supported
        paymentRequest.canMakePayment().then(function(result) {
            const applePayButtonContainer = document.getElementById('apple-pay-button');
            const applePayBtn = document.getElementById('apple-pay-btn');
            
            console.log('=== PAYMENT REQUEST DEBUG ===');
            console.log('Payment request result:', result);
            console.log('Apple Pay available:', result && result.applePay);
            console.log('Button container found:', !!applePayButtonContainer);
            console.log('Apple Pay button found:', !!applePayBtn);
            
            if (result && result.applePay) {
                console.log('Apple Pay is available');
                applePayButtonContainer.style.display = 'block';
                
                // Handle Apple Pay button click
                applePayBtn.addEventListener('click', function() {
                    console.log('Apple Pay button clicked');
                    console.log('Payment request:', paymentRequest);
                    paymentRequest.open();
                });
                
                // Handle payment request events
                paymentRequest.on('paymentmethod', function(ev) {
                    console.log('Apple Pay payment method received:', ev.paymentMethod);
                    handleApplePayPayment(ev.paymentMethod);
                });
                
                paymentRequest.on('cancel', function() {
                    console.log('Apple Pay payment cancelled');
                });
                
                paymentRequest.on('error', function(ev) {
                    console.error('Apple Pay error:', ev.error);
                    const errorElement = document.getElementById('card-errors');
                    errorElement.textContent = 'Apple Pay error: ' + ev.error.message;
                });
            } else {
                console.log('Apple Pay is not available on this device');
                console.log('Reason: Payment request not supported');
                applePayButtonContainer.style.display = 'none';
            }
        }).catch(function(error) {
            console.error('Error checking Apple Pay support:', error);
            applePayButtonContainer.style.display = 'none';
        });
    } else {
        console.log('Apple Pay is not supported on this browser');
        console.log('Reason: ApplePaySession not available or canMakePayments returned false');
    }
    */

    // Style-specific configurations with custom options for each style
    const styleConfigurations = {



        'cornrows': {
            name: 'Cornrows',
            basePrices: { nostyle: 80 },
            duration: { nostyle: 1 },

            specificOptions: {
                'style-choice': {
                    label: 'Style Option',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'no-style', label: 'No specific style - Basic cornrows', price: 0 },
                        { value: 'with-style', label: 'With specific style pattern (reference image required)', price: 40 }
                    ]
                },
                'pattern': {
                    label: 'Cornrow Pattern (if with style)',
                    type: 'select',
                    required: false,
                    dependsOn: 'style-choice',
                    dependsOnValue: 'with-style',
                    options: [
                        { value: 'straight-back', label: 'Straight Back', price: 0 },
                        { value: 'side-part', label: 'Side Part', price: 0 },
                        { value: 'zigzag', label: 'Zigzag Pattern', price: 0 },
                        { value: 'heart-shaped', label: 'Heart Shaped', price: 0 },
                        { value: 'custom-design', label: 'Custom Design', price: 0 }
                    ]
                },
                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'box-braids': {
            name: 'Box Braids',
            basePrices: { shoulder: 230, midback: 250 },
            duration: { shoulder: 3, midback: 4 },
            hairLengthOptions: ['shoulder', 'midback'],
            specificOptions: {
                'style-variation': {
                    label: 'Style Type',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'traditional', label: 'Traditional Box Braids', price: 0 },
                        { value: 'knotless', label: 'Knotless Box Braids', price: 30 }
                    ]
                },
                'hair-upgrade': {
                    label: 'Hair Type',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'included', label: 'Use included hair (synthetic or human)', price: 0 },
                        { value: 'human-upgrade', label: 'Upgrade to human hair', price: 60 }
                    ]
                },
                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'boho-braids': {
            name: 'Boho Braids',
            basePrices: { shoulder: 280, midback: 250 },
            duration: { shoulder: 2, midback: 4 },
            hairLengthOptions: ['shoulder', 'midback'],
            hairTypeOptions: ['human-hair'],
            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'jumbo-braids': {
            name: 'Jumbo Braids',
            basePrices: { midback: 230 },
            duration: { midback: 3 },

            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'passion-twists': {
            name: 'Passion Twists',
            basePrices: { shoulder: 250, midback: 300 },
            duration: { shoulder: 3, midback: 4 },
            hairLengthOptions: ['shoulder', 'midback'],
            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'fulani-braids': {
            name: 'Fulani Braids',
            basePrices: { shoulder: 220, midback: 250 },
            duration: { shoulder: 3, midback: 3 },
            hairLengthOptions: ['shoulder', 'midback'],
            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'lemonade-braids': {
            name: 'Lemonade Braids',
            basePrices: { short: 130, medium: 160, long: 200 },
            duration: { short: 3, medium: 4, long: 5 },
            hairLengthOptions: ['short', 'medium', 'long'],
            hairTypeOptions: ['synthetic', 'human-hair'],
            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'senegalese-twists': {
            name: 'Senegalese Twists',
            basePrices: { shoulder: 230, midback: 250 },
            duration: { shoulder: 2, midback: 3 },
            hairLengthOptions: ['shoulder', 'midback'],
            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'marley-twists': {
            name: 'Marley Twists',
            basePrices: { shoulder: 230, midback: 300 },
            duration: { shoulder: 3, midback: 4 },
            hairLengthOptions: ['shoulder', 'midback'],
            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'two-strand-twists': {
            name: 'Two Strand Twists',
            basePrices: { standard: 130 },
            duration: { standard: 2 },

            specificOptions: {
                'twist-style': {
                    label: 'Twist Style',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'natural-hair', label: 'Natural hair only', price: 0 },
                        { value: 'with-extensions', label: 'With extensions', price: 20 }
                    ]
                },
                'hair-upgrade': {
                    label: 'Hair Type (if using extensions)',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'included', label: 'Use included synthetic hair', price: 0 },
                        { value: 'human-upgrade', label: 'Upgrade to human hair', price: 60 }
                    ]
                },
                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'stitch-braids': {
            name: 'Stitch Braids',
            basePrices: { midback: 150 },
            duration: { midback: 2 },

            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'tribal-braids': {
            name: 'Tribal Braids',
            basePrices: { shoulder: 220, midback: 250 },
            duration: { shoulder: 3, midback: 4 },
            hairLengthOptions: ['shoulder', 'midback'],
            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'starter-locs': {
            name: 'Starter Locs',
            basePrices: { standard: 150 },
            duration: { standard: 2 },

            specificOptions: {

                'hair-consultation': {
                    label: 'Hair Length Consultation',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'consultation-needed', label: 'Price varies by hair length - will discuss during appointment', price: 0 }
                    ]
                },
                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'locs-retwist': {
            name: 'Locs Retwist',
            basePrices: { standard: 130 },
            duration: { standard: 2 },

            specificOptions: {

                'hair-consultation': {
                    label: 'Hair Length Consultation',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'consultation-needed', label: 'Price varies by hair length - will discuss during appointment', price: 0 }
                    ]
                },
                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'loc-retwist-2-strands': {
            name: 'Loc Retwist 2 Strands',
            basePrices: { standard: 150 },
            duration: { standard: 2 },

            specificOptions: {

                'hair-consultation': {
                    label: 'Hair Length Consultation',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'consultation-needed', label: 'Price varies by hair length - will discuss during appointment', price: 0 }
                    ]
                },
                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'barrel-twists': {
            name: 'Barrel Twists',
            basePrices: { standard: 150 },
            duration: { standard: 2 },

            specificOptions: {

                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'weave': {
            name: 'Weave',
            basePrices: { standard: 150 },
            duration: { standard: 2 },

            specificOptions: {

                'bundle-option': {
                    label: 'Hair Bundle',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'client-provides', label: 'I will provide my own hair/bundles', price: 0 },
                        { value: 'add-bundle', label: 'Add hair bundle', price: 100 }
                    ]
                },
                'wash-service': {
                    label: 'Wash Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-wash', label: 'No wash needed', price: 0 },
                        { value: 'wash', label: 'Wash & Condition', price: 30 }
                    ]
                },
                'detangle-service': {
                    label: 'Detangling Service',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'no-detangle', label: 'No detangling needed', price: 0 },
                        { value: 'detangle', label: 'Detangle Hair', price: 20 }
                    ]
                }
            }
        },
        'test-style': {
            name: 'Test Style',
            basePrices: { standard: 1 },
            duration: { standard: 0.5 },
            deposit: 1,
            specificOptions: {
                'test-option': {
                    label: 'Test Option',
                    type: 'select',
                    required: false,
                    options: [
                        { value: 'basic', label: 'Basic Test', price: 0 },
                        { value: 'premium', label: 'Premium Test', price: 0 }
                    ]
                }
            }
        },
        // More styles will be added as you specify them
    };

    // Legacy pricing for backwards compatibility with non-configured styles
    const pricingData = {
        'cornrows': { short: 80, medium: 100, long: 120 },
        'box-braids': { short: 120, medium: 150, long: 200 },
        'fulani-braids': { short: 100, medium: 130, long: 160 },
        'lemonade-braids': { short: 130, medium: 160, long: 200 },
        'passion-twists': { short: 90, medium: 110, long: 140 },
        'senegalese-twists': { short: 100, medium: 120, long: 150 },
        'marley-twists': { short: 85, medium: 105, long: 135 },
        'two-strand-twists': { short: 70, medium: 90, long: 120 },
        'locs-retwist': { short: 60, medium: 80, long: 100 },
        'starter-locs': { short: 150, medium: 180, long: 220 },
        'weave': { short: 200, medium: 250, long: 300 }
    };



    // Function to create style-specific form fields
    function createStyleSpecificFields(styleKey) {
        console.log('createStyleSpecificFields called with:', styleKey);
        const styleConfig = styleConfigurations[styleKey];
        console.log('Style config found:', styleConfig);
        console.log('Style config specificOptions:', styleConfig?.specificOptions);
        
        if (!styleConfig || !styleConfig.specificOptions) {
            console.log('No style config or specific options, hiding section');
            document.getElementById('style-specific-options').style.display = 'none';
            return;
        }

        const fieldsContainer = document.getElementById('style-specific-fields');
        const titleElement = document.getElementById('style-specific-title');
        
        // Update title
        titleElement.textContent = `${styleConfig.name} Options`;
        
        // Clear existing fields
        fieldsContainer.innerHTML = '';
        
        // Create fields for each specific option
        Object.keys(styleConfig.specificOptions).forEach(optionKey => {
            const option = styleConfig.specificOptions[optionKey];
            
            if (option.type === 'select') {
                const isConditional = option.dependsOn && option.dependsOnValue;
                const conditionalStyle = isConditional ? 'style="display: none;"' : '';
                
                const fieldHtml = `
                    <div class="form-group" id="${optionKey}-container" ${conditionalStyle}>
                        <label for="${optionKey}">${option.label}${option.required ? ' *' : ''}</label>
                        <select id="${optionKey}" name="${optionKey}" ${option.required ? 'required' : ''}>
                            <option value="">Select ${option.label.toLowerCase()}</option>
                            ${option.options.map(opt => 
                                `<option value="${opt.value}" data-price="${opt.price}">${opt.label}${opt.price !== 0 ? ` (+$${opt.price})` : ''}</option>`
                            ).join('')}
                        </select>
                </div>
                `;
                fieldsContainer.innerHTML += fieldHtml;
            } else if (option.type === 'number') {
                const isConditional = option.dependsOn && option.dependsOnValue;
                const conditionalStyle = isConditional ? 'style="display: none;"' : '';
                
                const fieldHtml = `
                    <div class="form-group" id="${optionKey}-container" ${conditionalStyle}>
                        <label for="${optionKey}">${option.label}${option.required ? ' *' : ''}</label>
                        <input type="number" id="${optionKey}" name="${optionKey}" 
                               min="${option.min || 1}" max="${option.max || 8}" 
                               value="${option.default || ''}" 
                               ${option.required ? 'required' : ''}>
            </div>
        `;
                fieldsContainer.innerHTML += fieldHtml;
            }
        });
        
        // Show the section
        console.log('Showing style-specific-options section');
        document.getElementById('style-specific-options').style.display = 'block';
        
        // Add event listeners to new fields for price updates and conditional logic
        Object.keys(styleConfig.specificOptions).forEach(optionKey => {
            const field = document.getElementById(optionKey);
            if (field) {
                field.addEventListener('change', (e) => {
                    updatePricing();
                    handleConditionalFields(styleConfig, optionKey, e.target.value);
                    
                    // Update duration for cornrows when style choice changes
                    if (styleKey === 'cornrows' && optionKey === 'style-choice') {
                        updateDuration();
                    }
                    

                    

                });
                
                // Add input event listener for number fields to update in real-time
                if (field.type === 'number') {
                    field.addEventListener('input', (e) => {
                        // Update duration in real-time for number fields
                        updateDuration();
                    });
                }
            }
        });
    }

    // Function to handle conditional field visibility
    function handleConditionalFields(styleConfig, changedFieldKey, selectedValue) {
        Object.keys(styleConfig.specificOptions).forEach(optionKey => {
            const option = styleConfig.specificOptions[optionKey];
            if (option.dependsOn === changedFieldKey) {
                const container = document.getElementById(`${optionKey}-container`);
                const field = document.getElementById(optionKey);
                
                if (container && field) {
                    if (selectedValue === option.dependsOnValue) {
                        container.style.display = 'block';
                        if (option.required) field.setAttribute('required', 'required');
                    } else {
                        container.style.display = 'none';
                        field.removeAttribute('required');
                        field.value = ''; // Clear the field when hidden
                        updatePricing(); // Update pricing after clearing
                    }
                }
            }
        });
    }



    // Function to filter hair length options based on style
    function updateHairLengthOptions(styleKey) {
        const styleConfig = styleConfigurations[styleKey];
        if (!styleConfig) return;

        const hairLengthSelect = document.getElementById('hair-length');
        const hairLengthSection = document.getElementById('hair-length-section');
        
        // Check if this style has hair length options
        if (!styleConfig.hairLengthOptions || styleConfig.hairLengthOptions.length <= 1) {
            // Hide hair length section for single-length or no-length styles
            if (hairLengthSection) {
                hairLengthSection.style.display = 'none';
            }
            
            // Set a default value if there's a single length option
            if (styleConfig.hairLengthOptions && styleConfig.hairLengthOptions.length === 1) {
                hairLengthSelect.value = styleConfig.hairLengthOptions[0];
            } else {
                hairLengthSelect.value = '';
            }
            return;
        }

        // Show hair length section for multi-length styles
        if (hairLengthSection) {
            hairLengthSection.style.display = 'block';
        }

        // Update hair length options
        const currentLength = hairLengthSelect.value;
        hairLengthSelect.innerHTML = '<option value="">Select length</option>';
        
        styleConfig.hairLengthOptions.forEach(length => {
            const option = document.createElement('option');
            option.value = length;
            
            // Custom descriptions for specific lengths
            let description = '';
            if (length === 'short') {
                description = ' (Above shoulders)';
            } else if (length === 'medium') {
                description = ' (Shoulder length)';
            } else if (length === 'long') {
                description = ' (Below shoulders)';
            } else if (length === 'shoulder') {
                description = ' (Shoulder length)';
            } else if (length === 'midback') {
                description = ' (Mid-back length)';
            } else {
                description = '';
            }
            
            option.textContent = length.charAt(0).toUpperCase() + length.slice(1) + description;
            hairLengthSelect.appendChild(option);
        });
        
        // Restore selection if still valid
        if (styleConfig.hairLengthOptions.includes(currentLength)) {
            hairLengthSelect.value = currentLength;
        }
    }

    // Update pricing when form fields change
    function updatePricing() {
        const selectedStyle = styleSelect.value;
        const selectedHairLength = hairLengthSelect.value;

        let basePrice = 0;
        let styleSpecificPrice = 0;

        // Calculate base price - prioritize style configurations over legacy pricing
        if (selectedStyle) {
            const styleConfig = styleConfigurations[selectedStyle];
            if (styleConfig) {
                // For styles with single length or no length options
                if (!styleConfig.hairLengthOptions || styleConfig.hairLengthOptions.length <= 1) {
                    // Get the first (and likely only) base price value
                    const priceKeys = Object.keys(styleConfig.basePrices);
                    if (priceKeys.length > 0) {
                        basePrice = styleConfig.basePrices[priceKeys[0]];
                    }
                } else if (selectedHairLength && styleConfig.basePrices[selectedHairLength]) {
                    // For styles with multiple length options
                    basePrice = styleConfig.basePrices[selectedHairLength];
                }
            } else if (selectedHairLength && pricingData[selectedStyle]) {
                // Fallback to legacy pricing
                basePrice = pricingData[selectedStyle][selectedHairLength] || 0;
            }
        }

        // Calculate style-specific option prices (includes wash and detangle services)
        const styleConfig = styleConfigurations[selectedStyle];
        if (styleConfig && styleConfig.specificOptions) {
            Object.keys(styleConfig.specificOptions).forEach(optionKey => {
                const field = document.getElementById(optionKey);
                if (field && field.value) {
                    // Handle different field types
                    if (field.tagName === 'SELECT') {
                        const selectedOption = field.options[field.selectedIndex];
                        const priceAddition = parseInt(selectedOption.getAttribute('data-price')) || 0;
                        styleSpecificPrice += priceAddition;
                    } else if (field.tagName === 'INPUT') {
                        // For input fields (like number inputs), use the price from the configuration
                        const optionConfig = styleConfig.specificOptions[optionKey];
                        if (optionConfig && optionConfig.price) {
                            styleSpecificPrice += optionConfig.price;
                        }
                    }
                }
            });
        }

        const totalPrice = basePrice + styleSpecificPrice;
        const depositAmount = Math.round(totalPrice * 0.10 * 100) / 100; // 10% deposit

        // Debug logging
        console.log('updatePricing - Selected style:', selectedStyle);
        console.log('updatePricing - Style config:', styleConfig);
        console.log('updatePricing - Base price:', basePrice);
        console.log('updatePricing - Style specific price:', styleSpecificPrice);
        console.log('updatePricing - Total price:', totalPrice);
        console.log('updatePricing - Deposit amount:', depositAmount);

        // Update display
        document.getElementById('base-price').textContent = `$${basePrice}`;
        document.getElementById('additional-price').textContent = `$${styleSpecificPrice}`;
        document.getElementById('total-price').textContent = `$${totalPrice}`;
        
        // Update deposit display
        document.getElementById('deposit-total-price').textContent = `$${totalPrice}`;
        document.getElementById('deposit-amount').textContent = `$${depositAmount}`;
        document.getElementById('deposit-due').textContent = `$${depositAmount}`;
        
        // Apple Pay temporarily disabled
        /*
        // Update Apple Pay amount if supported
        if (applePaySupported && paymentRequest) {
            paymentRequest.update({
                total: {
                    label: 'Maya African Hair Braiding',
                    amount: Math.round(depositAmount * 100), // Convert to cents
                },
            });
            console.log('Apple Pay amount updated to:', Math.round(depositAmount * 100), 'cents');
        }
        */
    }

    // Duration calculation based on hair length and style
    const durationData = {
        'cornrows': { short: 2, medium: 3, long: 4 },
        'box-braids': { short: 3, medium: 4, long: 6 },
        'fulani-braids': { short: 3, medium: 4, long: 5 },
        'goddess-braids': { short: 3, medium: 4, long: 5 },
        'lemonade-braids': { short: 3, medium: 4, long: 6 },
        'passion-twists': { short: 2, medium: 3, long: 4 },
        'senegalese-twists': { short: 2, medium: 3, long: 4 },
        'marley-twists': { short: 2, medium: 3, long: 4 },
        'two-strand-twists': { short: 2, medium: 3, long: 4 },
        'locs-retwist': { short: 1, medium: 2, long: 2 },
        'starter-locs': { short: 4, medium: 5, long: 6 },
        'weave': { short: 3, medium: 4, long: 5 }
    };

    async function updateDuration() {
        const selectedStyle = styleSelect.value;
        const selectedHairLength = hairLengthSelect.value;
        
        let duration = 0;
        
        // Check if style uses new configuration system
        if (selectedStyle && styleConfigurations[selectedStyle]) {
            const styleConfig = styleConfigurations[selectedStyle];
            
            // Special handling for cornrows (duration is always 1 hour)
            if (selectedStyle === 'cornrows') {
                duration = 1; // Cornrows - always 1 hour regardless of style choice


            } else {
                // For styles with single length or no length options
                if (!styleConfig.hairLengthOptions || styleConfig.hairLengthOptions.length <= 1) {
                    // Get the first (and likely only) duration value
                    const durationKeys = Object.keys(styleConfig.duration);
                    if (durationKeys.length > 0) {
                        duration = styleConfig.duration[durationKeys[0]];
                    }
                } else if (selectedHairLength && styleConfig.duration[selectedHairLength]) {
                    // For styles with multiple length options
                    duration = styleConfig.duration[selectedHairLength];
                }
            }
        } else if (selectedStyle && selectedHairLength && durationData[selectedStyle]) {
            // Fallback to legacy duration data for non-configured styles
            duration = durationData[selectedStyle][selectedHairLength];
        }
        
        if (duration > 0) {
            durationInput.value = duration;
            durationDisplay.innerHTML = `<span>${duration} hours</span>`;
            durationDisplay.classList.add('updated');
            
            // Regenerate time slots if a date is selected
            if (selectedDate) {
                await generateTimeSlots(selectedDate);
            }
        } else {
            durationInput.value = '';
            durationDisplay.innerHTML = '<span>Select options to see estimated duration</span>';
            durationDisplay.classList.remove('updated');
        }
        
        updatePricing();
    }

    // Add event listeners for pricing updates
    styleSelect.addEventListener('change', () => {
        const selectedStyle = styleSelect.value;
        
        if (selectedStyle) {
            // Create style-specific fields
            createStyleSpecificFields(selectedStyle);
            // Update hair options based on style
            updateHairLengthOptions(selectedStyle);
        } else {
            // Hide all options if no style selected
            document.getElementById('style-specific-options').style.display = 'none';
            document.getElementById('hair-length-section').style.display = 'none';
        }
        
        updatePricing();
        updateDuration();
    });
    hairLengthSelect.addEventListener('change', () => updateDuration());


    // Calendar functionality
    let currentDate = new Date();
    let selectedDate = null;
    let selectedTime = null;

    // Business hours
    const businessHours = {
        start: 7, // 7 AM
        end: 18,  // 6 PM
        closedDays: [0] // Sunday (0 = Sunday)
    };

    // Initialize calendar
    function initCalendar() {
        updateCalendar();
        setupCalendarEventListeners();
    }

    async function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('current-month').textContent = `${monthNames[month]} ${year}`;
        
        // Generate calendar days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const calendarDays = document.getElementById('calendar-days');
        calendarDays.innerHTML = '';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculate minimum booking time (30 hours from now)
        const minimumBookingTime = new Date();
        minimumBookingTime.setHours(minimumBookingTime.getHours() + 30);
        const minimumBookingDate = new Date(minimumBookingTime);
        minimumBookingDate.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = date.getDate();
            
            // Check if it's today
            if (date.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            // Check if it's from other month
            if (date.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }
            
            // Check if date is disabled (past date, Sunday, or too soon for booking)
            const isPast = date < today;
            const isSunday = date.getDay() === 0;
            const isTooSoon = date < minimumBookingDate;
            const isUnavailable = isPast || isSunday || isTooSoon;
            
            if (isUnavailable) {
                dayElement.classList.add('disabled');
                if (isTooSoon && !isPast && !isSunday) {
                    dayElement.classList.add('too-soon');
                    dayElement.title = 'Bookings require 30 hours advance notice';
                }
            } else {
                dayElement.addEventListener('click', () => selectDate(date));
            }
            
            calendarDays.appendChild(dayElement);
        }
    }

    function setupCalendarEventListeners() {
        document.getElementById('prev-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateCalendar();
        });
        
        document.getElementById('next-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateCalendar();
        });
    }

    async function selectDate(date) {
        selectedDate = date;
        selectedTime = null;
        
        // Update calendar selection
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
        
        event.target.classList.add('selected');
        
        // Update selected date display
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('selected-date').textContent = date.toLocaleDateString('en-US', options);
        
        // Generate time slots
        await generateTimeSlots(date);
    }

    async function generateTimeSlots(date) {
        const timeSlotsContainer = document.getElementById('time-slots');
        timeSlotsContainer.innerHTML = '';
        
        const isToday = date.toDateString() === new Date().toDateString();
        const currentHour = new Date().getHours();
        const selectedDuration = parseInt(durationInput.value) || 2;
        
        // Fetch existing bookings for this date
        let existingBookings = [];
        try {
            const dateString = date.toISOString().split('T')[0];
            console.log('Fetching bookings for date:', dateString);
            const response = await fetch(`https://getbookingsfordate-2znamu4p5q-uc.a.run.app?date=${dateString}`);
            if (response.ok) {
                const data = await response.json();
                existingBookings = data.bookings || data; // Extract bookings array from response
                console.log('Bookings from Firebase:', existingBookings);
            } else {
                console.log('Firebase Functions not available, checking localStorage');
                // Fallback to localStorage
                const localBookings = JSON.parse(localStorage.getItem('adminBookings') || '[]');
                existingBookings = localBookings.filter(booking => booking.date === dateString);
                console.log('Bookings from localStorage:', existingBookings);
            }
        } catch (error) {
            console.log('Error fetching existing bookings, using localStorage:', error);
            // Fallback to localStorage
            const localBookings = JSON.parse(localStorage.getItem('adminBookings') || '[]');
            existingBookings = localBookings.filter(booking => booking.date === dateString);
            console.log('Bookings from localStorage (fallback):', existingBookings);
        }
        
        // Ensure existingBookings is always an array
        if (!Array.isArray(existingBookings)) {
            console.log('existingBookings is not an array, converting:', existingBookings);
            existingBookings = [];
        }
        
        for (let hour = businessHours.start; hour < businessHours.end; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            
            // Count concurrent bookings for this time slot
            let concurrentBookings = 0;
            const endHour = hour + selectedDuration;
            
            // Check if appointment would extend beyond business hours
            if (endHour > businessHours.end) {
                timeSlot.classList.add('disabled');
                timeSlot.textContent = formatTime(hour);
                timeSlotsContainer.appendChild(timeSlot);
                continue;
            }
            
            // Check if this time slot is too soon (32-hour rule)
            const selectedDateTime = new Date(date);
            selectedDateTime.setHours(hour, 0, 0, 0);
            const now = new Date();
            const minimumBookingTime = new Date();
            minimumBookingTime.setHours(now.getHours() + 24); // 24 hours from now
            const isTooSoon = selectedDateTime < minimumBookingTime;
            
            // Disable past times for today and times too soon (32-hour rule)
            if ((isToday && hour <= currentHour) || isTooSoon) {
                timeSlot.classList.add('disabled', 'too-soon');
                timeSlot.textContent = formatTime(hour);
                timeSlotsContainer.appendChild(timeSlot);
                continue;
            }
            
            // Count concurrent bookings for this time slot
            for (const booking of existingBookings) {
                // Handle different time field names (appointmentTime vs time)
                const bookingTime = booking.appointmentTime || booking.time;
                console.log('Processing booking:', booking, 'bookingTime:', bookingTime);
                const bookingStartHour = parseInt(bookingTime.split(':')[0]);
                const bookingDuration = parseInt(booking.duration);
                // Convert minutes to hours for end time calculation
                const bookingEndHour = bookingStartHour + (bookingDuration / 60);
                
                console.log(`Booking: ${bookingStartHour}:00 - ${bookingEndHour}:00, New: ${hour}:00 - ${endHour}:00`);
                
                // Check if the new appointment overlaps with existing booking
                // Only count as overlap if there's actual time overlap (not just touching)
                if ((hour < bookingEndHour && endHour > bookingStartHour)) {
                    concurrentBookings++;
                    console.log(`Overlap detected! Concurrent bookings for ${hour}:00: ${concurrentBookings}`);
                }
            }
            
            // Set availability status and styling
            console.log(`Time ${hour}:00 - ${concurrentBookings} concurrent bookings`);
            if (concurrentBookings >= 2) {
                // Fully booked - red (2 or more bookings overlap)
                timeSlot.classList.add('disabled', 'fully-booked');
                timeSlot.textContent = formatTime(hour);
                console.log(`Time ${hour}:00 - Fully booked (red) - ${concurrentBookings} overlapping bookings`);
            } else if (concurrentBookings === 1) {
                // Limited availability - orange/yellow (1 booking overlaps)
                timeSlot.classList.add('limited-availability');
                timeSlot.textContent = formatTime(hour);
                timeSlot.addEventListener('click', () => selectTimeSlot(hour, timeSlot));
                console.log(`Time ${hour}:00 - Limited availability (orange) - ${concurrentBookings} overlapping bookings`);
            } else {
                // Available - green (no bookings overlap)
                timeSlot.classList.add('available');
                timeSlot.textContent = formatTime(hour);
                timeSlot.addEventListener('click', () => selectTimeSlot(hour, timeSlot));
                console.log(`Time ${hour}:00 - Available (green) - ${concurrentBookings} overlapping bookings`);
            }
            
            timeSlotsContainer.appendChild(timeSlot);
        }
    }

    function selectTimeSlot(hour, element) {
        selectedTime = hour;
        
        // Update time slot selection
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        
        element.classList.add('selected');
        // Update selected time display next to selected date
        const selectedDateSpan = document.getElementById('selected-date');
        const selectedDateInfo = document.querySelector('.selected-date-info p');
        if (selectedDate && selectedDateSpan && selectedDateInfo) {
            const dateString = selectedDateSpan.textContent;
            const timeString = formatTime(hour);
            
            // Calculate end time based on duration
            const duration = parseInt(durationInput.value) || 2;
            const endHour = hour + duration;
            const endTimeString = formatTime(endHour);
            
            selectedDateInfo.innerHTML = `Selected Date: <span id="selected-date">${dateString}</span> <span style="margin-left:1em; color:#28a745; font-weight:600;">${timeString} - ${endTimeString}</span>`;
        }
    }

    function formatTime(hour) {
        if (hour === 0) return '12:00 AM';
        if (hour < 12) return `${hour}:00 AM`;
        if (hour === 12) return '12:00 PM';
        return `${hour - 12}:00 PM`;
    }



    // Initialize calendar
        initCalendar();

    // Apple Pay temporarily disabled
    /*
    // Handle Apple Pay payment
    async function handleApplePayPayment(paymentMethod) {
        console.log('Processing Apple Pay payment:', paymentMethod);
        
        if (!validateForm()) {
            return;
        }

        // Show loading state
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing Apple Pay...';
        submitBtn.disabled = true;

        try {
            // Collect form data
            const formData = new FormData(bookingForm);
            const totalPrice = parseInt(document.getElementById('total-price').textContent.replace('$', ''));
            const depositAmount = parseFloat(document.getElementById('deposit-due').textContent.replace('$', ''));

            // Collect style-specific options
            const styleSpecificOptions = {};
            const selectedStyle = formData.get('style');
            const styleConfig = styleConfigurations[selectedStyle];
            
            if (styleConfig && styleConfig.specificOptions) {
                Object.keys(styleConfig.specificOptions).forEach(optionKey => {
                    const value = formData.get(optionKey);
                    if (value) {
                        styleSpecificOptions[optionKey] = value;
                } else {
                        if (optionKey === 'wash-service') {
                            styleSpecificOptions[optionKey] = 'no-wash';
                        } else if (optionKey === 'detangle-service') {
                            styleSpecificOptions[optionKey] = 'no-detangle';
                        }
                    }
                });
            }

            const bookingData = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                style: formData.get('style'),
                hairLength: formData.get('hair-length'),
                date: selectedDate.toISOString().split('T')[0],
                time: `${selectedTime.toString().padStart(2, '0')}:00`,
                timeFormatted: formatTime(selectedTime),
                displayTime: formatTime(selectedTime),
                duration: formData.get('duration'),
                notes: formData.get('notes'),
                totalPrice: totalPrice,
                depositAmount: depositAmount,
                depositPaid: true,
                paymentMethod: 'apple_pay',
                bookingId: Date.now().toString(),
                status: 'confirmed',
                styleSpecificOptions: styleSpecificOptions
            };

            // Create payment intent
            const paymentResponse = await fetch('https://createpaymentintent-2znamu4p5q-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: depositAmount * 100,
                    bookingData: bookingData
                })
            });

            if (!paymentResponse.ok) {
                throw new Error('Failed to create payment intent');
            }

            const { clientSecret } = await paymentResponse.json();

            // Confirm the payment with the payment method
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: paymentMethod.id,
            });

            if (error) {
                throw new Error(error.message);
            }

            if (paymentIntent.status === 'succeeded') {
                console.log('Apple Pay payment succeeded:', paymentIntent);
                bookingData.paymentIntentId = paymentIntent.id;
                
                // Save booking to database
                try {
                    const response = await fetch('https://savebooking-2znamu4p5q-uc.a.run.app', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(bookingData)
                    });
                    
                    if (response.ok) {
                        console.log('Booking saved successfully');
        } else {
                        console.log('Firebase Functions not available, will save on success page');
                    }
                } catch (error) {
                    console.log('Error saving to Firebase Functions:', error);
                }

                // Store booking data in sessionStorage
                sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
                window.location.href = 'booking-success.html';
            }
            
        } catch (error) {
            console.error('Apple Pay payment error:', error);
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = 'Apple Pay payment failed. Please try again.';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
    */

    // Form validation
    function validateForm() {
        const requiredFields = ['name', 'phone', 'style'];
        let isValid = true;

        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (!field.value.trim()) {
                field.style.borderColor = '#e74c3c';
                isValid = false;
            } else {
                field.style.borderColor = '#e0e0e0';
            }
        });

        // Check if date and time are selected
        if (!selectedDate) {
            isValid = false;
        }

        if (!selectedTime) {
            isValid = false;
        }

        // Phone number validation
        const phoneField = document.getElementById('phone');
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (phoneField.value && !phoneRegex.test(phoneField.value.replace(/\s/g, ''))) {
            phoneField.style.borderColor = '#e74c3c';
            isValid = false;
        }



        return isValid;
    }
    
    // Handle form submission
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateForm()) {
                return;
            }

        // Show loading state
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing Payment...';
        submitBtn.disabled = true;

        // Collect form data
            const formData = new FormData(bookingForm);
        const totalPrice = parseInt(document.getElementById('total-price').textContent.replace('$', ''));
        const depositAmount = parseFloat(document.getElementById('deposit-due').textContent.replace('$', ''));

                    // Collect style-specific options
        const styleSpecificOptions = {};
        const selectedStyle = formData.get('style');
        const styleConfig = styleConfigurations[selectedStyle];
        
        console.log('Form submission - Selected style:', selectedStyle);
        console.log('Form submission - Style config:', styleConfig);
        
        if (styleConfig && styleConfig.specificOptions) {
            Object.keys(styleConfig.specificOptions).forEach(optionKey => {
                const value = formData.get(optionKey);
                console.log(`Form submission - ${optionKey}:`, value);
                
                // Always include the option, even if it's empty or has a default "no" value
                if (value) {
                    styleSpecificOptions[optionKey] = value;
                } else {
                    // Set default "no" values for wash and detangle services if not selected
                    if (optionKey === 'wash-service') {
                        styleSpecificOptions[optionKey] = 'no-wash';
                    } else if (optionKey === 'detangle-service') {
                        styleSpecificOptions[optionKey] = 'no-detangle';
                    }
                }
            });
        }
        
        console.log('Form submission - Final styleSpecificOptions:', styleSpecificOptions);

            const bookingData = {
                name: formData.get('name'),
                phone: formData.get('phone'),
            style: formData.get('style'),
            hairLength: formData.get('hair-length'),

            date: selectedDate.toISOString().split('T')[0],
            time: `${selectedTime.toString().padStart(2, '0')}:00`, // 24-hour format for Google Calendar
            timeFormatted: formatTime(selectedTime), // Human-readable format for debugging
            displayTime: formatTime(selectedTime), // Keep formatted time for display
            duration: formData.get('duration'),

                notes: formData.get('notes'),
            totalPrice: totalPrice,
            depositAmount: depositAmount,
            depositPaid: false,
            paymentMethod: 'card',

            bookingId: Date.now().toString(),
            status: 'pending', // Will be updated to 'confirmed' when payment succeeds
            styleSpecificOptions: styleSpecificOptions // Include style-specific selections
        };

        try {
            // Apple Pay temporarily disabled
            /*
            // Check if Apple Pay is being used
            if (applePaySupported && applePayButton) {
                // Handle Apple Pay payment
                console.log('Processing Apple Pay payment');
                const { error, paymentIntent } = await applePayButton.confirmPayment();
                
                if (error) {
                    console.error('Apple Pay payment failed:', error);
                    const errorElement = document.getElementById('card-errors');
                    errorElement.textContent = error.message;
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    return;
                }
                
                if (paymentIntent.status === 'succeeded') {
                    console.log('Apple Pay payment succeeded:', paymentIntent);
                    // Update booking data with payment info
                    bookingData.depositPaid = true;
                    bookingData.paymentIntentId = paymentIntent.id;
                    bookingData.status = 'confirmed';
                    bookingData.paymentMethod = 'apple_pay';
                    
                    // Save booking to database
                    try {
                        const response = await fetch('https://savebooking-2znamu4p5q-uc.a.run.app', {
                method: 'POST',
                headers: {
                                'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

                        if (response.ok) {
                            console.log('Booking saved successfully');
                        } else {
                            console.log('Firebase Functions not available, will save on success page');
                        }
                    } catch (error) {
                        console.log('Error saving to Firebase Functions:', error);
                    }

                    // Store booking data in sessionStorage
                    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
                    window.location.href = 'booking-success.html';
                    return;
                }
            }
            */
            
            // Create payment intent on your server for card payment
            console.log('Creating payment intent with amount:', depositAmount * 100, 'cents');
            const paymentResponse = await fetch('https://createpaymentintent-2znamu4p5q-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: depositAmount * 100, // Convert to cents
                    bookingData: bookingData
                })
            });

            console.log('Payment response status:', paymentResponse.status);
            console.log('Payment response ok:', paymentResponse.ok);

            if (!paymentResponse.ok) {
                const errorText = await paymentResponse.text();
                console.error('Payment intent creation failed:', errorText);
                throw new Error(`Failed to create payment intent: ${paymentResponse.status} - ${errorText}`);
            }

            const { clientSecret } = await paymentResponse.json();

            // Confirm payment with Stripe
            console.log('Confirming payment with client secret:', clientSecret);
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: bookingData.name,
                    },
                }
            });
            
            console.log('Payment intent result:', { error, paymentIntent });

            if (error) {
                // Payment failed
                const errorElement = document.getElementById('card-errors');
                errorElement.textContent = error.message;
                submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

            // Payment successful
            if (paymentIntent.status === 'succeeded') {
                console.log('Payment succeeded, payment intent:', paymentIntent);
                // Update booking data with payment info
                bookingData.depositPaid = true;
                bookingData.paymentIntentId = paymentIntent.id;
                bookingData.status = 'confirmed'; // Mark as confirmed since payment succeeded
                // Safely get card last 4 digits if available
                if (paymentIntent.payment_method_details && paymentIntent.payment_method_details.card) {
                    bookingData.cardLast4 = paymentIntent.payment_method_details.card.last4;
                } else {
                    console.log('No payment method details available, setting cardLast4 to N/A');
                    bookingData.cardLast4 = 'N/A';
                }

                // Save booking to database
                try {
                    const response = await fetch('https://savebooking-2znamu4p5q-uc.a.run.app', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(bookingData)
                    });
                    
                    if (response.ok) {
                        console.log('Booking saved successfully');
                    } else {
                        console.log('Firebase Functions not available, will save on success page');
                    }
        } catch (error) {
                    console.log('Error saving to Firebase Functions:', error);
                }

                // Store booking data in sessionStorage to avoid URL length limits
                sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
                window.location.href = 'booking-success.html';
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = 'Payment failed. Please try again.';
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });



    // Initialize pricing
    updatePricing();

    // Handle style parameter from URL
    function getStyleFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('style');
    }

    // Auto-select style from URL parameter (moved to end of initialization)
    const styleFromURL = getStyleFromURL();
    if (styleFromURL) {
        console.log('Style from URL:', styleFromURL);
        // Map the style title to the style value
        const styleMapping = {
            'box-braids': 'box-braids',
            'boho-braids': 'boho-braids',
            'fulani-braids': 'fulani-braids',
            'lemonade-braids': 'lemonade-braids',
            'passion-twists': 'passion-twists',
            'senegalese-twists': 'senegalese-twists',
            'marley-twists': 'marley-twists',
            'two-strand-twists': 'two-strand-twists',
            'locs-retwist': 'locs-retwist',
            'loc-retwist-2-strands': 'loc-retwist-2-strands',
            'barrel-twists': 'barrel-twists',
            'starter-locs': 'starter-locs',
            'weave': 'weave',
            'cornrows': 'cornrows',
            'jumbo-braids': 'jumbo-braids',
            'stitch-braids': 'stitch-braids',
            'tribal-braids': 'tribal-braids'
        };
        
        const styleValue = styleMapping[styleFromURL];
        if (styleValue) {
            console.log('Setting style to:', styleValue);
            styleSelect.value = styleValue;
            
            // Create style-specific fields
            console.log('Creating style-specific fields for:', styleValue);
            createStyleSpecificFields(styleValue);
            
            // Update hair length options
            console.log('Updating hair length options for:', styleValue);
            updateHairLengthOptions(styleValue);
            
            // Update pricing
            console.log('Updating pricing for:', styleValue);
            updatePricing();
            
            // Update duration
            console.log('Updating duration for:', styleValue);
            updateDuration();
            
            // Trigger the change event to update the form
            console.log('Triggering change event for:', styleValue);
            styleSelect.dispatchEvent(new Event('change'));
            
            console.log('Style auto-selection completed for:', styleValue);
        }
    }

    // Admin login button functionality
    const adminLoginBtn = document.getElementById('admin-login-btn');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', function() {
            window.location.href = 'admin.html';
        });
    }
});
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Stripe with the public key
const stripe = Stripe('pk_test_51REifLRqvuBtPAdXr3sOBg5kM3cH3RhEXxQiRGPc4uW9gV3RtZnoiUF2Qvzru3I9fzKmxXUgF22tzJBoYZS3XqYf00QA6fSLqs');

// Initialize Firebase (will be initialized when Firebase scripts are loaded)
let db;

// Global variables
let selectedDate = null;
let currentDate = new Date();
let unavailableTimes = [];
let isFetchingUnavailableTimes = false;
let selectedTimeSlot = null;

// Pricing and Duration Model
const styleInfo = {
    'Box Braids': {
        basePrice: 230,
        baseDuration: 240,
        variations: {
            'regular': {
                name: 'Regular Box Braids',
                priceMultiplier: 1
            },
            'knotless': {
                name: 'Knotless Box Braids',
                priceMultiplier: 1.1
            }
        },
        hasLengthOptions: true,
        hasHairOptions: true
    },
    'Boho Box Braids': {
        basePrice: 250,
        baseDuration: 240,
        longLengthPrice: 280,
        hasLengthOptions: true,
        hasHairOptions: true
    },
    'Cornrows': {
        basePrice: 60,
        baseDuration: 90,
        hasLengthOptions: false,
        hasHairOptions: false,
        variations: {
            'straight-back': {
                name: 'Straight Back Cornrows',
                priceMultiplier: 1
            },
            'styled': {
                name: 'Styled/Designed Cornrows',
                priceMultiplier: 1.33333
            }
        }
    },
    'Jumbo Box Braids': {
        basePrice: 200,
        baseDuration: 180,
        longLengthPrice: 230,
        hasLengthOptions: true,
        hasHairOptions: true
    },
    'Fulani Braids': {
        basePrice: 230,
        baseDuration: 300,
        hasLengthOptions: false,
        hasHairOptions: true
    },
    'Goddess Braids': {
        basePrice: 230,
        baseDuration: 270,
        hasLengthOptions: false,
        hasHairOptions: true
    },
    'Lemonade Braids': {
        basePrice: 230,
        baseDuration: 240,
        hasLengthOptions: false,
        hasHairOptions: true
    },
    'Marley Twists': {
        basePrice: 230,
        baseDuration: 240,
        hasLengthOptions: false,
        hasHairOptions: true
    },
    'Passion Twist': {
        basePrice: 250,
        baseDuration: 210,
        hasLengthOptions: false,
        hasHairOptions: true
    },
    'Loc Retwist': {
        basePrice: 120,
        baseDuration: 120,
        hasLengthOptions: false,
        hasHairOptions: false,
        isVariablePricing: true,
        pricingNote: 'Final price will be discussed depending on the amount of locs you have'
    },
    'Loc Retwist 2 Strand': {
        basePrice: 150,
        baseDuration: 150,
        hasLengthOptions: false,
        hasHairOptions: false,
        isVariablePricing: true,
        pricingNote: 'Final price will be discussed depending on the amount of locs you have'
    },
    'Loc Retwist Barrel': {
        basePrice: 130,
        baseDuration: 120,
        hasLengthOptions: false,
        hasHairOptions: false
    },
    'Weave Install': {
        basePrice: 130,
        baseDuration: 180,
        hasLengthOptions: false,
        hasHairOptions: false,
        isVariablePricing: true,
        pricingNote: 'Final price will be discussed depending on the service requirements'
    },
    'Senegalese Twists': {
        basePrice: 250,
        baseDuration: 270,
        hasLengthOptions: false,
        hasHairOptions: true
    },
    'Starter Locs': {
        basePrice: 150,
        baseDuration: 180,
        hasLengthOptions: false,
        hasHairOptions: false
    },
    'Stitch Braids': {
        basePrice: 150,
        baseDuration: 180,
        hasLengthOptions: false,
        hasHairOptions: true
    },
    'Tribal Braids': {
        basePrice: 230,
        baseDuration: 360,
        hasLengthOptions: false,
        hasHairOptions: true
    },
    'Two Strand Twist': {
        basePrice: 120,
        baseDuration: 210,
        hasLengthOptions: false,
        hasHairOptions: false
    },
    'Weave': { 
        basePrice: 250, 
        baseDuration: 180,
        hasLengthOptions: false,
        hasHairOptions: false
    },
    'Test Style': {
        basePrice: 3.33,
        baseDuration: 30,
        hasLengthOptions: false,
        hasHairOptions: false,
        isTestStyle: true
    }
};

const lengthMultipliers = {
    'medium': {
        price: 1,
        duration: 1
    },
    'long': {
        price: 1.1,
        duration: 1.2
    }
};

const addOnCosts = {
    'wash': {
        price: 20,
        duration: 30
    },
    'human-hair': {
        price: 50,
        duration: 0
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firestore
    db = firebase.firestore();

    // Get style from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const selectedStyle = urlParams.get('style');
    if (selectedStyle) {
        const selectedStyleInput = document.getElementById('selected-style');
        if (selectedStyleInput) {
            selectedStyleInput.value = selectedStyle;
            // Trigger price calculation
            calculatePrice();
        }
    }

    // Initialize form elements
    const bookingForm = document.getElementById('booking-form');
    const selectedStyleInput = document.getElementById('selected-style');
    const boxBraidsVariationGroup = document.getElementById('box-braids-variation-group');
    const boxBraidsVariationSelect = document.getElementById('box-braids-variation');
    const cornrowsVariationGroup = document.getElementById('cornrows-variation-group');
    const cornrowsVariationSelect = document.getElementById('cornrows-variation');
    const twoStrandTwistsVariationGroup = document.getElementById('two-strand-twists-variation-group');
    const twoStrandTwistsVariationSelect = document.getElementById('two-strand-twists-variation');
    const hairLengthSelect = document.getElementById('hair-length');
    const hairOptionSelect = document.getElementById('hair-option');
    const preWashSelect = document.getElementById('pre-wash-option');
    const currentHairImageInput = document.getElementById('current-hair-image');
    const currentHairPreview = document.getElementById('current-hair-preview');
    const currentHairPreviewImg = document.getElementById('current-hair-preview-img');
    const removeCurrentHairImageBtn = document.getElementById('remove-current-hair-image');
    const referenceImageInput = document.getElementById('reference-image');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const removeImageBtn = document.getElementById('remove-image');
    const promoCodeInput = document.getElementById('promo-code');
    const promoFeedback = document.getElementById('promo-feedback');
    const durationElement = document.getElementById('estimated-duration');
    const totalPriceElement = document.getElementById('total-price');
    const depositAmountElement = document.getElementById('deposit-amount');
    const calendarElement = document.getElementById('calendar');
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const appointmentDateTimeInput = document.getElementById('appointment-datetime');

    // Show relevant variation fields based on selected style
    if (selectedStyle === "Box Braids" || selectedStyle === "Jumbo Box Braids") {
        boxBraidsVariationGroup.style.display = 'block';
    } else if (selectedStyle === "Cornrows") {
        cornrowsVariationGroup.style.display = 'block';
    } else if (selectedStyle === "Two Strand Twist") {
        twoStrandTwistsVariationGroup.style.display = 'block';
    }

    // Initialize visibility of hair length and options based on style
    const baseInfo = styleInfo[selectedStyle];
    if (baseInfo) {
        const hairLengthGroup = document.getElementById('hair-length-group');
        const hairOptionGroup = document.getElementById('hair-option-group');
        
        // Show/hide hair length options
        if (hairLengthGroup) {
            hairLengthGroup.style.display = baseInfo.hasLengthOptions ? 'block' : 'none';
            if (!baseInfo.hasLengthOptions) {
                document.getElementById('hair-length').value = '';
            }
        }

        // Show/hide hair option selection
        if (hairOptionGroup) {
            hairOptionGroup.style.display = baseInfo.hasHairOptions ? 'block' : 'none';
            if (!baseInfo.hasHairOptions) {
                document.getElementById('hair-option').value = 'synthetic';
            }
        }

        // Initialize price calculation
        calculatePrice();
    }
    
    // Create calendar structure
    function createCalendarStructure() {
        calendarElement.innerHTML = `
            <div class="calendar-wrapper">
                <div class="calendar-header">
                    <button id="prev-month" class="calendar-nav-btn">&lt;</button>
                    <div id="calendar-month-year"></div>
                    <button id="next-month" class="calendar-nav-btn">&gt;</button>
                </div>
                <div class="calendar-weekdays">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                </div>
                <div id="calendar-days" class="calendar-days"></div>
            </div>
        `;
    }

    // Initialize the calendar
    function initCalendar() {
        createCalendarStructure();
        currentDate.setDate(1); // Set to first day of current month
        renderCalendar();
        fetchUnavailableTimes(); // Fetch initial unavailable times
        
        // Add navigation event listeners
        document.getElementById('prev-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
            fetchUnavailableTimes(); // Refresh unavailable times for new month
        });
        
        document.getElementById('next-month').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
            fetchUnavailableTimes(); // Refresh unavailable times for new month
        });
    }

    // Helper function to check if a date is in the past
    function isDateInPast(dateToCheck) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateToCheck.setHours(0, 0, 0, 0);
        return dateToCheck < today;
    }

    // Helper function to check if a time slot is in the past
    function isTimeSlotInPast(slotDateTime) {
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
        return slotDateTime < thirtyMinutesFromNow;
    }

    // Render the calendar
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update header
        const monthYear = document.getElementById('calendar-month-year');
        monthYear.textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Clear previous calendar
        const daysContainer = document.getElementById('calendar-days');
        daysContainer.innerHTML = '';
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            daysContainer.appendChild(emptyDay);
        }
        
        // Add the days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            const currentDateToCheck = new Date(year, month, day);
            
            // Check if this day is today
            const today = new Date();
            if (currentDateToCheck.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            // Check if this day is in the past or is a Sunday
            if (isDateInPast(new Date(year, month, day)) || currentDateToCheck.getDay() === 0) {
                dayElement.classList.add('past');
                if (currentDateToCheck.getDay() === 0) {
                    dayElement.title = 'Closed on Sundays';
                }
            } else {
                // Add click event for future dates
                dayElement.addEventListener('click', () => {
                    // Remove previous selection
                    const prevSelected = document.querySelector('.calendar-day.selected');
                    if (prevSelected) {
                        prevSelected.classList.remove('selected');
                    }
                    
                    // Add selected class
                    dayElement.classList.add('selected');
                    selectedDate = currentDateToCheck;
                    
                    // Show time slots
                    showTimeSlots(currentDateToCheck);
                });
            }
            
            daysContainer.appendChild(dayElement);
        }
    }
    
    // Check if a time slot is unavailable
    function isSlotUnavailable(slotDateTime, appointmentDuration) {
        // Convert appointment duration from minutes to milliseconds
        const appointmentDurationMs = appointmentDuration * 60 * 1000;
        const slotEndTime = new Date(slotDateTime.getTime() + appointmentDurationMs);

        // Count how many overlapping appointments exist for this time slot
        const concurrentAppointments = unavailableTimes.filter(unavailable => {
            const unavailableStart = new Date(unavailable.start);
            const unavailableEnd = new Date(unavailable.end);

            // Check for any type of overlap
            return (
                (slotDateTime >= unavailableStart && slotDateTime < unavailableEnd) || // New appointment starts during existing
                (slotEndTime > unavailableStart && slotEndTime <= unavailableEnd) || // New appointment ends during existing
                (slotDateTime <= unavailableStart && slotEndTime >= unavailableEnd) // New appointment encompasses existing
            );
        }).length;

        // Allow booking if there are fewer than 2 concurrent appointments
        const isUnavailable = concurrentAppointments >= 2;

        if (isUnavailable) {
            console.log('Slot unavailable - too many concurrent appointments:', {
                slot: {
                    start: slotDateTime.toISOString(),
                    end: slotEndTime.toISOString()
                },
                concurrentCount: concurrentAppointments
            });
        }

        return isUnavailable;
    }

    // Show time slots for selected date
    function showTimeSlots(date) {
        if (!date) return;

        // Clear previous time slots
        timeSlotsContainer.innerHTML = '<h3>Select Time</h3>';
        timeSlotsContainer.classList.remove('hidden');

        // Use selected style or a default if not set
        const selectedStyle = selectedStyleInput.value;
        const styleData = styleInfo[selectedStyle] || { basePrice: 150, baseDuration: 240 };

        // Calculate total duration in minutes
        const lengthMultiplier = lengthMultipliers[hairLengthSelect.value]?.duration || 1;
        const baseDuration = styleData.baseDuration;
        const washDuration = preWashSelect.value === 'wash' ? addOnCosts.wash.duration : 0;
        const totalDuration = Math.ceil((baseDuration * lengthMultiplier) + washDuration);

        // Create time slots wrapper
        const timeSlotsWrapper = document.createElement('div');
        timeSlotsWrapper.className = 'time-slots-wrapper';

        let availableCount = 0;
        timeSlots.forEach(timeSlot => {
            const timeButton = document.createElement('button');
            timeButton.type = 'button';
            timeButton.className = 'time-slot-btn';
            timeButton.textContent = timeSlot;

            // Convert timeSlot string to Date object
            const [time, meridiem] = timeSlot.split(' ');
            const [hours, minutes] = time.split(':');
            const slotDateTime = new Date(date);
            let hour = parseInt(hours);
            if (meridiem === 'PM' && hour !== 12) hour += 12;
            if (meridiem === 'AM' && hour === 12) hour = 0;
            slotDateTime.setHours(hour, parseInt(minutes), 0, 0);

            // Check if slot is in the past or has too many concurrent appointments
            const isInPast = isTimeSlotInPast(slotDateTime);
            const isUnavailable = isSlotUnavailable(slotDateTime, totalDuration);

            if (isInPast || isUnavailable) {
                timeButton.disabled = true;
                timeButton.classList.add('unavailable');
                timeButton.title = isInPast ? 'This time has passed' : 'This time slot is fully booked';
            } else {
                // Count concurrent appointments for this slot
                const concurrentCount = unavailableTimes.filter(unavailable => {
                    const unavailableStart = new Date(unavailable.start);
                    const unavailableEnd = new Date(unavailable.end);
                    const slotEndTime = new Date(slotDateTime.getTime() + (totalDuration * 60 * 1000));

                    return (
                        (slotDateTime >= unavailableStart && slotDateTime < unavailableEnd) ||
                        (slotEndTime > unavailableStart && slotEndTime <= unavailableEnd) ||
                        (slotDateTime <= unavailableStart && slotEndTime >= unavailableEnd)
                    );
                }).length;

                availableCount++;
                if (concurrentCount === 1) {
                    timeButton.classList.add('concurrent-one');
                }
                timeButton.title = concurrentCount === 1 ? 'One stylist already booked at this time' : 'Available';
                
                timeButton.addEventListener('click', () => {
                    document.querySelectorAll('.time-slot-btn').forEach(btn => btn.classList.remove('active'));
                    timeButton.classList.add('active');
                    selectedTimeSlot = timeSlot;

                    const isoDateTime = new Date(date);
                    const [time, meridiem] = timeSlot.split(' ');
                    const [hours, minutes] = time.split(':');
                    let hour = parseInt(hours);
                    if (meridiem === 'PM' && hour !== 12) hour += 12;
                    if (meridiem === 'AM' && hour === 12) hour = 0;
                    isoDateTime.setHours(hour, parseInt(minutes), 0, 0);
                    appointmentDateTimeInput.value = isoDateTime.toISOString();
                });
            }
            timeSlotsWrapper.appendChild(timeButton);
        });

        if (availableCount === 0) {
            const msg = document.createElement('div');
            msg.style.color = '#888';
            msg.style.margin = '2rem 0';
            msg.style.textAlign = 'center';
            msg.textContent = 'No available times for this day. Please select another date.';
            timeSlotsContainer.appendChild(msg);
        }

        timeSlotsContainer.appendChild(timeSlotsWrapper);
    }

    function formatTimeForISO(timeSlot) { // e.g., "9:00 AM"
        const [time, period] = timeSlot.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function formatDuration(minutes) {
        if (isNaN(minutes) || minutes === 0) return "TBD";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        let durationString = '';
        if (hours > 0) durationString += `${hours}h`;
        if (mins > 0) durationString += ` ${mins}m`;
        return durationString.trim();
    }

    function calculatePrice() {
        const selectedStyle = document.getElementById('selected-style').value;
        const hairLength = document.getElementById('hair-length').value;
        const hairOption = document.getElementById('hair-option').value;
        const preWashOption = document.getElementById('pre-wash-option').value;
        const cornrowsVariation = document.getElementById('cornrows-variation')?.value;
        
        const totalPriceElement = document.getElementById('total-price');
        const durationElement = document.getElementById('estimated-duration');
        const depositAmountElement = document.getElementById('deposit-amount');
        const hairLengthGroup = document.getElementById('hair-length-group');
        const cornrowsGroup = document.getElementById('cornrows-variation-group');
        const hairOptionGroup = document.getElementById('hair-option-group');
        const pricingNoteElement = document.getElementById('pricing-note');

        // Reset UI elements if no style is selected or style doesn't exist
        if (!selectedStyle || !styleInfo[selectedStyle]) {
            totalPriceElement.textContent = '$0';
            durationElement.textContent = 'TBD';
            depositAmountElement.textContent = '$0';
            if (pricingNoteElement) pricingNoteElement.style.display = 'none';
            if (hairLengthGroup) hairLengthGroup.style.display = 'none';
            if (cornrowsGroup) cornrowsGroup.style.display = 'none';
            if (hairOptionGroup) hairOptionGroup.style.display = 'none';
            return { price: 0, duration: 0 };
        }

        const baseInfo = styleInfo[selectedStyle];

        // Show/hide relevant form sections
        if (hairLengthGroup) {
            hairLengthGroup.style.display = baseInfo.hasLengthOptions ? 'block' : 'none';
            if (!baseInfo.hasLengthOptions) {
                document.getElementById('hair-length').value = '';
            }
        }

        // Show/hide cornrows variation selection
        if (cornrowsGroup) {
            cornrowsGroup.style.display = selectedStyle === 'Cornrows' ? 'block' : 'none';
        }

        // Show/hide hair option selection
        if (hairOptionGroup) {
            hairOptionGroup.style.display = baseInfo.hasHairOptions ? 'block' : 'none';
            if (!baseInfo.hasHairOptions) {
                document.getElementById('hair-option').value = 'synthetic';
            }
        }

        // Show/hide pricing note
        if (pricingNoteElement) {
            if (baseInfo.isVariablePricing && baseInfo.pricingNote) {
                pricingNoteElement.textContent = baseInfo.pricingNote;
                pricingNoteElement.style.display = 'block';
            } else {
                pricingNoteElement.style.display = 'none';
            }
        }

        let finalPrice = baseInfo.basePrice;
        let finalDuration = baseInfo.baseDuration;

        // Apply cornrows variation pricing
        if (selectedStyle === 'Cornrows' && cornrowsVariation && baseInfo.variations[cornrowsVariation]) {
            finalPrice *= baseInfo.variations[cornrowsVariation].priceMultiplier;
        }

        // For non-variable pricing styles, apply length and hair options
        if (!baseInfo.isVariablePricing) {
            // Apply length multiplier only if style has length options
            if (baseInfo.hasLengthOptions && hairLength === 'long') {
                if (selectedStyle === 'Boho Box Braids' || selectedStyle === 'Jumbo Box Braids') {
                    finalPrice = baseInfo.longLengthPrice;
                } else {
                    finalPrice = 250;
                }
                finalDuration *= lengthMultipliers['long'].duration;
            }

            // Add human hair cost if selected and style has hair options
            if (baseInfo.hasHairOptions && hairOption === 'human-hair') {
                finalPrice += addOnCosts['human-hair'].price;
            }
        }

        // Add wash cost if selected (applies to all styles)
        if (preWashOption === 'wash') {
            finalPrice += addOnCosts['wash'].price;
            finalDuration += addOnCosts['wash'].duration;
        }

        // Calculate deposit based on the current total price
        const deposit = finalPrice * 0.30;

        // Update UI
        if (baseInfo.isVariablePricing) {
            totalPriceElement.textContent = `$${finalPrice}+`;
            depositAmountElement.textContent = `$${deposit.toFixed(2)}`;
            durationElement.textContent = formatDuration(finalDuration);
        } else if (baseInfo.hasLengthOptions && !hairLength) {
            const minPrice = baseInfo.basePrice;
            const maxPrice = baseInfo.longLengthPrice || 250;
            const minDuration = baseInfo.baseDuration;
            const maxDuration = baseInfo.baseDuration * lengthMultipliers['long'].duration;
            
            totalPriceElement.textContent = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
            durationElement.textContent = `${formatDuration(minDuration)} - ${formatDuration(maxDuration)}`;
            depositAmountElement.textContent = 'Calculated upon selection';
        } else {
            totalPriceElement.textContent = `$${finalPrice.toFixed(2)}`;
            durationElement.textContent = formatDuration(finalDuration);
            depositAmountElement.textContent = `$${deposit.toFixed(2)}`;
        }

        return { price: finalPrice, duration: finalDuration };
    }

    // Initialize price calculation
    calculatePrice();

    async function uploadImage(file) {
        const storageRef = firebase.storage().ref();
        const fileName = `${Date.now()}-${file.name}`;
        const fileRef = storageRef.child(fileName);
        await fileRef.put(file);
        return fileRef.getDownloadURL();
    }

    // Initialize everything when the page loads
    if (calendarElement && timeSlotsContainer) {
        initCalendar();
        fetchUnavailableTimes(); // Fetch initial unavailable times
        
        // Add event listeners for form fields that affect duration
        hairLengthSelect.addEventListener('change', () => {
            calculatePrice();
            if (selectedDate) {
                showTimeSlots(selectedDate); // Refresh time slots when duration changes
            }
        });
        
        preWashSelect.addEventListener('change', () => {
            calculatePrice();
            if (selectedDate) {
                showTimeSlots(selectedDate);
            }
        });
        
        // Refresh unavailable times periodically
        setInterval(fetchUnavailableTimes, 5 * 60 * 1000); // Refresh every 5 minutes
    } else {
        console.error('Calendar element not found!');
    }

    // Add event listeners for price calculation
    hairLengthSelect.addEventListener('change', calculatePrice);
    hairOptionSelect.addEventListener('change', calculatePrice);
    preWashSelect.addEventListener('change', calculatePrice);
    
    // Handle form submission
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Disable submit button and show loading state
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            // Validate current hair photo
            const currentHairImage = document.getElementById('current-hair-image').files[0];
            if (!currentHairImage) {
                alert('Please provide a current photo of your hair.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Book Appointment';
                return;
            }

            // Validate appointment date and time
            const appointmentDateTime = formData.get('appointment-datetime');
            if (!appointmentDateTime) {
                alert('Please select a date and time for your appointment.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Book Appointment';
                return;
            }

            submitBtn.textContent = 'Uploading Images...';
            
            // Upload images
            const referenceImage = document.getElementById('reference-image').files[0];
            const currentHairImageUrl = await uploadImage(currentHairImage);
            const referenceImageUrl = referenceImage ? await uploadImage(referenceImage) : null;

            // Get form data
            const formData = new FormData(bookingForm);
            const { price, duration } = calculatePrice();

            // Create booking data object
            const bookingData = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                appointmentDateTime: formData.get('appointment-datetime'),
                selectedStyle: formData.get('selected-style'),
                hairLength: formData.get('hair-length'),
                hairOption: formData.get('hair-option'),
                preWashOption: formData.get('pre-wash-option'),
                notes: formData.get('notes'),
                totalPrice: price,
                duration: duration,
                currentHairImageURL: currentHairImageUrl,
                referenceImageURL: referenceImageUrl,
                boxBraidsVariation: formData.get('box-braids-variation'),
                cornrowsVariation: formData.get('cornrows-variation'),
                twoStrandTwistsVariation: formData.get('two-strand-twists-variation')
            };

            submitBtn.textContent = 'Creating Checkout...';

            // Create Stripe checkout session
            const response = await fetch(ENDPOINTS.CREATE_BOOKING, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Server error');
            }

            const { sessionId } = await response.json();
            
            // Redirect to Stripe Checkout
            const result = await stripe.redirectToCheckout({
                sessionId: sessionId
            });

            if (result.error) {
                throw new Error(result.error.message);
            }
            
        } catch (error) {
            console.error("Error creating checkout session:", error);
            alert(`Could not process payment: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Book Appointment';
        }
    });

    // Fetch unavailable times from Firestore
    async function fetchUnavailableTimes() {
        if (isFetchingUnavailableTimes) {
            console.log('Already fetching unavailable times, skipping duplicate request');
            return;
        }

        isFetchingUnavailableTimes = true;

        try {
            const db = firebase.firestore();
            const bookingsSnapshot = await db.collection('bookings')
                .where('status', 'in', ['confirmed', 'pending'])
                .get();

            // Convert bookings to unavailable time slots
            unavailableTimes = bookingsSnapshot.docs.map(doc => {
                const booking = doc.data();
                const startTime = new Date(booking.appointmentDateTime);
                const duration = parseInt(booking.duration) || 0;
                let startISO = null, endISO = null;
                if (!isNaN(startTime.getTime())) {
                    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
                    startISO = startTime.toISOString();
                    endISO = endTime.toISOString();
                } else {
                    console.warn('Invalid appointmentDateTime:', booking.appointmentDateTime, booking);
                }
                return {
                    start: startISO,
                    end: endISO
                };
            }).filter(slot => slot.start && slot.end); // Only keep valid slots

            // If a date is selected, refresh the time slots
            if (selectedDate) {
                showTimeSlots(selectedDate);
            }

            return unavailableTimes;
        } catch (error) {
            console.error('Error fetching unavailable times:', error);
            if (error.message !== 'Failed to fetch' && !error.message.includes('Network Error')) {
                alert('There was an error loading the calendar. Please refresh the page or try again later.');
            }
            return [];
        } finally {
            isFetchingUnavailableTimes = false;
        }
    }

    // Calculate initial price
    calculatePrice();

    // Available time slots (9 AM to 7 PM, 30-minute intervals)
    const timeSlots = [
        '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
        '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
        '6:00 PM', '6:30 PM', '7:00 PM'
    ];
});
// Initialize Firebase (commented out - will use when we have client credentials)
// firebase.initializeApp(firebaseConfig);

// Initialize Supabase
let supabaseClient = null;
if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) {
    try {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
} else {
    console.warn('Supabase not configured. Please add your Supabase credentials to config.js');
}

// Stripe is initialized lazily so production can use the publishable key from the API.
let stripeInstance = null;

// Initialize Firebase (will be initialized when Firebase scripts are loaded) - commented out
// let db;

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
    // Initialize Firestore (commented out - will use when we have client credentials)
    // db = firebase.firestore();

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
    const selectedDateDisplayEl = document.getElementById('selected-date-display');
    const paymentContactNameInput = document.getElementById('payment-contact-name');
    const paymentContactEmailInput = document.getElementById('payment-contact-email');

    // Populate style dropdown from styleInfo
    if (selectedStyleInput && Object.keys(styleInfo).length) {
        const fragment = document.createDocumentFragment();
        Object.keys(styleInfo).sort().forEach(function(styleName) {
            const opt = document.createElement('option');
            opt.value = styleName;
            opt.textContent = styleName;
            fragment.appendChild(opt);
        });
        selectedStyleInput.appendChild(fragment);
    }

    // Get style from URL if present and pre-select it
    const urlParams = new URLSearchParams(window.location.search);
    const urlStyle = urlParams.get('style');
    if (urlStyle && styleInfo[urlStyle] && selectedStyleInput) {
        selectedStyleInput.value = urlStyle;
    }

    // Update variation groups, hair length/option visibility, and pricing when style changes
    function updateStyleDependentFields(styleName) {
        if (boxBraidsVariationGroup) {
            boxBraidsVariationGroup.style.display = (styleName === 'Box Braids' || styleName === 'Jumbo Box Braids') ? 'block' : 'none';
        }
        if (cornrowsVariationGroup) {
            cornrowsVariationGroup.style.display = styleName === 'Cornrows' ? 'block' : 'none';
        }
        if (twoStrandTwistsVariationGroup) {
            twoStrandTwistsVariationGroup.style.display = styleName === 'Two Strand Twist' ? 'block' : 'none';
        }

        const hairLengthGroup = document.getElementById('hair-length-group');
        const hairOptionGroup = document.getElementById('hair-option-group');
        const baseInfo = styleName ? styleInfo[styleName] : null;

        if (hairLengthGroup) {
            hairLengthGroup.style.display = (baseInfo && baseInfo.hasLengthOptions) ? 'block' : 'none';
            if (!baseInfo || !baseInfo.hasLengthOptions) {
                if (hairLengthSelect) hairLengthSelect.value = '';
            }
        }
        if (hairOptionGroup) {
            hairOptionGroup.style.display = (baseInfo && baseInfo.hasHairOptions) ? 'block' : 'none';
            if (!baseInfo || !baseInfo.hasHairOptions) {
                if (hairOptionSelect) hairOptionSelect.value = 'synthetic';
            }
        }

        calculatePrice();
        if (selectedDate) {
            showTimeSlots(selectedDate);
        }
    }

    updateStyleDependentFields(selectedStyleInput ? selectedStyleInput.value : '');

    if (selectedStyleInput) {
        selectedStyleInput.addEventListener('change', function() {
            updateStyleDependentFields(selectedStyleInput.value);
        });
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
    async function initCalendar() {
        createCalendarStructure();
        currentDate.setDate(1); // Set to first day of current month
        renderCalendar();
        // Fetch initial unavailable times for the current month
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        await fetchUnavailableTimes(firstDayOfMonth);
        
        // Add navigation event listeners
        document.getElementById('prev-month').addEventListener('click', async () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
            // Fetch unavailable times for the first day of the new month
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            await fetchUnavailableTimes(firstDayOfMonth);
            // If a date was selected, refresh time slots
            if (selectedDate) {
                showTimeSlots(selectedDate);
            }
        });
        
        document.getElementById('next-month').addEventListener('click', async () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
            // Fetch unavailable times for the first day of the new month
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            await fetchUnavailableTimes(firstDayOfMonth);
            // If a date was selected, refresh time slots
            if (selectedDate) {
                showTimeSlots(selectedDate);
            }
        });
    }

    // Helper function to check if a date is in the past
    function isDateInPast(dateToCheck) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dateToCheck.setHours(0, 0, 0, 0);
        return dateToCheck < today;
    }

    // Blocked date ranges (e.g. vacation, closed weeks). Format: { month: 0-11, startDay: 1-31, endDay: 1-31, year: optional }
    const BLOCKED_DATE_RANGES = [
        { month: 2, startDay: 14, endDay: 21, year: 2026 }  // March 14-21, 2026
    ];

    function isDateBlocked(dateToCheck) {
        const d = new Date(dateToCheck);
        const month = d.getMonth();
        const day = d.getDate();
        const year = d.getFullYear();
        return BLOCKED_DATE_RANGES.some(function(range) {
            if (range.year && year !== range.year) return false;
            return month === range.month && day >= range.startDay && day <= range.endDay;
        });
    }

    // Helper function to check if a date is within 48 hours (blocked - requires 48h advance notice)
    function isDateWithin48Hours(dateToCheck) {
        const now = new Date();
        const minBookableTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        // Earliest appointment on the date is 9:00 AM
        const earliestSlotOnDate = new Date(dateToCheck);
        earliestSlotOnDate.setHours(9, 0, 0, 0);
        return earliestSlotOnDate < minBookableTime;
    }

    // Helper function to check if a time slot is in the past
    function isTimeSlotInPast(slotDateTime) {
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
        const isPast = slotDateTime < thirtyMinutesFromNow;
        
        // Only check if it's past if the date is today
        const slotDate = new Date(slotDateTime);
        const today = new Date();
        const isToday = slotDate.toDateString() === today.toDateString();
        
        return isToday && isPast;
    }

    function formatSelectedDateDisplay(date, startTimeSlot, durationMinutes) {
        if (!selectedDateDisplayEl) return;
        if (!date) {
            selectedDateDisplayEl.textContent = 'Selected Date: —';
            return;
        }
        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        var dateStr = date.toLocaleDateString('en-US', options);
        if (!startTimeSlot) {
            selectedDateDisplayEl.textContent = 'Selected Date: ' + dateStr;
            return;
        }
        var start = startTimeSlot;
        var end = formatTimeRangeEnd(startTimeSlot, durationMinutes);
        selectedDateDisplayEl.innerHTML = 'Selected Date: ' + dateStr + ' <span class="selected-date-time">' + start + ' – ' + end + '</span>';
    }

    function formatTimeRangeEnd(startTimeSlot, durationMinutes) {
        var parts = startTimeSlot.split(' ');
        var timePart = parts[0];
        var meridiem = parts[1];
        var hm = timePart.split(':').map(Number);
        var totalMins = hm[0] * 60 + hm[1];
        if (meridiem === 'PM' && hm[0] !== 12) totalMins += 12 * 60;
        if (meridiem === 'AM' && hm[0] === 12) totalMins -= 12 * 60;
        totalMins += durationMinutes;
        var dayOverflow = Math.floor(totalMins / (24 * 60));
        totalMins = totalMins % (24 * 60);
        if (totalMins < 0) totalMins += 24 * 60;
        var endHour = Math.floor(totalMins / 60) % 24;
        var endMin = totalMins % 60;
        var period = endHour >= 12 ? 'PM' : 'AM';
        if (endHour > 12) endHour -= 12;
        if (endHour === 0) endHour = 12;
        return (endHour + ':' + String(endMin).padStart(2, '0') + ' ' + period);
    }

    // Render the calendar
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update header
        const monthYear = document.getElementById('calendar-month-year');
        if (monthYear) {
            monthYear.textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const daysContainer = document.getElementById('calendar-days');
        if (!daysContainer) return;
        daysContainer.innerHTML = '';
        
        // Previous month days (lighter gray)
        for (let i = 0; i < firstDay; i++) {
            const d = daysInPrevMonth - firstDay + 1 + i;
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day other-month';
            dayEl.textContent = d;
            daysContainer.appendChild(dayEl);
        }
        
        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            const currentDateToCheck = new Date(year, month, day);
            const isSelected = selectedDate && currentDateToCheck.getTime() === selectedDate.getTime();
            if (isSelected) {
                dayElement.classList.add('selected');
            }
            
            const today = new Date();
            if (currentDateToCheck.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            const isPast = isDateInPast(new Date(year, month, day));
            const isWithin48Hours = isDateWithin48Hours(currentDateToCheck);
            const isSunday = currentDateToCheck.getDay() === 0;
            const isBlocked = isDateBlocked(currentDateToCheck);

            if (isPast || isWithin48Hours || isSunday || isBlocked) {
                dayElement.classList.add('past');
                if (isSunday) {
                    dayElement.title = 'Closed on Sundays';
                } else if (isBlocked) {
                    dayElement.title = 'Unavailable this week';
                } else if (isWithin48Hours && !isPast) {
                    dayElement.title = 'Appointments require at least 48 hours advance notice';
                }
            } else {
                dayElement.addEventListener('click', async () => {
                    const prevSelected = document.querySelector('.calendar-day.selected:not(.other-month)');
                    if (prevSelected) prevSelected.classList.remove('selected');
                    dayElement.classList.add('selected');
                    selectedDate = currentDateToCheck;
                    formatSelectedDateDisplay(selectedDate, null, 0);
                    await fetchUnavailableTimes(currentDateToCheck);
                    showTimeSlots(currentDateToCheck);
                });
            }
            
            daysContainer.appendChild(dayElement);
        }
        
        // Next month days to fill the grid (6 rows = 42 cells)
        const totalCells = 42;
        const filled = firstDay + daysInMonth;
        for (let day = 1; day <= totalCells - filled; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day other-month';
            dayEl.textContent = day;
            daysContainer.appendChild(dayEl);
        }
    }
    
    // Check if a time slot is unavailable
    function isSlotUnavailable(slotDateTime, appointmentDuration) {
        // Disable time slots that overlap with existing bookings based on duration
        // BUT don't disable slots that start before the existing booking
        // Calculate the end time for the new appointment if booked at this slot
        const appointmentDurationMs = appointmentDuration * 60 * 1000;
        const slotEndTime = new Date(slotDateTime.getTime() + appointmentDurationMs);
        
        // Check if this slot would overlap with any existing booking
        const hasOverlap = unavailableTimes.some(unavailable => {
            // Parse the booking time (stored as ISO string, converted to local time by JavaScript)
            const unavailableStart = new Date(unavailable.start);
            const unavailableEnd = new Date(unavailable.end);
            
            // Only disable if the slot starts at or after the existing booking's start time
            // AND would overlap with the existing booking
            // This means: slot starts >= booking starts AND slot would overlap
            const slotStartsAtOrAfterBooking = slotDateTime >= unavailableStart;
            const wouldOverlap = slotDateTime < unavailableEnd && slotEndTime > unavailableStart;
            
            // Disable if slot starts at/after booking AND would overlap
            const shouldDisable = slotStartsAtOrAfterBooking && wouldOverlap;
            
            if (shouldDisable) {
                console.log(`Time slot overlaps with existing booking:`, {
                    slot: `${slotDateTime.toLocaleString()} - ${slotEndTime.toLocaleString()}`,
                    existing: `${unavailableStart.toLocaleString()} - ${unavailableEnd.toLocaleString()}`,
                    overlapStart: new Date(Math.max(slotDateTime.getTime(), unavailableStart.getTime())).toLocaleString(),
                    overlapEnd: new Date(Math.min(slotEndTime.getTime(), unavailableEnd.getTime())).toLocaleString()
                });
            }
            
            return shouldDisable;
        });

        return hasOverlap;
    }

    // Show time slots for selected date (uses same Estimated Duration as pricing section)
    function showTimeSlots(date) {
        if (!date) return;

        var existingWrapper = timeSlotsContainer.querySelector('.time-slots-wrapper');
        if (existingWrapper) existingWrapper.remove();
        var existingPrompt = timeSlotsContainer.querySelector('.time-slots-pick-style-prompt');
        if (existingPrompt) existingPrompt.remove();
        var existingEmptyMsg = timeSlotsContainer.querySelector('.time-slots-empty-msg');
        if (existingEmptyMsg) existingEmptyMsg.remove();
        var existingCallMsg = timeSlotsContainer.querySelector('.time-slots-call-msg');
        if (existingCallMsg) existingCallMsg.remove();
        timeSlotsContainer.classList.remove('hidden');

        var selectedStyle = (selectedStyleInput && selectedStyleInput.value) ? selectedStyleInput.value.trim() : '';
        if (!selectedStyle || !styleInfo[selectedStyle]) {
            var prompt = document.createElement('div');
            prompt.className = 'time-slots-pick-style-prompt';
            prompt.setAttribute('role', 'alert');
            prompt.innerHTML = '<i class="fas fa-info-circle"></i> Please select a style above to see estimated duration and available time slots.';
            timeSlotsContainer.appendChild(prompt);
            return;
        }

        const styleData = styleInfo[selectedStyle];
        const lengthMultiplier = lengthMultipliers[hairLengthSelect.value]?.duration || 1;
        const baseDuration = styleData.baseDuration;
        const washDuration = preWashSelect.value === 'wash' ? addOnCosts.wash.duration : 0;
        const totalDuration = Math.ceil((baseDuration * lengthMultiplier) + washDuration);

        const timeSlotsWrapper = document.createElement('div');
        timeSlotsWrapper.className = 'time-slots-wrapper';

        var availableCount = 0;
        timeSlots.forEach(function(timeSlot) {
            const timeButton = document.createElement('button');
            timeButton.type = 'button';
            timeButton.className = 'time-slot-btn';
            timeButton.textContent = timeSlot;

            var timeParts = timeSlot.split(' ');
            var meridiem = timeParts[1];
            var hm = timeParts[0].split(':');
            var slotDateTime = new Date(date);
            var hour = parseInt(hm[0], 10);
            if (meridiem === 'PM' && hour !== 12) hour += 12;
            if (meridiem === 'AM' && hour === 12) hour = 0;
            slotDateTime.setHours(hour, parseInt(hm[1], 10), 0, 0);

            var isInPast = isTimeSlotInPast(slotDateTime);
            var isUnavailable = isSlotUnavailable(slotDateTime, totalDuration);

            if (isInPast || isUnavailable) {
                timeButton.disabled = true;
                timeButton.classList.add('unavailable');
                timeButton.setAttribute('aria-disabled', 'true');
                timeButton.title = isInPast ? 'This time has passed' : 'This time slot is already booked';
                timeButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            } else {
                availableCount++;
                timeButton.classList.add('available');
                timeButton.title = 'Available';
                timeButton.addEventListener('click', function() {
                    document.querySelectorAll('.time-slot-btn').forEach(function(btn) {
                        btn.classList.remove('active');
                    });
                    timeButton.classList.add('active');
                    selectedTimeSlot = timeSlot;

                    var isoDateTime = new Date(date);
                    var m = timeSlot.split(' ');
                    var h = parseInt(m[0].split(':')[0], 10);
                    if (m[1] === 'PM' && h !== 12) h += 12;
                    if (m[1] === 'AM' && h === 12) h = 0;
                    isoDateTime.setHours(h, parseInt(m[0].split(':')[1], 10), 0, 0);
                    appointmentDateTimeInput.value = isoDateTime.toISOString();
                    appointmentDateTimeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    if (typeof checkAndLoadPayment === 'function') {
                        checkAndLoadPayment();
                    }
                    formatSelectedDateDisplay(date, timeSlot, totalDuration);
                });
            }
            timeSlotsWrapper.appendChild(timeButton);
        });

        if (availableCount === 0) {
            var msg = document.createElement('div');
            msg.className = 'time-slots-empty-msg';
            msg.textContent = 'No available times for this day. Please select another date.';
            timeSlotsContainer.appendChild(msg);
        }
        timeSlotsContainer.appendChild(timeSlotsWrapper);

        var callMsg = document.createElement('p');
        callMsg.className = 'time-slots-call-msg service-note';
        callMsg.innerHTML = 'If you don\'t see a time that works, call us at <a href="tel:+18604250540">860-425-0540</a>.';
        timeSlotsContainer.appendChild(callMsg);
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
        const selectedStyleEl = document.getElementById('selected-style');
        const hairLengthEl = document.getElementById('hair-length');
        const hairOptionEl = document.getElementById('hair-option');
        const preWashEl = document.getElementById('pre-wash-option');
        const cornrowsVariationEl = document.getElementById('cornrows-variation');
        const boxBraidsVariationEl = document.getElementById('box-braids-variation');
        
        const selectedStyle = selectedStyleEl ? selectedStyleEl.value : '';
        const hairLength = hairLengthEl ? hairLengthEl.value : '';
        const hairOption = hairOptionEl ? hairOptionEl.value : '';
        const preWashOption = preWashEl ? preWashEl.value : '';
        const cornrowsVariation = cornrowsVariationEl ? cornrowsVariationEl.value : '';
        const boxBraidsVariation = boxBraidsVariationEl ? boxBraidsVariationEl.value : '';
        
        const totalPriceElement = document.getElementById('total-price');
        const durationElement = document.getElementById('estimated-duration');
        const depositAmountElement = document.getElementById('deposit-amount');
        const hairLengthGroup = document.getElementById('hair-length-group');
        const cornrowsGroup = document.getElementById('cornrows-variation-group');
        const hairOptionGroup = document.getElementById('hair-option-group');
        const pricingNoteElement = document.getElementById('pricing-note');
        const addOnsSection = document.getElementById('add-ons-section');
        const addOnsList = document.getElementById('add-ons-list');

        // Reset UI elements if no style is selected or style doesn't exist
        if (!selectedStyle || !styleInfo[selectedStyle]) {
            if (totalPriceElement) totalPriceElement.textContent = '$0';
            if (durationElement) durationElement.textContent = 'TBD';
            if (depositAmountElement) depositAmountElement.textContent = '$0';
            if (pricingNoteElement) pricingNoteElement.style.display = 'none';
            if (hairLengthGroup) hairLengthGroup.style.display = 'none';
            if (cornrowsGroup) cornrowsGroup.style.display = 'none';
            if (hairOptionGroup) hairOptionGroup.style.display = 'none';
            if (addOnsSection) addOnsSection.style.display = 'none';
            if (addOnsList) addOnsList.innerHTML = '';
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

        // Apply box braids variation pricing
        if (selectedStyle === 'Box Braids' && boxBraidsVariation && baseInfo.variations && baseInfo.variations[boxBraidsVariation]) {
            finalPrice *= baseInfo.variations[boxBraidsVariation].priceMultiplier;
        }

        // Apply cornrows variation pricing
        if (selectedStyle === 'Cornrows' && cornrowsVariation && baseInfo.variations && baseInfo.variations[cornrowsVariation]) {
            finalPrice *= baseInfo.variations[cornrowsVariation].priceMultiplier;
        }

        // Track add-ons for display
        const selectedAddOns = [];

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
                selectedAddOns.push({
                    name: 'Human Hair',
                    price: addOnCosts['human-hair'].price
                });
            }
        }

        // Add wash cost if selected (applies to all styles)
        if (preWashOption === 'wash') {
            finalPrice += addOnCosts['wash'].price;
            finalDuration += addOnCosts['wash'].duration;
            selectedAddOns.push({
                name: 'Professional Wash',
                price: addOnCosts['wash'].price
            });
        }

        // Calculate deposit based on the current total price (10% deposit)
        const deposit = finalPrice * 0.10;

        // Update add-ons display
        if (addOnsList && addOnsSection) {
            addOnsList.innerHTML = '';
            if (selectedAddOns.length > 0) {
                selectedAddOns.forEach(addOn => {
                    const li = document.createElement('li');
                    li.style.marginBottom = '6px';
                    li.style.color = '#666';
                    li.style.fontSize = '0.9rem';
                    li.innerHTML = `<span style="color: #333;">${addOn.name}</span> <span style="font-weight: 600; color: #2c3e50;">+$${addOn.price.toFixed(2)}</span>`;
                    addOnsList.appendChild(li);
                });
                addOnsSection.style.display = 'block';
            } else {
                addOnsSection.style.display = 'none';
            }
        }

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
            
            // Calculate deposit range (10% of min and max prices)
            const minDeposit = minPrice * 0.10;
            const maxDeposit = maxPrice * 0.10;
            
            totalPriceElement.textContent = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
            durationElement.textContent = `${formatDuration(minDuration)} - ${formatDuration(maxDuration)}`;
            depositAmountElement.textContent = `$${minDeposit.toFixed(2)} - $${maxDeposit.toFixed(2)}`;
        } else {
            totalPriceElement.textContent = `$${finalPrice.toFixed(2)}`;
            durationElement.textContent = formatDuration(finalDuration);
            depositAmountElement.textContent = `$${deposit.toFixed(2)}`;
        }

        return { price: finalPrice, duration: finalDuration };
    }

    // Initialize price calculation
    calculatePrice();

    // Firebase Storage upload function (commented out - will use when we have client credentials)
    // async function uploadImage(file) {
    //     try {
    //         // Verify Firebase Storage is initialized
    //         if (!firebase.storage) {
    //             throw new Error('Firebase Storage is not initialized. Make sure firebase-storage-compat.js is loaded.');
    //         }
    //         
    //         const storageRef = firebase.storage().ref();
    //         const fileName = `bookings/${Date.now()}-${file.name}`;
    //         const fileRef = storageRef.child(fileName);
    //         
    //         // Upload with error handling
    //         const snapshot = await fileRef.put(file);
    //         const downloadURL = await snapshot.ref.getDownloadURL();
    //         return downloadURL;
    //     } catch (error) {
    //         console.error('Firebase Storage upload error:', error);
    //         // Provide more helpful error message
    //         if (error.code === 'storage/unknown') {
    //             throw new Error('Storage upload failed. Please check Firebase Storage rules and ensure the storage bucket is configured correctly.');
    //         }
    //         throw error;
    //     }
    // }

    // Supabase Storage upload function
    async function uploadImage(file) {
        try {
            // Verify Supabase is initialized
            if (!supabaseClient) {
                throw new Error('Supabase is not initialized. Please add your Supabase credentials to config.js');
            }

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `bookings/${fileName}`;

            // Upload file to Supabase Storage
            const { data, error } = await supabaseClient.storage
                .from(SUPABASE_STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Supabase Storage upload error:', error);
                
                // Provide helpful error messages
                if (error.message && error.message.includes('Bucket not found')) {
                    throw new Error(`Storage bucket "${SUPABASE_STORAGE_BUCKET}" not found. Please create it in Supabase Dashboard → Storage → New bucket. See CREATE_SUPABASE_BUCKET.md for instructions.`);
                } else if (error.message && error.message.includes('new row violates row-level security')) {
                    throw new Error(`Storage policy error. Please set up storage policies in Supabase Dashboard → Storage → ${SUPABASE_STORAGE_BUCKET} → Policies. Allow INSERT and SELECT operations.`);
                } else {
                    throw new Error(`Failed to upload image: ${error.message}`);
                }
            }

            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from(SUPABASE_STORAGE_BUCKET)
                .getPublicUrl(filePath);

            if (!urlData || !urlData.publicUrl) {
                throw new Error('Failed to get image URL after upload');
            }

            return urlData.publicUrl;
        } catch (error) {
            console.error('Image upload error:', error);
            throw error;
        }
    }

    // Initialize everything when the page loads
    if (calendarElement && timeSlotsContainer) {
        initCalendar();
        fetchUnavailableTimes(); // Fetch initial unavailable times
        
        // Add event listeners for form fields that affect duration
        hairLengthSelect.addEventListener('change', async () => {
            calculatePrice();
            if (selectedDate) {
                // Refresh unavailable times and time slots when duration changes
                await fetchUnavailableTimes(selectedDate);
                showTimeSlots(selectedDate);
            }
        });
        
        preWashSelect.addEventListener('change', async () => {
            calculatePrice();
            if (selectedDate) {
                // Refresh unavailable times and time slots when duration changes
                await fetchUnavailableTimes(selectedDate);
                showTimeSlots(selectedDate);
            }
        });
        
        // Refresh unavailable times periodically
        setInterval(fetchUnavailableTimes, 5 * 60 * 1000); // Refresh every 5 minutes
    } else {
        console.error('Calendar element not found!');
    }

    // Add event listeners for price calculation (style change is handled above via updateStyleDependentFields)
    if (hairLengthSelect) {
        hairLengthSelect.addEventListener('change', calculatePrice);
    }
    if (hairOptionSelect) {
        hairOptionSelect.addEventListener('change', calculatePrice);
    }
    if (preWashSelect) {
        preWashSelect.addEventListener('change', calculatePrice);
    }
    // Add event listener for cornrows variation
    if (cornrowsVariationSelect) {
        cornrowsVariationSelect.addEventListener('change', calculatePrice);
    }
    // Add event listener for box braids variation
    if (boxBraidsVariationSelect) {
        boxBraidsVariationSelect.addEventListener('change', calculatePrice);
    }
    
    // Progress Modal Functions
    const progressModal = document.getElementById('progress-modal');
    const progressStatus = document.getElementById('progress-status');
    const progressMessage = document.getElementById('progress-message');
    const progressDetails = document.getElementById('progress-details');
    const progressModalTitle = document.getElementById('progress-modal-title');
    const progressModalFooter = document.getElementById('progress-modal-footer');
    const progressModalClose = document.getElementById('progress-modal-close');
    const progressModalCancel = document.getElementById('progress-modal-cancel');
    const progressModalRetry = document.getElementById('progress-modal-retry');

    function showProgressModal(title, message, type = 'loading', details = null) {
        progressModalTitle.textContent = title;
        progressStatus.className = `progress-status ${type}`;
        
        // Update content based on type
        if (type === 'loading') {
            progressStatus.innerHTML = '<div class="progress-spinner"></div><div class="progress-message">' + message + '</div>';
        } else {
            const icon = type === 'error' 
                ? '<i class="fas fa-exclamation-circle progress-status-icon error"></i>' 
                : '<i class="fas fa-check-circle progress-status-icon success"></i>';
            progressStatus.innerHTML = icon + '<div class="progress-message ' + type + '">' + message + '</div>';
        }
        
        if (details) {
            progressDetails.textContent = details;
            progressDetails.style.display = 'block';
        } else {
            progressDetails.style.display = 'none';
        }
        
        if (type === 'loading') {
            progressModalFooter.style.display = 'flex';
            progressModalCancel.textContent = 'Cancel';
            progressModalRetry.style.display = 'none';
        } else if (type === 'error') {
            progressModalFooter.style.display = 'flex';
            progressModalCancel.textContent = 'Close';
            progressModalRetry.style.display = 'inline-block';
        } else if (type === 'success') {
            progressModalFooter.style.display = 'flex';
            progressModalCancel.textContent = 'Close';
            progressModalRetry.style.display = 'none';
        } else {
            progressModalFooter.style.display = 'none';
        }
        
        progressModal.classList.add('active');
    }

    function hideProgressModal() {
        progressModal.classList.remove('active');
        progressModalFooter.style.display = 'none';
        progressDetails.style.display = 'none';
    }

    // Modal event listeners
    if (progressModalClose) {
        progressModalClose.addEventListener('click', hideProgressModal);
    }
    if (progressModalCancel) {
        progressModalCancel.addEventListener('click', hideProgressModal);
    }
    if (progressModalRetry) {
        progressModalRetry.addEventListener('click', () => {
            hideProgressModal();
            bookingForm.dispatchEvent(new Event('submit'));
        });
    }
    // Close modal when clicking outside
    progressModal.addEventListener('click', (e) => {
        if (e.target === progressModal) {
            hideProgressModal();
        }
    });
    // Embedded payment state
    let elements = null;
    let paymentElement = null;
    let paymentIntentClientSecret = null;
    let embeddedPaymentReady = false;
    let isLoadingPayment = false;
    let currentPaymentSignature = null;
    let isSubmittingPayment = false;

    function setPaymentMessage(message, type) {
        const messageEl = document.getElementById('payment-message');
        if (!messageEl) return;
        messageEl.textContent = message || '';
        messageEl.className = 'payment-message' + (type ? ' payment-message-' + type : '');
    }

    function setPaymentPlaceholder(message, loading) {
        const paymentContainer = document.getElementById('payment-element-container');
        if (!paymentContainer) return;
        const cssClass = loading ? 'payment-loading' : 'payment-placeholder';
        paymentContainer.innerHTML = `<p class="${cssClass}">${message}</p>`;
    }

    function updatePaymentContactSummary() {
        if (paymentContactNameInput) {
            paymentContactNameInput.value = document.getElementById('name')?.value?.trim() || '';
        }
        if (paymentContactEmailInput) {
            paymentContactEmailInput.value = document.getElementById('email')?.value?.trim() || '';
        }
    }

    function isVisible(el) {
        return !!(el && el.offsetParent !== null);
    }

    function getPaymentSignature() {
        const currentHairImage = currentHairImageInput && currentHairImageInput.files ? currentHairImageInput.files[0] : null;
        const referenceImage = referenceImageInput && referenceImageInput.files ? referenceImageInput.files[0] : null;
        return JSON.stringify({
            name: document.getElementById('name') ? document.getElementById('name').value.trim() : '',
            phone: document.getElementById('phone') ? document.getElementById('phone').value.trim() : '',
            email: document.getElementById('email') ? document.getElementById('email').value.trim() : '',
            style: selectedStyleInput ? selectedStyleInput.value : '',
            boxBraidsVariation: boxBraidsVariationSelect ? boxBraidsVariationSelect.value : '',
            cornrowsVariation: cornrowsVariationSelect ? cornrowsVariationSelect.value : '',
            twoStrandVariation: twoStrandTwistsVariationSelect ? twoStrandTwistsVariationSelect.value : '',
            hairLength: hairLengthSelect ? hairLengthSelect.value : '',
            hairOption: hairOptionSelect ? hairOptionSelect.value : '',
            preWash: preWashSelect ? preWashSelect.value : '',
            appointmentDateTime: appointmentDateTimeInput ? appointmentDateTimeInput.value : '',
            currentHairImage: currentHairImage ? `${currentHairImage.name}:${currentHairImage.size}:${currentHairImage.lastModified}` : '',
            referenceImage: referenceImage ? `${referenceImage.name}:${referenceImage.size}:${referenceImage.lastModified}` : ''
        });
    }

    function getPaymentReadinessMessage() {
        const styleName = selectedStyleInput ? selectedStyleInput.value : '';
        if (!document.getElementById('name')?.value.trim()) return 'Enter your full name to load the secure payment form.';
        if (!document.getElementById('phone')?.value.trim()) return 'Enter your phone number to load the secure payment form.';
        if (!document.getElementById('email')?.value.trim()) return 'Enter your email address to load the secure payment form.';
        if (!styleName) return 'Select a style to load the secure payment form.';
        if (isVisible(boxBraidsVariationGroup) && !boxBraidsVariationSelect?.value) {
            return 'Choose the box braids type to load the secure payment form.';
        }
        if (isVisible(cornrowsVariationGroup) && !cornrowsVariationSelect?.value) {
            return 'Choose the cornrows style to load the secure payment form.';
        }
        if (isVisible(twoStrandTwistsVariationGroup) && !twoStrandTwistsVariationSelect?.value) {
            return 'Choose the two strand twist style to load the secure payment form.';
        }
        if (isVisible(document.getElementById('hair-length-group')) && !hairLengthSelect?.value) {
            return 'Select your hair length to load the secure payment form.';
        }
        if (isVisible(document.getElementById('hair-option-group')) && !hairOptionSelect?.value) {
            return 'Select your hair option to load the secure payment form.';
        }
        if (!preWashSelect?.value) return 'Choose a pre-wash option to load the secure payment form.';
        if (!appointmentDateTimeInput?.value) return 'Select your appointment date and time to load the secure payment form.';
        if (!currentHairImageInput?.files?.[0]) return 'Upload your current hair photo to load the secure payment form.';
        return '';
    }

    function isFormReadyForPayment() {
        return !getPaymentReadinessMessage();
    }

    function destroyPaymentElement() {
        if (paymentElement && typeof paymentElement.destroy === 'function') {
            paymentElement.destroy();
        }
        paymentElement = null;
        elements = null;
        paymentIntentClientSecret = null;
        embeddedPaymentReady = false;
    }

    function resetEmbeddedPaymentState(message) {
        destroyPaymentElement();
        currentPaymentSignature = null;
        setPaymentMessage('');
        setPaymentPlaceholder(message || getPaymentReadinessMessage() || 'Complete the required booking details above to load the secure payment form.', false);
        updateSubmitButton();
    }

    function updateSubmitButton() {
        const submitBtn = document.getElementById('submit-btn');
        if (!submitBtn) return;
        const canSubmit = embeddedPaymentReady && !!elements;
        submitBtn.disabled = !canSubmit;
        submitBtn.textContent = canSubmit ? 'Book Appointment' : 'Complete Payment Details';
    }

    async function ensureStripeInstance() {
        if (stripeInstance) return stripeInstance;

        try {
            const configResponse = await fetch('/api/stripe-config');
            if (configResponse.ok) {
                const configData = await configResponse.json();
                if (configData.publishableKey) {
                    stripeInstance = Stripe(configData.publishableKey);
                    return stripeInstance;
                }
            }
        } catch (error) {
            console.warn('Failed to load Stripe config from API:', error);
        }

        if (typeof STRIPE_PUBLISHABLE_KEY !== 'undefined' && STRIPE_PUBLISHABLE_KEY) {
            stripeInstance = Stripe(STRIPE_PUBLISHABLE_KEY);
            return stripeInstance;
        }

        throw new Error('Stripe is not configured. Add the live publishable key in Vercel or config.js.');
    }

    function buildBookingPayload(formData, currentHairImageUrl, referenceImageUrl, pricing) {
        return {
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            'appointment-datetime': formData.get('appointment-datetime'),
            selected_style: formData.get('selected-style'),
            hair_length: formData.get('hair-length'),
            hair_option: formData.get('hair-option'),
            pre_wash_option: formData.get('pre-wash-option'),
            detangling_option: formData.get('detangling-option'),
            notes: formData.get('notes'),
            totalPrice: pricing.price,
            total_price: pricing.price,
            duration: pricing.duration,
            currentHairImageURL: currentHairImageUrl,
            current_hair_image_url: currentHairImageUrl,
            referenceImageURL: referenceImageUrl,
            reference_image_url: referenceImageUrl,
            box_braids_variation: formData.get('box-braids-variation'),
            cornrows_variation: formData.get('cornrows-variation'),
            two_strand_twists_variation: formData.get('two-strand-twists-variation')
        };
    }

    async function maybeLoadPaymentForm() {
        if (isLoadingPayment || !isFormReadyForPayment()) return;

        const signature = getPaymentSignature();
        if (embeddedPaymentReady && currentPaymentSignature === signature) {
            updateSubmitButton();
            return;
        }

        if (embeddedPaymentReady && currentPaymentSignature !== signature) {
            resetEmbeddedPaymentState('Updating payment form for your latest booking details...');
        }

        isLoadingPayment = true;
        setPaymentMessage('');

        try {
            await ensureStripeInstance();

            setPaymentPlaceholder('<i class="fas fa-spinner fa-spin"></i> Uploading your photos...', true);
            const formData = new FormData(bookingForm);
            const currentHairImage = currentHairImageInput?.files?.[0];
            const referenceImage = referenceImageInput?.files?.[0];

            if (!currentHairImage) {
                throw new Error('Please provide a current photo of your hair before payment.');
            }

            const currentHairImageUrl = await uploadImage(currentHairImage);
            const referenceImageUrl = referenceImage ? await uploadImage(referenceImage) : null;
            const pricing = calculatePrice();
            const bookingData = buildBookingPayload(formData, currentHairImageUrl, referenceImageUrl, pricing);

            setPaymentPlaceholder('<i class="fas fa-spinner fa-spin"></i> Loading secure payment form...', true);
            const createIntentUrl = (typeof ENDPOINTS !== 'undefined' && ENDPOINTS.CREATE_PAYMENT_INTENT) ?
                ENDPOINTS.CREATE_PAYMENT_INTENT :
                '/api/create-payment-intent';
            const response = await fetch(createIntentUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });

            if (!response.ok) {
                const text = await response.text();
                let errorMessage = `Server error (${response.status})`;
                try {
                    const errorData = JSON.parse(text);
                    errorMessage = errorData.error?.message || errorData.error || errorMessage;
                } catch (parseError) {
                    if (text) errorMessage = text.substring(0, 200);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            if (!data.clientSecret) {
                throw new Error('No payment client secret was returned by the server.');
            }

            paymentIntentClientSecret = data.clientSecret;
            const appearance = {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#c8914e'
                }
            };
            const billingName = document.getElementById('name')?.value?.trim() || undefined;
            const billingEmail = document.getElementById('email')?.value?.trim() || undefined;
            elements = stripeInstance.elements({
                clientSecret: paymentIntentClientSecret,
                appearance
            });
            paymentElement = elements.create('payment', {
                layout: 'tabs',
                paymentMethodOrder: ['card'],
                defaultValues: {
                    billingDetails: {
                        name: billingName,
                        email: billingEmail
                    }
                }
            });

            const paymentContainer = document.getElementById('payment-element-container');
            if (paymentContainer) {
                paymentContainer.innerHTML = '';
                paymentElement.mount('#payment-element-container');
            }

            embeddedPaymentReady = true;
            currentPaymentSignature = signature;
            setPaymentMessage('Secure payment form ready.', 'success');
        } catch (error) {
            console.error('Error loading embedded payment form:', error);
            resetEmbeddedPaymentState(getPaymentReadinessMessage());
            setPaymentMessage(error.message || 'Unable to load the payment form.', 'error');
        } finally {
            isLoadingPayment = false;
            updateSubmitButton();
        }
    }

    function checkAndLoadPayment() {
        if (!isFormReadyForPayment()) {
            if (embeddedPaymentReady || isLoadingPayment) {
                resetEmbeddedPaymentState(getPaymentReadinessMessage());
            } else {
                setPaymentPlaceholder(getPaymentReadinessMessage() || 'Complete the required booking details above to load the secure payment form.', false);
                updateSubmitButton();
            }
            return;
        }

        const nextSignature = getPaymentSignature();
        if (currentPaymentSignature && currentPaymentSignature !== nextSignature) {
            resetEmbeddedPaymentState('Updating payment form for your latest booking details...');
        }

        updateSubmitButton();
        if (!embeddedPaymentReady && !isLoadingPayment) {
            maybeLoadPaymentForm();
        }
    }

    ['name', 'phone', 'email'].forEach((id) => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('input', () => {
                updatePaymentContactSummary();
                checkAndLoadPayment();
            });
        }
    });

    if (currentHairImageInput) currentHairImageInput.addEventListener('change', checkAndLoadPayment);
    if (referenceImageInput) referenceImageInput.addEventListener('change', checkAndLoadPayment);
    if (selectedStyleInput) selectedStyleInput.addEventListener('change', checkAndLoadPayment);
    if (boxBraidsVariationSelect) boxBraidsVariationSelect.addEventListener('change', checkAndLoadPayment);
    if (cornrowsVariationSelect) cornrowsVariationSelect.addEventListener('change', checkAndLoadPayment);
    if (twoStrandTwistsVariationSelect) twoStrandTwistsVariationSelect.addEventListener('change', checkAndLoadPayment);
    if (hairLengthSelect) hairLengthSelect.addEventListener('change', checkAndLoadPayment);
    if (hairOptionSelect) hairOptionSelect.addEventListener('change', checkAndLoadPayment);
    if (preWashSelect) preWashSelect.addEventListener('change', checkAndLoadPayment);
    if (appointmentDateTimeInput) appointmentDateTimeInput.addEventListener('change', checkAndLoadPayment);

    updatePaymentContactSummary();
    resetEmbeddedPaymentState();

    // Handle form submission - embedded payment confirms in place
    bookingForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        if (isSubmittingPayment) {
            return;
        }
        if (!embeddedPaymentReady || !elements || !stripeInstance) {
            setPaymentMessage('Complete the required booking details and wait for the secure payment form to load.', 'error');
            showProgressModal(
                'Payment Not Ready',
                'Complete the required booking details and wait for the secure payment form to load.',
                'error'
            );
            updateSubmitButton();
            return;
        }

        isSubmittingPayment = true;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        setPaymentMessage('');
        showProgressModal('Processing Payment', 'Securely confirming your payment. Please wait...', 'loading');

        try {
            const returnUrl = (typeof location !== 'undefined' && location.origin) ?
                location.origin + '/api/handle-payment-success' :
                'http://localhost:5500/api/handle-payment-success';
            const email = document.getElementById('email')?.value || '';

            const result = await stripeInstance.confirmPayment({
                elements,
                confirmParams: {
                    return_url: returnUrl,
                    receipt_email: email || undefined
                }
            });

            if (result.error) {
                throw result.error;
            }
        } catch (error) {
            console.error('Error confirming embedded payment:', error);
            isSubmittingPayment = false;
            setPaymentMessage(error.message || 'Payment failed. Please review your card details and try again.', 'error');
            showProgressModal(
                'Payment Error',
                error.message || 'Payment failed. Please review your card details and try again.',
                'error',
                error.message || 'Stripe could not confirm the payment.'
            );
            updateSubmitButton();
        }
    });

    // Fetch unavailable times from Supabase API
    async function fetchUnavailableTimes(date = null) {
        if (isFetchingUnavailableTimes) {
            console.log('Already fetching unavailable times, skipping duplicate request');
            return;
        }

        isFetchingUnavailableTimes = true;

        try {
            // If a specific date is provided, fetch unavailable times for that date
            // Otherwise, fetch for the currently selected date or current month
            let targetDate = date || selectedDate || new Date();
            
            // Format date as YYYY-MM-DD for the API
            const dateStr = targetDate.toISOString().split('T')[0];
            
            // Call the API endpoint
            const endpoint = typeof ENDPOINTS !== 'undefined' && ENDPOINTS.GET_UNAVAILABLE_TIMES
                ? ENDPOINTS.GET_UNAVAILABLE_TIMES
                : '/api/get-unavailable-times';
            
            const response = await fetch(`${endpoint}?date=${dateStr}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch unavailable times: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Update unavailableTimes array with the fetched data
            if (data.unavailableTimes && Array.isArray(data.unavailableTimes)) {
                unavailableTimes = data.unavailableTimes;
                console.log(`Fetched ${unavailableTimes.length} unavailable time slots for ${dateStr}:`);
                unavailableTimes.forEach((slot, index) => {
                    const start = new Date(slot.start);
                    const end = new Date(slot.end);
                    const duration = slot.duration || 'unknown';
                    console.log(`  ${index + 1}. ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()} (${duration} min)`);
                });
            } else {
                unavailableTimes = [];
                console.log(`No unavailable times found for ${dateStr}`);
            }

            // If a date is selected, refresh the time slots to show updated availability
            if (selectedDate) {
                showTimeSlots(selectedDate);
            }

            return unavailableTimes;
        } catch (error) {
            console.error('Error fetching unavailable times:', error);
            // Don't show alert for network errors during initial load
            if (error.message !== 'Failed to fetch' && !error.message.includes('Network Error')) {
                console.warn('Could not fetch unavailable times. Time slots may not reflect current bookings.');
            }
            // Set empty array on error so time slots still show
            unavailableTimes = [];
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
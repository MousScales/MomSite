document.addEventListener('DOMContentLoaded', function() {
    // --- Hair Length Data ---
    const hairLengthData = {
        'short': { 
            price: 175, 
            deposit: 53, 
            time: '3 hours', 
            durationHours: 3,
            knotlessPrice: 200,
            knotlessDeposit: 60,
            addedHairPrice: 225,
            addedHairDeposit: 68,
            knotlessAddedHairPrice: 250,
            knotlessAddedHairDeposit: 75
        },
        'medium': { 
            price: 250, 
            deposit: 75, 
            time: '4 hours', 
            durationHours: 4,
            knotlessPrice: 275,
            knotlessDeposit: 83,
            addedHairPrice: 300,
            addedHairDeposit: 90,
            knotlessAddedHairPrice: 325,
            knotlessAddedHairDeposit: 98
        },
        'long': { 
            price: 300, 
            deposit: 90, 
            time: '5 hours', 
            durationHours: 5,
            knotlessPrice: 325,
            knotlessDeposit: 98,
            addedHairPrice: 350,
            addedHairDeposit: 105,
            knotlessAddedHairPrice: 375,
            knotlessAddedHairDeposit: 113
        },
        'extra-long': { 
            price: 350, 
            deposit: 105, 
            time: '6 hours', 
            durationHours: 6,
            knotlessPrice: 375,
            knotlessDeposit: 113,
            addedHairPrice: 400,
            addedHairDeposit: 120,
            knotlessAddedHairPrice: 425,
            knotlessAddedHairDeposit: 128
        }
    };
    const defaultPriceRange = '$175 - $425';
    const defaultDepositRange = '$53 - $128';
    const defaultTimeRange = '3 - 6 hours';

    // --- Calendar and Time Slot Picker ---
    const customCalendar = document.getElementById('custom-calendar');
    const timeSlotsSection = document.getElementById('time-slots-section');
    const timeSlotsGrid = document.getElementById('time-slots-grid');
    const dateInput = document.getElementById('date-input');
    const timeInput = document.getElementById('time-input');
    const hairLengthSelect = document.getElementById('hair-length');
    const selectedStyleInput = document.getElementById('selected-style');
    const boxBraidsVariationGroup = document.getElementById('box-braids-variation-group');
    const boxBraidsVariationSelect = document.getElementById('box-braids-variation');
    const cornrowsVariationGroup = document.getElementById('cornrows-variation-group');
    const cornrowsVariationSelect = document.getElementById('cornrows-variation');
    const twoStrandTwistsVariationGroup = document.getElementById('two-strand-twists-variation-group');
    const twoStrandTwistsVariationSelect = document.getElementById('two-strand-twists-variation');
    const hairOptionSelect = document.getElementById('hair-option');
    const preWashOptionSelect = document.getElementById('pre-wash-option');
    const preWashGroup = document.getElementById('pre-wash-group');
    const detanglingOptionSelect = document.getElementById('detangling-option');
    const detanglingGroup = document.getElementById('detangling-group');
    const blowdryOptionSelect = document.getElementById('blowdry-option');
    const blowdryGroup = document.getElementById('blowdry-group');
    const currentHairImageInput = document.getElementById('current-hair-image');
    const currentHairPreview = document.getElementById('current-hair-preview');
    const currentHairPreviewImg = document.getElementById('current-hair-preview-img');
    const removeCurrentHairImageBtn = document.getElementById('remove-current-hair-image');
    const referenceImageInput = document.getElementById('reference-image');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const removeImageBtn = document.getElementById('remove-image');

    // Promo code elements
    const promoCodeInput = document.getElementById('promo-code');
    const promoFeedback = document.getElementById('promo-feedback');
    const promoMessage = document.getElementById('promo-message');
    const discountInfo = document.getElementById('discount-info');
    const promoCodeDisplay = document.getElementById('promo-code-display');
    const discountAmount = document.getElementById('discount-amount');

    // Track current calendar month/year
    let calendarYear = (new Date()).getFullYear();
    let calendarMonth = (new Date()).getMonth();
    let selectedDate = null;
    let monthlyBookings = {}; // Store bookings for the current month
    let selectedCurrentHairFile = null; // Store the selected current hair image file
    let selectedImageFile = null; // Store the selected reference image file
    
    // Promo code state
    let isPromoCodeValid = false;
    let promoDiscount = 0;
    const validPromoCodes = {
        'MAYAFIRST': 0.05 // 5% discount
    };

    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // Helper to check if a time slot conflicts with existing bookings
    function isSlotBooked(dateStr, timeSlot, durationHours, bookings) {
        const slotStart = new Date(`${dateStr}T${timeSlot}:00-04:00`);
        const slotEnd = new Date(slotStart.getTime() + durationHours * 60 * 60 * 1000);

        for (const booking of bookings) {
            const bookingStart = new Date(booking.start);
            const bookingEnd = new Date(booking.end);

            // Check for overlap: starts within booking OR ends within booking OR booking is fully within slot
            if ((slotStart < bookingEnd && slotEnd > bookingStart)) {
                 return true; // Found an overlap
            }
        }
        return false; // No overlap
    }

    function renderCalendar(year = calendarYear, month = calendarMonth) {
        calendarYear = year;
        calendarMonth = month;

        customCalendar.innerHTML = '<div class="loading-indicator">Loading availability...</div>';

        const availabilityUrl = `/api/availability?month=${year}-${(month + 1).toString().padStart(2, '0')}`;
        console.log('Fetching availability from:', availabilityUrl);

        fetch(availabilityUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
            .then(res => {
                console.log('Availability fetch response status:', res.status);
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('Availability data received:', data);
                monthlyBookings = Array.isArray(data) ? data : [];
                // Now render the calendar with fetched data
                const today = new Date();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                let html = '';
                const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                html += `<div class="calendar-nav">
                    <button type="button" id="prev-month">&#8592;</button>
                    <span class="calendar-month-label">${monthNames[month]} ${year}</span>
                    <button type="button" id="next-month">&#8594;</button>
                </div>`;
                html += '<table class="simple-calendar"><thead><tr>';
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                days.forEach(d => html += `<th>${d}</th>`);
                html += '</tr></thead><tbody>';
                let date = 1;
                for (let i = 0; i < 6; i++) {
                    html += '<tr>';
                    for (let j = 0; j < 7; j++) {
                        if (i === 0 && j < firstDay.getDay()) {
                            html += '<td></td>';
                        } else if (date > lastDay.getDate()) {
                            html += '<td></td>';
                        } else {
                            const cellDate = new Date(year, month, date);
                            const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            const isSelected = selectedDate && formatDate(cellDate) === formatDate(selectedDate);

                            // Check if the day has any bookings
                            const hasBooking = monthlyBookings.some(booking => {
                                // Ensure booking.start is a valid date string before creating a Date object
                                try {
                                    const bookingStartDay = booking.start ? new Date(booking.start).toDateString() : null;
                                    return bookingStartDay && cellDate.toDateString() === bookingStartDay;
                                } catch (e) {
                                    console.error('Error parsing booking date:', booking.start, e);
                                    return false;
                                }
                            });

                            let classes = ['calendar-cell'];
                            if (isPast) classes.push('disabled');
                            if (isSelected) classes.push('selected');
                            if (hasBooking && !isPast) classes.push('has-booking');

                            html += `<td class="${classes.join(' ')}" data-date="${formatDate(cellDate)}">${date}</td>`;
                            date++;
                        }
                    }
                    html += '</tr>';
                    if (date > lastDay.getDate()) break;
                }
                html += '</tbody></table>';
                customCalendar.innerHTML = html; // Render the actual calendar

                // Add event listeners AFTER rendering
                const prevMonthButton = document.getElementById('prev-month');
                const nextMonthButton = document.getElementById('next-month');

                if(prevMonthButton) prevMonthButton.onclick = function() {
                    let newMonth = calendarMonth - 1;
                    let newYear = calendarYear;
                    if (newMonth < 0) { newMonth = 11; newYear--; }
                    renderCalendar(newYear, newMonth);
                };

                if(nextMonthButton) nextMonthButton.onclick = function() {
                    let newMonth = calendarMonth + 1;
                    let newYear = calendarYear;
                    if (newMonth > 11) { newMonth = 0; newYear++; }
                    renderCalendar(newYear, newMonth);
                };

                customCalendar.querySelectorAll('.calendar-cell').forEach(cell => {
                    if (!cell.classList.contains('disabled')) {
                        cell.addEventListener('click', function() {
                            const selected = customCalendar.querySelector('.selected');
                            if (selected) selected.classList.remove('selected');
                            cell.classList.add('selected');
                            dateInput.value = cell.dataset.date;
                            selectedDate = new Date(cell.dataset.date);
                            showTimeSlots(cell.dataset.date);
                        });
                    }
                });

            })
            .catch(error => {
                console.error('Network or HTTP error fetching availability:', error);
                 customCalendar.innerHTML = '<div class="error-message">Network error. Please check your backend server.</div>';
            });
    }

    function showTimeSlots(dateStr) {
        const slots = [];
        // Example slots: 9:00 AM - 5:00 PM, every 30 min
        for (let h = 9; h <= 16; h++) {
            slots.push(`${h.toString().padStart(2, '0')}:00`);
            slots.push(`${h.toString().padStart(2, '0')}:30`);
        }
        timeSlotsGrid.innerHTML = '';

        // Get selected hair length duration for conflict checking
        const selectedHairLength = hairLengthSelect.value;
        const durationHours = hairLengthData[selectedHairLength]?.durationHours || 2; // Default to 2 if not found

        slots.forEach(slot => {
            // Convert to 12-hour format for display
            const [hour, minute] = slot.split(':');
            let hourNum = parseInt(hour);
            const ampm = hourNum >= 12 ? 'PM' : 'AM';
            let displayHour = hourNum % 12;
            if (displayHour === 0) displayHour = 12;
            const display = `${displayHour}:${minute} ${ampm}`;

            // Check if this slot is booked
            const isBooked = isSlotBooked(dateStr, slot, durationHours, monthlyBookings);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-slot-btn';
            if (isBooked) {
                btn.classList.add('disabled');
                btn.disabled = true;
            }
            btn.textContent = display;
            btn.onclick = function() {
                if (!isBooked) {
                    timeSlotsGrid.querySelectorAll('.selected').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    timeInput.value = slot; // keep value in 24hr for backend
                }
            };
            timeSlotsGrid.appendChild(btn);
        });
        timeSlotsSection.style.display = 'block';
    }

    // --- Dynamic Price/Deposit/Time ---
    function updatePriceAndTime() {
        const hairLength = hairLengthSelect.value;
        const selectedStyle = selectedStyleInput.value;
        const boxBraidsVariation = boxBraidsVariationSelect?.value;
        const cornrowsVariation = cornrowsVariationSelect?.value;
        const twoStrandTwistsVariation = twoStrandTwistsVariationSelect?.value;
        const hairOption = hairOptionSelect?.value;
        const preWashOption = preWashOptionSelect?.value;
        const detanglingOption = detanglingOptionSelect?.value;
        const blowdryOption = blowdryOptionSelect?.value;
        const priceRange = document.querySelector('.price-range');
        const depositRange = document.querySelector('.deposit-range');
        const timeEstimateRange = document.querySelector('.time-estimate-range');
        const timeEstimateNote = document.querySelector('.time-estimate-note');
        
        if (hairLength && hairLengthData[hairLength]) {
            const data = hairLengthData[hairLength];
            let price, deposit, time;
            
            // Determine pricing based on style, variation, and hair option
            if (selectedStyle === 'Box Braids' && boxBraidsVariation === 'knotless') {
                if (hairOption === 'added') {
                    price = data.knotlessAddedHairPrice;
                    deposit = data.knotlessAddedHairDeposit;
                } else {
                    price = data.knotlessPrice;
                    deposit = data.knotlessDeposit;
                }
            } else {
                if (hairOption === 'added') {
                    price = data.addedHairPrice;
                    deposit = data.addedHairDeposit;
                } else {
                    price = data.price;
                    deposit = data.deposit;
                }
            }
            
            // Add designed cornrows upcharge if selected
            if (selectedStyle === 'Cornrows' && cornrowsVariation === 'designed') {
                price += 25;
                deposit += 8; // 30% of the $25 upcharge (25 * 0.3 = 7.5, rounded to 8)
            }
            
            // Add two strand twists upcharge if selected
            if (selectedStyle === 'Two Strand Twists' && twoStrandTwistsVariation === 'braided-roots') {
                price += 30;
                deposit += 9; // 30% of the $30 upcharge (30 * 0.3 = 9)
            }

            // Add pre-wash service charge if selected
            if (preWashOption === 'yes' && selectedStyle !== 'Weave Install') {
                price += 30;
                deposit += 9; // 30% of the $30 pre-wash charge (30 * 0.3 = 9)
            }

            // Add detangling service charge if selected
            if (detanglingOption === 'yes' && !selectedStyle.toLowerCase().includes('loc') && selectedStyle !== 'Weave Install') {
                price += 25;
                deposit += 8; // 30% of the $25 detangling charge (25 * 0.3 = 7.5, rounded to 8)
            }

            // Add blow-dry service charge if selected
            if (blowdryOption === 'yes' && !selectedStyle.toLowerCase().includes('loc') && selectedStyle !== 'Weave Install') {
                price += 35;
                deposit += 11; // 30% of the $35 blow-dry charge (35 * 0.3 = 10.5, rounded to 11)
            }
            
            // Apply promo code discount if valid
            let discountAmountValue = 0;
            if (isPromoCodeValid && promoDiscount > 0) {
                discountAmountValue = Math.round(price * promoDiscount);
                price = price - discountAmountValue;
                deposit = Math.round(price * 0.30); // Recalculate deposit based on discounted price
                
                // Show discount info
                discountInfo.style.display = 'block';
                promoCodeDisplay.textContent = promoCodeInput.value.toUpperCase();
                discountAmount.textContent = `-$${discountAmountValue}`;
            } else {
                // Hide discount info
                discountInfo.style.display = 'none';
            }
            
            time = data.time;
            
            priceRange.textContent = `$${price}`;
            depositRange.textContent = `$${deposit}`;
            timeEstimateRange.textContent = time;
            timeEstimateNote.textContent = '* Estimated time for your selected hair length';
        } else {
            priceRange.textContent = defaultPriceRange;
            depositRange.textContent = defaultDepositRange;
            timeEstimateRange.textContent = defaultTimeRange;
            timeEstimateNote.textContent = '* Select your hair length above to see exact time';
            // Hide discount info when no hair length selected
            discountInfo.style.display = 'none';
        }
    }

    // Promo code validation function
    function validatePromoCode(code) {
        const trimmedCode = code.trim().toUpperCase();
        
        if (trimmedCode === '') {
            // Reset promo code state when empty
            isPromoCodeValid = false;
            promoDiscount = 0;
            promoFeedback.style.display = 'none';
            updatePriceAndTime();
            return;
        }
        
        if (validPromoCodes[trimmedCode]) {
            isPromoCodeValid = true;
            promoDiscount = validPromoCodes[trimmedCode];
            promoFeedback.style.display = 'block';
            promoMessage.textContent = `✅ Promo code applied! You'll save ${Math.round(promoDiscount * 100)}% on your total.`;
            promoMessage.style.color = '#28a745';
        } else {
            isPromoCodeValid = false;
            promoDiscount = 0;
            promoFeedback.style.display = 'block';
            promoMessage.textContent = '❌ Invalid promo code. Please check and try again.';
            promoMessage.style.color = '#dc3545';
        }
        
        updatePriceAndTime();
    }

    // Function to show/hide variation fields based on selected style
    function toggleStyleVariations() {
        const selectedStyle = selectedStyleInput.value;
        
        // Hide all variation groups first
        boxBraidsVariationGroup.style.display = 'none';
        cornrowsVariationGroup.style.display = 'none';
        twoStrandTwistsVariationGroup.style.display = 'none';
        preWashGroup.style.display = 'none';
        detanglingGroup.style.display = 'none';
        blowdryGroup.style.display = 'none';
        
        // Show relevant variation group based on selected style
        if (selectedStyle === 'Box Braids') {
            boxBraidsVariationGroup.style.display = 'block';
        } else if (selectedStyle === 'Cornrows') {
            cornrowsVariationGroup.style.display = 'block';
        } else if (selectedStyle === 'Two Strand Twists') {
            twoStrandTwistsVariationGroup.style.display = 'block';
        }
        
        // Show pre-wash option for all styles except weave
        if (selectedStyle !== 'Weave Install') {
            preWashGroup.style.display = 'block';
        }

        // Show detangling and blow-dry options for all styles except locs and weave
        if (!selectedStyle.toLowerCase().includes('loc') && selectedStyle !== 'Weave Install') {
            detanglingGroup.style.display = 'block';
            blowdryGroup.style.display = 'block';
        }
        
        updatePriceAndTime();
    }

    // Add event listeners
    hairLengthSelect.addEventListener('change', updatePriceAndTime);
    if (selectedStyleInput) {
        selectedStyleInput.addEventListener('change', toggleStyleVariations);
    }
    if (boxBraidsVariationSelect) {
        boxBraidsVariationSelect.addEventListener('change', updatePriceAndTime);
    }
    if (cornrowsVariationSelect) {
        cornrowsVariationSelect.addEventListener('change', updatePriceAndTime);
    }
    if (twoStrandTwistsVariationSelect) {
        twoStrandTwistsVariationSelect.addEventListener('change', updatePriceAndTime);
    }
    if (hairOptionSelect) {
        hairOptionSelect.addEventListener('change', updatePriceAndTime);
    }
    if (preWashOptionSelect) {
        preWashOptionSelect.addEventListener('change', updatePriceAndTime);
    }
    if (detanglingOptionSelect) {
        detanglingOptionSelect.addEventListener('change', updatePriceAndTime);
    }
    if (blowdryOptionSelect) {
        blowdryOptionSelect.addEventListener('change', updatePriceAndTime);
    }
    
    // Promo code event listeners
    if (promoCodeInput) {
        // Validate promo code on input (with debouncing)
        let promoCodeTimeout;
        promoCodeInput.addEventListener('input', function(e) {
            clearTimeout(promoCodeTimeout);
            promoCodeTimeout = setTimeout(() => {
                validatePromoCode(e.target.value);
            }, 500); // Wait 500ms after user stops typing
        });
        
        // Also validate on blur (when user leaves the field)
        promoCodeInput.addEventListener('blur', function(e) {
            validatePromoCode(e.target.value);
        });
    }
    
    // Initialize visibility and pricing
    toggleStyleVariations();
    updatePriceAndTime();

    // --- Form Submission (Initiate Stripe Checkout) ---
    const proceedToPayButton = document.getElementById('proceed-to-pay-button');
    const form = document.getElementById('booking-form');

    // Initialize Stripe.js with your publishable key
    // TODO: Replace 'YOUR_STRIPE_PUBLISHABLE_KEY' with your actual key
    const stripe = Stripe('pk_test_51REifLRqvuBtPAdXr3sOBg5kM3cH3RhEXxQiRGPc4uW9gV3RtZnoiUF2Qvzru3I9fzKmxXUgF22tzJBoYZS3XqYf00QA6fSLqs');

    proceedToPayButton.addEventListener('click', async function(e) {
        e.preventDefault(); // Prevent default form submission

        const name = document.getElementById('full-name').value.trim();
        const phone = document.getElementById('phone-number').value.trim();
        const style = document.getElementById('selected-style').value.trim();
        const hair_length = hairLengthSelect.value;
        const date = dateInput.value;
        const time = timeInput.value;
        const notes = document.getElementById('notes').value.trim();
        const boxBraidsVariation = boxBraidsVariationSelect?.value || '';
        const cornrowsVariation = cornrowsVariationSelect?.value || '';
        const twoStrandTwistsVariation = twoStrandTwistsVariationSelect?.value || '';
        const hairOption = hairOptionSelect?.value || '';
        const preWashOption = preWashOptionSelect?.value || 'no';
        const detanglingOption = detanglingOptionSelect?.value || 'no';
        const blowdryOption = blowdryOptionSelect?.value || 'no';

        // Basic validation
        if (!name || !phone || !style || !hair_length || !date || !time || !hairOption) {
            alert('Please fill out all required fields and select a date and time.');
            return;
        }
        
        // Validate current hair image (mandatory)
        if (!selectedCurrentHairFile) {
            alert('Please upload a photo of your current hair.');
            return;
        }
        
        // Validate box braids variation if box braids is selected
        if (style === 'Box Braids' && !boxBraidsVariation) {
            alert('Please select the type of box braids you want.');
            return;
        }
        
        // Validate cornrows variation if cornrows is selected
        if (style === 'Cornrows' && !cornrowsVariation) {
            alert('Please select the cornrows style you want.');
            return;
        }
        
        // Validate two strand twists variation if two strand twists is selected
        if (style === 'Two Strand Twists' && !twoStrandTwistsVariation) {
            alert('Please select the two strand twists style you want.');
            return;
        }

        // Disable button and show a simple indicator
        proceedToPayButton.disabled = true;
        proceedToPayButton.textContent = 'Processing...';

        try {
            // Use FormData to handle file upload
            const formData = new FormData();
            formData.append('name', name);
            formData.append('phone', phone);
            formData.append('style', style);
            formData.append('hair_length', hair_length);
            formData.append('date', date);
            formData.append('time', time);
            formData.append('notes', notes);
            formData.append('box_braids_variation', boxBraidsVariation);
            formData.append('cornrows_variation', cornrowsVariation);
            formData.append('two_strand_twists_variation', twoStrandTwistsVariation);
            formData.append('hair_option', hairOption);
            formData.append('pre_wash_option', preWashOption);
            formData.append('detangling_option', detanglingOption);
            formData.append('blowdry_option', blowdryOption);
            
            // Add promo code data
            const promoCode = promoCodeInput?.value?.trim().toUpperCase() || '';
            formData.append('promo_code', promoCode);
            formData.append('promo_discount', promoDiscount.toString());
            
            // Add mandatory current hair image
            if (selectedCurrentHairFile) {
                formData.append('current_hair_image', selectedCurrentHairFile);
            }
            
            // Add optional reference image if selected
            if (selectedImageFile) {
                formData.append('reference_image', selectedImageFile);
            }

            const response = await fetch('http://127.0.0.1:5000/api/create-checkout-session', {
                method: 'POST',
                body: formData // Use FormData instead of JSON
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to Stripe Checkout
                const { sessionId } = data;
                const result = await stripe.redirectToCheckout({
                    sessionId: sessionId,
                });

                if (result.error) {
                    // If `redirectToCheckout` fails due to a browser or network error, display the localized error message to the customer.
                    alert(result.error.message);
                }
            } else {
                // Handle errors from the backend (e.g., validation errors, Stripe API errors)
                alert(data.error || 'An error occurred while initiating payment.');
            }
        } catch (error) {
            console.error('Error initiating payment:', error);
            alert('An unexpected error occurred. Please try again.');
        } finally {
            // Re-enable the button
            proceedToPayButton.disabled = false;
            proceedToPayButton.innerHTML = '<i class="fas fa-calendar-check"></i> Proceed to Pay Deposit';
        }
    });

    // Initial render of calendar and setup
    renderCalendar();
    
    // --- Handle Style Parameter from URL ---
    function getStyleFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('style') || 'Box Braids';
    }
    
    // Set the selected style from URL parameter
    if (selectedStyleInput) {
        const styleFromURL = getStyleFromURL();
        selectedStyleInput.value = styleFromURL;
        toggleStyleVariations(); // Call this after setting the style
    }

    // --- Image Upload Handling ---
    // Current Hair Image (Mandatory)
    if (currentHairImageInput) {
        currentHairImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select a valid image file for your current hair photo.');
                    currentHairImageInput.value = '';
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Current hair image file is too large. Please select an image under 5MB.');
                    currentHairImageInput.value = '';
                    return;
                }
                
                selectedCurrentHairFile = file;
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    currentHairPreviewImg.src = e.target.result;
                    currentHairPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeCurrentHairImageBtn) {
        removeCurrentHairImageBtn.addEventListener('click', function() {
            currentHairImageInput.value = '';
            selectedCurrentHairFile = null;
            currentHairPreview.style.display = 'none';
            currentHairPreviewImg.src = '';
        });
    }

    // Reference Image (Optional)
    if (referenceImageInput) {
        referenceImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select a valid image file.');
                    referenceImageInput.value = '';
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image file is too large. Please select an image under 5MB.');
                    referenceImageInput.value = '';
                    return;
                }
                
                selectedImageFile = file;
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', function() {
            referenceImageInput.value = '';
            selectedImageFile = null;
            imagePreview.style.display = 'none';
            previewImg.src = '';
        });
    }
});
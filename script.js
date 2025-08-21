// Global functions for appointment actions
console.log('Loading cancelAppointment function...');

async function cancelAppointment(bookingId) {
    console.log('cancelAppointment called with bookingId:', bookingId);
    
    const warningMessage = `⚠️ IMPORTANT CANCELLATION NOTICE ⚠️

• Your deposit is NON-REFUNDABLE
• Once cancelled, you must rebook a new appointment
• Rescheduling is a better option - you keep your deposit

Would you like to:
1. Cancel (lose deposit, must rebook)
2. Reschedule instead (keep deposit, change date/time)


Click OK to cancel, or Cancel to keep your appointment.`;

    console.log('Showing warning message...');
    if (confirm(warningMessage)) {
        console.log('User confirmed warning, showing final confirmation...');
        // Show final confirmation
        const finalConfirm = confirm(`Are you absolutely sure you want to cancel?

⚠️ This will:
• Delete your appointment permanently
• Your deposit will NOT be refunded
• You'll need to book a new appointment

This action cannot be undone.`);

        if (finalConfirm) {
            console.log('User confirmed final confirmation, calling API...');
            try {
                // Call the cancel booking API
                const response = await fetch('https://us-central1-connect-2a17c.cloudfunctions.net/cancelBooking', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        bookingId: bookingId
                    })
                });
                
                console.log('API response status:', response.status);
                
                if (response.ok) {
                    console.log('Cancellation successful');
                    alert('Appointment cancelled successfully! You will receive a confirmation shortly.\n\nTo book a new appointment, please visit our booking page.');
                    
                    // Refresh the search results
                    const searchBtn = document.getElementById('search-btn');
                    if (searchBtn) {
                        searchBtn.click();
                    }
                } else {
                    const errorData = await response.json();
                    console.log('API error:', errorData);
                    if (errorData.error && errorData.error.includes('48 hours')) {
                        alert('⚠️ Cancellation Not Available\n\nCancellation is not available within 48 hours of your appointment.\n\nFor urgent cancellation needs, please call us at:\n📞 860-425-0751');
                    } else {
                        throw new Error(errorData.error || 'Failed to cancel appointment');
                    }
                }
            } catch (error) {
                console.error('Error cancelling appointment:', error);
                alert('Failed to cancel appointment. Please try again or call us at 860-425-0751.');
            }
        } else {
            console.log('User cancelled final confirmation');
        }
    } else {
        console.log('User cancelled warning message');
    }
}

function rescheduleAppointment(bookingId) {
    // Get the appointment data from the card
    const appointmentCard = document.querySelector(`[data-booking-id="${bookingId}"]`);
    if (!appointmentCard) {
        alert('Appointment not found. Please try refreshing the page.');
        return;
    }
    
    // Extract appointment data from the card
    const appointmentData = {
        bookingId: bookingId,
        name: appointmentCard.querySelector('.detail-item:nth-child(3) span').textContent.replace('Name: ', ''),
        phone: appointmentCard.querySelector('.detail-item:nth-child(4) span').textContent.replace('Phone: ', ''),
        style: appointmentCard.querySelector('.detail-item:nth-child(2) span').textContent.replace('Style: ', ''),
        appointmentDate: appointmentCard.querySelector('.appointment-date').textContent,
        appointmentTime: appointmentCard.querySelector('.detail-item:nth-child(1) span').textContent.replace('Time: ', ''),
        duration: appointmentCard.querySelector('.detail-item:nth-child(5) span').textContent.replace('Duration: ', '').replace(' hours', ''),
        totalPrice: parseFloat(appointmentCard.querySelector('.detail-item:nth-child(7) span').textContent.replace('Total Price: $', '')),
        depositAmount: parseFloat(appointmentCard.querySelector('.detail-item:nth-child(8) span').textContent.replace('Deposit: $', '').replace(' (Paid)', '').replace(' (Pending)', '')),
        hairLength: appointmentCard.querySelector('.detail-item:nth-child(6) span')?.textContent.replace('Hair Length: ', '') || '',
        notes: appointmentCard.querySelector('.detail-item:nth-child(10) span')?.textContent.replace('Notes: ', '') || ''
    };
    
    // Check if appointment is within 48 hours
    const appointmentDateTime = new Date(appointmentData.appointmentDate + ' ' + appointmentData.appointmentTime);
    const now = new Date();
    const timeDifference = appointmentDateTime.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    
    if (hoursDifference <= 48) {
        alert('⚠️ Rescheduling Not Available\n\nRescheduling is not available within 48 hours of your appointment.\n\nFor urgent rescheduling needs, please call us at:\n📞 860-425-0751\n\nWe\'ll do our best to accommodate your request!');
        return;
    }
    
    showRescheduleModal(appointmentData);
}

// Admin Login Functionality
document.addEventListener('DOMContentLoaded', function() {
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminModalClose = document.querySelector('.admin-modal-close');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminPasskeyInput = document.getElementById('admin-passkey');
    
    // Passkey for admin access
    const ADMIN_PASSKEY = '111970';
    
    // Show admin modal when admin button is clicked
    adminLoginBtn.addEventListener('click', function() {
        adminModal.style.display = 'block';
        adminPasskeyInput.focus();
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });
    
    // Close modal when X button is clicked
    adminModalClose.addEventListener('click', function() {
        adminModal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
        adminLoginForm.reset();
    });
    
    // Close modal when clicking outside of it
    adminModal.addEventListener('click', function(event) {
        if (event.target === adminModal) {
            adminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            adminLoginForm.reset();
        }
    });
    
    // Handle form submission
    adminLoginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const enteredPasskey = adminPasskeyInput.value.trim();
        
        if (enteredPasskey === ADMIN_PASSKEY) {
            // Correct passkey - redirect to admin page
            window.location.href = 'admin';
        } else {
            // Incorrect passkey - show error
            showError('Incorrect passkey. Please try again.');
            adminPasskeyInput.value = '';
            adminPasskeyInput.focus();
        }
    });
    
    // Handle Enter key press
    adminPasskeyInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            adminLoginForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // Function to show error message
    function showError(message) {
        // Remove any existing error messages
        const existingError = document.querySelector('.admin-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Create and show new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'admin-error';
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Insert error message after the input field
        const formGroup = adminPasskeyInput.closest('.form-group');
        formGroup.appendChild(errorDiv);
        
        // Remove error message after 3 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }
    
    // Add visual feedback for input focus
    adminPasskeyInput.addEventListener('focus', function() {
        this.style.borderColor = 'black';
    });
    
    adminPasskeyInput.addEventListener('blur', function() {
        if (this.value.trim() === '') {
            this.style.borderColor = '#e0e0e0';
        }
    });
});

// Search Appointments Functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('search-btn');
    const searchPhone = document.getElementById('search-phone');
    const searchResults = document.getElementById('search-results');
    
    if (searchBtn && searchPhone && searchResults) {
        // Handle search button click
        searchBtn.addEventListener('click', function() {
            searchAppointments();
        });
        
        // Handle Enter key press in search input
        searchPhone.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                searchAppointments();
            }
        });
        

        
        // Function to search appointments
        async function searchAppointments() {
            const phoneNumber = searchPhone.value.trim();
            
            if (!phoneNumber) {
                showSearchError('Please enter your phone number');
                return;
            }
            
            // Show loading state
            showLoading();
            
            try {
                // Search in Firebase first
                const firebaseUrl = `https://us-central1-connect-2a17c.cloudfunctions.net/searchBookingsByPhone?phone=${encodeURIComponent(phoneNumber)}`;
                
                const response = await fetch(firebaseUrl);
                
                let appointments = [];
                
                if (response.ok) {
                    const data = await response.json();
                    appointments = data.bookings || [];
                } else {
                    // Fallback to localStorage
                    const localBookings = JSON.parse(localStorage.getItem('adminBookings') || '[]');
                    appointments = localBookings.filter(booking => 
                        booking.phone && booking.phone.includes(phoneNumber.replace(/\D/g, ''))
                    );
                }
                
                displayAppointments(appointments);
                
            } catch (error) {
                console.error('Error searching appointments:', error);
                // Fallback to localStorage
                const localBookings = JSON.parse(localStorage.getItem('adminBookings') || '[]');
                const appointments = localBookings.filter(booking => 
                    booking.phone && booking.phone.includes(phoneNumber.replace(/\D/g, ''))
                );
                displayAppointments(appointments);
            }
        }
        
        // Function to show loading state
        function showLoading() {
            searchResults.style.display = 'block';
            searchResults.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Searching for your appointments...</p>
                </div>
            `;
        }
        
        // Function to display appointments
        function displayAppointments(appointments) {
            searchResults.style.display = 'block';
            
            if (appointments.length === 0) {
                searchResults.innerHTML = `
                    <div class="no-appointments">
                        <i class="fas fa-calendar-times"></i>
                        <h3>No appointments found</h3>
                        <p>No appointments found for this phone number. Please check your phone number and try again.</p>
                    </div>
                `;
                return;
            }
            
            // Separate future and past appointments
            const now = new Date();
            const futureAppointments = [];
            const pastAppointments = [];
            
            appointments.forEach(appointment => {
                // Handle different date formats
                let appointmentDate;
                if (appointment.date) {
                    if (appointment.date.includes('T')) {
                        appointmentDate = new Date(appointment.date);
                    } else if (appointment.date.includes('-')) {
                        appointmentDate = new Date(appointment.date + 'T00:00:00');
                    } else {
                        appointmentDate = new Date(appointment.date);
                    }
                } else if (appointment.appointmentDate) {
                    appointmentDate = new Date(appointment.appointmentDate + 'T00:00:00');
                } else {
                    appointmentDate = new Date();
                }
                
                // Add time to the date for accurate comparison
                let appointmentDateTime;
                if (appointment.time) {
                    const timeStr = appointment.time;
                    if (timeStr.includes(':')) {
                        const [hours, minutes] = timeStr.split(':');
                        appointmentDateTime = new Date(appointmentDate);
                        appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
                    } else {
                        appointmentDateTime = appointmentDate;
                    }
                } else if (appointment.appointmentTime) {
                    const timeStr = appointment.appointmentTime;
                    if (timeStr.includes(':')) {
                        const [hours, minutes] = timeStr.split(':');
                        appointmentDateTime = new Date(appointmentDate);
                        appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
                    } else {
                        appointmentDateTime = appointmentDate;
                    }
                } else {
                    appointmentDateTime = appointmentDate;
                }
                
                if (appointmentDateTime > now) {
                    futureAppointments.push(appointment);
                } else {
                    pastAppointments.push(appointment);
                }
            });
            
            // Sort future appointments by date (earliest first)
            futureAppointments.sort((a, b) => {
                const dateA = new Date(a.date || a.appointmentDate);
                const dateB = new Date(b.date || b.appointmentDate);
                return dateA - dateB;
            });
            
            // Sort past appointments by date (most recent first)
            pastAppointments.sort((a, b) => {
                const dateA = new Date(a.date || a.appointmentDate);
                const dateB = new Date(b.date || b.appointmentDate);
                return dateB - dateA;
            });
            
            let html = '';
            
            // Display future appointments
            if (futureAppointments.length > 0) {
                html += `
                    <div class="appointments-section">
                        <h3><i class="fas fa-calendar-check"></i> Upcoming Appointments (${futureAppointments.length})</h3>
                        ${futureAppointments.map(appointment => createAppointmentCard(appointment, true)).join('')}
                    </div>
                `;
            }
            
            // Display past appointments
            if (pastAppointments.length > 0) {
                html += `
                    <div class="appointments-section">
                        <h3><i class="fas fa-history"></i> Past Appointments (${pastAppointments.length})</h3>
                        ${pastAppointments.map(appointment => createAppointmentCard(appointment, false)).join('')}
                    </div>
                `;
            }
            
            searchResults.innerHTML = html;
        }
        
        function createAppointmentCard(appointment, isFuture) {
            // Handle different date formats
            let appointmentDate;
            if (appointment.date) {
                if (appointment.date.includes('T')) {
                    appointmentDate = new Date(appointment.date);
                } else if (appointment.date.includes('-')) {
                    appointmentDate = new Date(appointment.date + 'T00:00:00');
                } else {
                    appointmentDate = new Date(appointment.date);
                }
            } else if (appointment.appointmentDate) {
                appointmentDate = new Date(appointment.appointmentDate + 'T00:00:00');
            } else {
                appointmentDate = new Date();
            }
            
            // Check if date is valid
            const formattedDate = isNaN(appointmentDate.getTime()) 
                ? 'Date not available' 
                : appointmentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            
            // Handle different time formats
            let formattedTime = 'TBD';
            if (appointment.displayTime) {
                formattedTime = appointment.displayTime;
            } else if (appointment.time) {
                const timeStr = appointment.time;
                if (timeStr.includes(':')) {
                    const [hours, minutes] = timeStr.split(':');
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    formattedTime = `${displayHour}:${minutes} ${ampm}`;
                } else {
                    formattedTime = timeStr;
                }
            } else if (appointment.appointmentTime) {
                const timeStr = appointment.appointmentTime;
                if (timeStr.includes(':')) {
                    const [hours, minutes] = timeStr.split(':');
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    formattedTime = `${displayHour}:${minutes} ${ampm}`;
                } else {
                    formattedTime = timeStr;
                }
            }
            
            const status = appointment.status || 'confirmed';
            const statusClass = status === 'confirmed' ? 'confirmed' : 'pending';
            
            // Create comprehensive appointment details
            const additionalServices = [];
            if (appointment.styleSpecificOptions) {
                if (appointment.styleSpecificOptions['wash-service'] === 'wash') {
                    additionalServices.push('Wash & Condition (+$30)');
                }
                if (appointment.styleSpecificOptions['detangle-service'] === 'detangle') {
                    additionalServices.push('Detangle Hair (+$20)');
                }
            }
            
            const remainingBalance = appointment.totalPrice - appointment.depositAmount;
            
            return `
                <div class="appointment-card ${isFuture ? 'future' : 'past'}" data-booking-id="${appointment.bookingId}">
                    <div class="appointment-header">
                        <div class="appointment-date">${formattedDate}</div>
                        <div class="appointment-status ${statusClass}">${status}</div>
                    </div>
                    <div class="appointment-details">
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>Time: ${formattedTime}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-cut"></i>
                            <span>Style: ${appointment.style}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-user"></i>
                            <span>Name: ${appointment.name}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-phone"></i>
                            <span>Phone: ${appointment.phone}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-hourglass-half"></i>
                            <span>Duration: ${appointment.duration} hours</span>
                        </div>
                        ${appointment.hairLength ? `
                        <div class="detail-item">
                            <i class="fas fa-ruler"></i>
                            <span>Hair Length: ${appointment.hairLength}</span>
                        </div>
                        ` : ''}
                        ${additionalServices.length > 0 ? `
                        <div class="detail-item">
                            <i class="fas fa-plus-circle"></i>
                            <span>Additional Services: ${additionalServices.join(', ')}</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <i class="fas fa-dollar-sign"></i>
                            <span>Total Price: $${appointment.totalPrice}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-credit-card"></i>
                            <span>Deposit: $${appointment.depositAmount} ${appointment.depositPaid ? '(Paid)' : '(Pending)'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-balance-scale"></i>
                            <span>Remaining Balance: $${remainingBalance}</span>
                        </div>
                        ${appointment.notes ? `
                        <div class="detail-item">
                            <i class="fas fa-sticky-note"></i>
                            <span>Notes: ${appointment.notes}</span>
                        </div>
                        ` : ''}
                        ${(appointment.styleImage && appointment.styleImage !== 'null' && appointment.styleImage !== '') || (appointment.hairImage && appointment.hairImage !== 'null' && appointment.hairImage !== '') ? `
                        <div class="detail-item">
                            <i class="fas fa-images"></i>
                            <span>Reference Images: Provided</span>
                        </div>
                        ` : ''}
                    </div>
                    ${isFuture ? `
                    <div class="appointment-actions">
                        <button class="action-btn reschedule" onclick="rescheduleAppointment('${appointment.bookingId}')">
                            <i class="fas fa-calendar-alt"></i>
                            Reschedule
                        </button>
                        <button class="action-btn cancel" onclick="cancelAppointment('${appointment.bookingId}')">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                    </div>
                    ` : `
                    <div class="appointment-actions">
                        <span class="past-appointment-note">
                            <i class="fas fa-info-circle"></i>
                            This appointment has already passed
                        </span>
                    </div>
                    `}
                </div>
            `;
        }
        
        // Function to show search error
        function showSearchError(message) {
            searchResults.style.display = 'block';
            searchResults.innerHTML = `
                <div class="no-appointments">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }
});

// Global functions for appointment actions
let currentRescheduleAppointment = null;
let selectedRescheduleDate = null;
let selectedRescheduleTime = null;

function showRescheduleModal(appointmentData) {
    const modal = document.getElementById('reschedule-modal');
    const appointmentInfo = document.getElementById('reschedule-appointment-info');
    
    // Display current appointment info
    appointmentInfo.innerHTML = `
        <h3>Current Appointment</h3>
        <div class="appointment-info-item">
            <i class="fas fa-user"></i>
            <span>${appointmentData.name}</span>
        </div>
        <div class="appointment-info-item">
            <i class="fas fa-phone"></i>
            <span>${appointmentData.phone}</span>
        </div>
        <div class="appointment-info-item">
            <i class="fas fa-cut"></i>
            <span>${appointmentData.style}</span>
        </div>
        <div class="appointment-info-item">
            <i class="fas fa-calendar"></i>
            <span>${appointmentData.appointmentDate}</span>
        </div>
        <div class="appointment-info-item">
            <i class="fas fa-clock"></i>
            <span>${appointmentData.appointmentTime}</span>
        </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Initialize reschedule calendar
    initRescheduleCalendar();
    
    // Setup modal event listeners
    setupRescheduleModalListeners();
    
    // Pre-select the current appointment date and time
    preSelectCurrentAppointment(appointmentData);
}

function initRescheduleCalendar() {
    const currentMonth = document.getElementById('reschedule-current-month');
    const calendarDays = document.getElementById('reschedule-calendar-days');
    const prevBtn = document.getElementById('reschedule-prev-month');
    const nextBtn = document.getElementById('reschedule-next-month');
    
    let currentDate = new Date();
    currentDate.setDate(1); // Start with first day of current month
    
    function updateRescheduleCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        currentMonth.textContent = `${monthNames[month]} ${year}`;
        
        // Clear calendar
        calendarDays.innerHTML = '';
        
        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Add empty cells for days before first day of month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'reschedule-calendar-day other-month';
            calendarDays.appendChild(emptyDay);
        }
        
        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'reschedule-calendar-day';
            dayElement.textContent = day;
            
            const date = new Date(year, month, day);
            const today = new Date();
            const minimumBookingDate = new Date();
            minimumBookingDate.setHours(today.getHours() + 30); // 30 hours from now
            
            // Check if date is available for booking
            const isPast = date < today;
            const isSunday = date.getDay() === 0;
            const isTooSoon = date < minimumBookingDate;
            const isUnavailable = isPast || isSunday || isTooSoon;
            
            if (isUnavailable) {
                dayElement.classList.add('disabled');
            } else {
                dayElement.addEventListener('click', () => selectRescheduleDate(date));
            }
            
            calendarDays.appendChild(dayElement);
        }
    }
    
    // Event listeners for navigation
    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateRescheduleCalendar();
    });
    
    nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateRescheduleCalendar();
    });
    
    // Initialize calendar
    updateRescheduleCalendar();
}

function selectRescheduleDate(date) {
    // Remove previous selection
    document.querySelectorAll('.reschedule-calendar-day.selected').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Add selection to clicked day
    event.target.classList.add('selected');
    
    selectedRescheduleDate = date;
    generateRescheduleTimeSlots(date);
    
    // Update selection summary
    updateSelectionSummary();
}

async function generateRescheduleTimeSlots(date) {
    const timeSlotsContainer = document.getElementById('reschedule-time-slots-container');
    const timeSlotsSection = document.getElementById('reschedule-time-slots');
    
    timeSlotsContainer.innerHTML = '';
    timeSlotsSection.style.display = 'block';
    
    // Business hours
    const businessHours = { start: 7, end: 18 }; // 7 AM to 6 PM
    
    // Fetch existing bookings for this date
    let existingBookings = [];
    try {
        const dateString = date.toISOString().split('T')[0];
        const response = await fetch(`https://us-central1-connect-2a17c.cloudfunctions.net/getBookingsForDate?date=${dateString}`);
        if (response.ok) {
            const data = await response.json();
            existingBookings = data.bookings || data;
        } else {
            // Fallback to localStorage
            const localBookings = JSON.parse(localStorage.getItem('adminBookings') || '[]');
            existingBookings = localBookings.filter(booking => booking.date === dateString);
        }
    } catch (error) {
        console.log('Error fetching bookings for reschedule, using localStorage');
        const localBookings = JSON.parse(localStorage.getItem('adminBookings') || '[]');
        existingBookings = localBookings.filter(booking => booking.date === dateString);
    }
    
    // Ensure existingBookings is always an array
    if (!Array.isArray(existingBookings)) {
        existingBookings = [];
    }
    
    // Generate time slots
    for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'reschedule-time-slot';
        
        // Format time
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const timeString = `${displayHour}:00 ${ampm}`;
        timeSlot.textContent = timeString;
        
        // Check if this time slot is too soon (24-hour rule)
        const selectedDateTime = new Date(date);
        selectedDateTime.setHours(hour, 0, 0, 0);
        const now = new Date();
        const minimumBookingTime = new Date();
        minimumBookingTime.setHours(now.getHours() + 24); // 24 hours from now
        const isTooSoon = selectedDateTime < minimumBookingTime;
        
        // Check availability
        let concurrentBookings = 0;
        for (const booking of existingBookings) {
            const bookingTime = booking.appointmentTime || booking.time;
            const bookingStartHour = parseInt(bookingTime.split(':')[0]);
            const bookingDuration = parseInt(booking.duration) || 2;
            
            // Check if this booking overlaps with the current hour
            if (hour >= bookingStartHour && hour < bookingStartHour + bookingDuration) {
                concurrentBookings++;
            }
        }
        
        // Apply color coding based on availability and timing
        if (isTooSoon) {
            timeSlot.classList.add('disabled'); // Disabled - too soon
        } else if (concurrentBookings >= 2) {
            timeSlot.classList.add('disabled'); // Red - fully booked (2+ overlaps)
        } else if (concurrentBookings === 1) {
            timeSlot.classList.add('limited'); // Orange - limited availability (1 overlap)
            timeSlot.addEventListener('click', () => selectRescheduleTime(hour, timeSlot));
        } else {
            timeSlot.classList.add('available'); // Green - available (no overlaps)
            timeSlot.addEventListener('click', () => selectRescheduleTime(hour, timeSlot));
        }
        
        timeSlotsContainer.appendChild(timeSlot);
    }
}

function selectRescheduleTime(hour, element) {
    // Remove previous selection
    document.querySelectorAll('.reschedule-time-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Add selection to clicked slot
    element.classList.add('selected');
    
    selectedRescheduleTime = hour;
    
    // Enable confirm button
    const confirmBtn = document.getElementById('confirm-reschedule-btn');
    confirmBtn.disabled = false;
    
    // Update selection summary
    updateSelectionSummary();
}

function setupRescheduleModalListeners() {
    const modal = document.getElementById('reschedule-modal');
    const closeBtn = document.querySelector('.reschedule-modal-close');
    const cancelBtn = document.getElementById('cancel-reschedule-btn');
    const confirmBtn = document.getElementById('confirm-reschedule-btn');
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetRescheduleForm();
    });
    
    // Close when clicking outside
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetRescheduleForm();
        }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetRescheduleForm();
    });
    
    // Confirm reschedule
    confirmBtn.addEventListener('click', () => {
        if (selectedRescheduleDate && selectedRescheduleTime !== null) {
            confirmReschedule();
        }
    });
}

function preSelectCurrentAppointment(appointmentData) {
    // Parse the current appointment date
    const currentDateStr = appointmentData.appointmentDate;
    let currentDate;
    
    // Try to parse the date from various formats
    if (currentDateStr.includes(',')) {
        // Format: "Monday, January 1, 2024"
        currentDate = new Date(currentDateStr);
    } else if (currentDateStr.includes('-')) {
        // Format: "2024-01-01"
        currentDate = new Date(currentDateStr);
    } else {
        // Try to parse as is
        currentDate = new Date(currentDateStr);
    }
    
    if (isNaN(currentDate.getTime())) {
        console.log('Could not parse current appointment date');
        return;
    }
    
    // Parse the current appointment time
    const currentTimeStr = appointmentData.appointmentTime;
    let currentHour;
    
    if (currentTimeStr.includes(':')) {
        const timeParts = currentTimeStr.split(':');
        let hour = parseInt(timeParts[0]);
        const ampm = timeParts[1].toLowerCase().includes('pm') ? 'PM' : 'AM';
        
        if (ampm === 'PM' && hour !== 12) {
            hour += 12;
        } else if (ampm === 'AM' && hour === 12) {
            hour = 0;
        }
        
        currentHour = hour;
    } else {
        // Try to parse as 24-hour format
        currentHour = parseInt(currentTimeStr);
    }
    
    if (isNaN(currentHour)) {
        console.log('Could not parse current appointment time');
        return;
    }
    
    // Set the calendar to the current appointment's month
    const calendarMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthSpan = document.getElementById('reschedule-current-month');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthSpan.textContent = `${monthNames[calendarMonth.getMonth()]} ${calendarMonth.getFullYear()}`;
    
    // Update the calendar to show the correct month
    updateRescheduleCalendarForMonth(calendarMonth);
    
    // Pre-select the current appointment date
    setTimeout(() => {
        const dayElements = document.querySelectorAll('.reschedule-calendar-day');
        dayElements.forEach(dayElement => {
            if (dayElement.textContent == currentDate.getDate() && !dayElement.classList.contains('disabled')) {
                dayElement.classList.add('selected');
                selectedRescheduleDate = currentDate;
                
                // Generate time slots for this date
                generateRescheduleTimeSlots(currentDate);
                
                // Pre-select the current appointment time
                setTimeout(() => {
                    const timeSlots = document.querySelectorAll('.reschedule-time-slot');
                    timeSlots.forEach(slot => {
                        const slotText = slot.textContent;
                        if (slotText.includes(`${currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour}:00`)) {
                            slot.classList.add('selected');
                            selectedRescheduleTime = currentHour;
                            
                            // Enable confirm button
                            const confirmBtn = document.getElementById('confirm-reschedule-btn');
                            confirmBtn.disabled = false;
                            
                            // Update selection summary
                            updateSelectionSummary();
                        }
                    });
                }, 100);
            }
        });
    }, 100);
}

function updateRescheduleCalendarForMonth(targetDate) {
    const calendarDays = document.getElementById('reschedule-calendar-days');
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    // Clear calendar
    calendarDays.innerHTML = '';
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'reschedule-calendar-day other-month';
        calendarDays.appendChild(emptyDay);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'reschedule-calendar-day';
        dayElement.textContent = day;
        
        const date = new Date(year, month, day);
        const today = new Date();
        const minimumBookingDate = new Date();
        minimumBookingDate.setHours(today.getHours() + 30); // 30 hours from now
        
        // Check if date is available for booking
        const isPast = date < today;
        const isSunday = date.getDay() === 0;
        const isTooSoon = date < minimumBookingDate;
        const isUnavailable = isPast || isSunday || isTooSoon;
        
        if (isUnavailable) {
            dayElement.classList.add('disabled');
        } else {
            dayElement.addEventListener('click', () => selectRescheduleDate(date));
        }
        
        calendarDays.appendChild(dayElement);
    }
}

function getAppointmentDuration(style) {
    // Duration mapping based on style
    const styleDurations = {
        'cornrows': 1,
        'boho-box-braids': 4,
        'knotless-box-braids': 4,
        'jumbo-box-braids': 4,
        'lemonade-braids': 4,
        'fulani-braids': 4,
        'passion-twists': 3,
        'senegalese-twists': 3,
        'marley-twists': 3,
        'stitch-braids': 4,
        'tribal-braids': 3,
        'tree-braids': 3,
        'micro-braids': 4,
        'weave': 2,
        'starter-locs': 2,
        'locs-retwist': 1,
        'lock-retwist-2-strands': 1,
        'two-strand-twists': 1
    };
    
    // Try to match the style name (case insensitive)
    const styleKey = Object.keys(styleDurations).find(key => 
        style.toLowerCase().includes(key.toLowerCase())
    );
    
    return styleKey ? styleDurations[styleKey] : 2; // Default 2 hours if not found
}

function updateSelectionSummary() {
    const summarySection = document.getElementById('reschedule-selection-summary');
    const dateDisplay = document.getElementById('selected-date-display');
    const timeDisplay = document.getElementById('selected-time-display');
    const endTimeDisplay = document.getElementById('selected-end-time-display');
    
    if (selectedRescheduleDate) {
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = selectedRescheduleDate.toLocaleDateString('en-US', dateOptions);
        dateDisplay.textContent = formattedDate;
    } else {
        dateDisplay.textContent = 'No date selected';
    }
    
    if (selectedRescheduleTime !== null) {
        const ampm = selectedRescheduleTime >= 12 ? 'PM' : 'AM';
        const displayHour = selectedRescheduleTime === 0 ? 12 : selectedRescheduleTime > 12 ? selectedRescheduleTime - 12 : selectedRescheduleTime;
        const formattedTime = `${displayHour}:00 ${ampm}`;
        timeDisplay.textContent = formattedTime;
        
        // Calculate end time based on appointment duration
        if (currentRescheduleAppointment && currentRescheduleAppointment.style) {
            const duration = getAppointmentDuration(currentRescheduleAppointment.style);
            const endHour = selectedRescheduleTime + duration;
            
            const endAmpm = endHour >= 12 ? 'PM' : 'AM';
            const endDisplayHour = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
            const formattedEndTime = `${endDisplayHour}:00 ${endAmpm}`;
            
            endTimeDisplay.textContent = `Ends at ${formattedEndTime} (${duration} hour${duration > 1 ? 's' : ''})`;
        } else {
            endTimeDisplay.textContent = 'Duration: --';
        }
    } else {
        timeDisplay.textContent = 'No time selected';
        endTimeDisplay.textContent = 'Duration: --';
    }
    
    // Show summary if we have a date or time selected
    if (selectedRescheduleDate || selectedRescheduleTime !== null) {
        summarySection.style.display = 'block';
    } else {
        summarySection.style.display = 'none';
    }
}

function resetRescheduleForm() {
    selectedRescheduleDate = null;
    selectedRescheduleTime = null;
    currentRescheduleAppointment = null;
    
    const confirmBtn = document.getElementById('confirm-reschedule-btn');
    confirmBtn.disabled = true;
    
    document.querySelectorAll('.reschedule-calendar-day.selected').forEach(day => {
        day.classList.remove('selected');
    });
    
    document.querySelectorAll('.reschedule-time-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Hide selection summary
    const summarySection = document.getElementById('reschedule-selection-summary');
    summarySection.style.display = 'none';
}

async function confirmReschedule() {
    if (!currentRescheduleAppointment || !selectedRescheduleDate || selectedRescheduleTime === null) {
        alert('Please select a new date and time');
        return;
    }
    
    // Get the confirm button and disable it
    const confirmBtn = document.getElementById('confirm-reschedule-btn');
    const originalText = confirmBtn.innerHTML;
    
    // Show loading state
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        Rescheduling...
    `;
    
    try {
        // Format the new date and time
        const newDate = selectedRescheduleDate.toISOString().split('T')[0];
        const newTime = `${selectedRescheduleTime.toString().padStart(2, '0')}:00`;
        
        // Update the appointment in Firebase
        const updateData = {
            bookingId: currentRescheduleAppointment.bookingId,
            newDate: newDate,
            newTime: newTime,
            originalDate: currentRescheduleAppointment.appointmentDate,
            originalTime: currentRescheduleAppointment.appointmentTime
        };
        
        const response = await fetch('https://us-central1-connect-2a17c.cloudfunctions.net/updateBooking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            alert('Appointment rescheduled successfully! You will receive a confirmation shortly.');
            
            // Close modal and refresh search results
            document.getElementById('reschedule-modal').style.display = 'none';
            document.body.style.overflow = 'auto';
            resetRescheduleForm();
            
            // Refresh the search results
            const searchBtn = document.getElementById('search-btn');
            if (searchBtn) {
                searchBtn.click();
            }
        } else {
            const errorData = await response.json();
            if (errorData.error && errorData.error.includes('48 hours')) {
                alert('⚠️ Rescheduling Not Available\n\nRescheduling is not available within 48 hours of your appointment.\n\nFor urgent rescheduling needs, please call us at:\n📞 860-425-0751\n\nWe\'ll do our best to accommodate your request!');
            } else {
                throw new Error(errorData.error || 'Failed to update appointment');
            }
        }
        
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        alert('Failed to reschedule appointment. Please try again or call us at 860-425-0751.');
    } finally {
        // Restore button state
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
} 
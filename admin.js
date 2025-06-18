'use strict';

// Wait for both Firebase and FullCalendar to be available
document.addEventListener('DOMContentLoaded', async () => {
    // Check if required globals are available
    if (typeof firebase === 'undefined') {
        console.error('Firebase is not loaded');
        return;
    }
    if (typeof FullCalendar === 'undefined') {
        console.error('FullCalendar is not loaded');
        return;
    }
    if (typeof firebaseConfig === 'undefined') {
        console.error('Firebase config is not loaded');
        return;
    }

    try {
        // Initialize Firebase if not already initialized
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const db = firebase.firestore();
        
        // Test the connection
        await db.collection('bookings').limit(1).get();
        console.log('Successfully connected to Firestore');

        // Calendar instance
        let calendar = null;

        // Initialize calendar
        function initializeCalendar() {
            const calendarEl = document.getElementById('calendar');
            if (!calendarEl) {
                console.error('Calendar element not found');
                return;
            }
            
            calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: false,
                selectable: true,
                editable: false,
                dayMaxEvents: true,
                slotMinTime: '09:00:00',
                slotMaxTime: '21:00:00',
                slotDuration: '00:30:00',
                allDaySlot: false,
                eventClick: handleEventClick,
                displayEventEnd: true,
                eventDisplay: 'block',
                slotEventOverlap: true,
                maxConcurrentBookings: 2,
                eventDidMount: function(info) {
                    // Add custom styling for overlapping events
                    if (info.event.display !== 'background') {
                        info.el.style.width = '45%';  // Make events narrower to fit two side by side
                    }
                },
                events: function(info, successCallback, failureCallback) {
                    // Return the already loaded bookings instead of fetching again
                    const events = allBookings.map(booking => {
                        const startDate = new Date(booking.appointmentDateTime);
                        const endDate = new Date(startDate.getTime() + (parseInt(booking.duration) * 60 * 1000));
                        
                        return {
                            id: booking.id,
                            title: `${booking.name} - ${booking.selectedStyle}`,
                            start: startDate,
                            end: endDate,
                            backgroundColor: getStatusColor(booking.status),
                            borderColor: getStatusColor(booking.status),
                            extendedProps: {
                                ...booking,
                                concurrent: 0  // Initialize concurrent count
                            },
                            display: 'block'
                        };
                    });

                    // Count concurrent appointments and update their properties
                    events.forEach(event1 => {
                        event1.extendedProps.concurrent = events.filter(event2 => {
                            if (event1.id === event2.id) return false;
                            
                            const event1Start = new Date(event1.start);
                            const event1End = new Date(event1.end);
                            const event2Start = new Date(event2.start);
                            const event2End = new Date(event2.end);
                            
                            return (
                                (event1Start >= event2Start && event1Start < event2End) ||
                                (event1End > event2Start && event1End <= event2End) ||
                                (event1Start <= event2Start && event1End >= event2End)
                            );
                        }).length;
                    });

                    // Filter out events that have more than 1 concurrent appointment
                    const filteredEvents = events.filter(event => event.extendedProps.concurrent <= 1);
                    
                    successCallback(filteredEvents);
                }
            });

            // Initial render
            calendar.render();
            
            // Load initial data
            loadBookings();
        }

        // Bookings list functionality
        let allBookings = [];

        async function loadBookings() {
            try {
                const snapshot = await db.collection('bookings').get();
                allBookings = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Update calendar events
                calendar.refetchEvents();
                
                // Update bookings list
                renderBookings(allBookings);
            } catch (error) {
                console.error('Error loading bookings:', error);
            }
        }

        function renderBookings(bookings) {
            const bookingsList = document.getElementById('bookings-list');
            bookingsList.innerHTML = '';

            // Sort bookings by date in descending order (newest first)
            const sortedBookings = [...bookings].sort((a, b) => {
                const dateA = new Date(a.appointmentDateTime);
                const dateB = new Date(b.appointmentDateTime);
                return dateB - dateA;
            });

            sortedBookings.forEach(booking => {
                const row = document.createElement('tr');
                const dateTime = new Date(booking.appointmentDateTime);
                
                row.innerHTML = `
                    <td>${dateTime.toLocaleString()}</td>
                    <td>${booking.name}</td>
                    <td>${booking.selectedStyle}</td>
                    <td><span class="booking-status status-${booking.status || 'pending'}">${booking.status || 'Pending'}</span></td>
                `;
                
                // Add click handler to show booking details
                row.addEventListener('click', () => showBookingDetails(booking));
                
                bookingsList.appendChild(row);
            });
        }

        function filterBookings() {
            const statusFilter = document.getElementById('status-filter').value;
            const searchText = document.getElementById('search-bookings').value.toLowerCase();

            const filteredBookings = allBookings.filter(booking => {
                const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
                const matchesSearch = 
                    booking.name.toLowerCase().includes(searchText) ||
                    booking.selectedStyle.toLowerCase().includes(searchText) ||
                    new Date(booking.appointmentDateTime).toLocaleString().toLowerCase().includes(searchText);
                
                return matchesStatus && matchesSearch;
            });

            renderBookings(filteredBookings);
        }

        // Get color based on booking status
        function getStatusColor(status) {
            const colors = {
                'confirmed': '#00b894',
                'pending': '#fdcb6e',
                'cancelled': '#ff7675',
                'default': '#b2bec3'
            };
            return colors[status.toLowerCase()] || colors.default;
        }

        // Format date for display
        function formatDate(date) {
            return new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }

        // Show booking details in modal
        function showBookingDetails(booking) {
            const modal = document.getElementById('booking-modal');
            const detailsContainer = document.getElementById('booking-details');
            const dateTime = new Date(booking.appointmentDateTime);
            
            // Format the details HTML
            const detailsHTML = `
                <div class="booking-details-grid">
                    <div class="detail-group">
                        <h3>Client Information</h3>
                        <p>Name: ${booking.name}</p>
                        <p>Phone: ${booking.phone}</p>
                        <p>Email: ${booking.email}</p>
                    </div>
                    
                    <div class="detail-group">
                        <h3>Appointment Details</h3>
                        <p>Date & Time: ${dateTime.toLocaleString()}</p>
                        <p>Service: ${booking.selectedStyle}</p>
                        <p>Duration: ${booking.duration} minutes</p>
                        <p>Total Price: $${booking.total_price}</p>
                        <p>Status: <span class="status-${booking.status || 'pending'}">${booking.status || 'Pending'}</span></p>
                    </div>

                    <div class="detail-group">
                        <h3>Service Options</h3>
                        ${booking.hairLength ? `<p>Hair Length: ${booking.hairLength}</p>` : ''}
                        ${booking.hairOption ? `<p>Hair Option: ${booking.hairOption}</p>` : ''}
                        ${booking.preWashOption ? `<p>Pre-Wash: ${booking.preWashOption}</p>` : ''}
                        ${booking.notes ? `<p>Notes: ${booking.notes}</p>` : ''}
                    </div>
                </div>
            `;
            
            detailsContainer.innerHTML = detailsHTML;
            modal.style.display = 'block';
            
            // Close modal when clicking the close button
            const closeBtn = modal.querySelector('.close-modal');
            closeBtn.onclick = () => modal.style.display = 'none';
            
            // Close modal when clicking outside
            window.onclick = (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            };
        }

        // Make sure calendar event click shows the same details
        function handleEventClick(info) {
            const booking = {
                ...info.event.extendedProps,
                appointmentDateTime: info.event.start,
                id: info.event.id
            };
            showBookingDetails(booking);
        }

        // Function to update view buttons active state
        function updateViewButtons() {
            const currentView = calendar.view.type;
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            switch (currentView) {
                case 'dayGridMonth':
                    document.getElementById('month-view').classList.add('active');
                    break;
                case 'timeGridWeek':
                    document.getElementById('week-view').classList.add('active');
                    break;
                case 'timeGridDay':
                    document.getElementById('day-view').classList.add('active');
                    break;
            }
        }

        // Update the range display in the header
        function updateRange() {
            const view = calendar.view;
            const range = document.getElementById('current-range');
            
            if (view.type === 'dayGridMonth') {
                range.textContent = view.title;
            } else if (view.type === 'timeGridWeek') {
                const start = view.currentStart;
                const end = view.currentEnd;
                range.textContent = `${start.toLocaleDateString()} - ${new Date(end - 1).toLocaleDateString()}`;
            } else if (view.type === 'timeGridDay') {
                range.textContent = view.currentStart.toLocaleDateString();
            }
        }

        // Initialize calendar
        initializeCalendar();

        // Add event listeners for navigation buttons
        document.getElementById('prev-btn').addEventListener('click', () => {
            calendar.prev();
            updateRange();
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            calendar.next();
            updateRange();
        });

        document.getElementById('today-btn').addEventListener('click', () => {
            calendar.today();
            updateRange();
        });

        // Add event listeners for view buttons
        document.getElementById('month-view').addEventListener('click', () => {
            calendar.changeView('dayGridMonth');
            updateViewButtons();
            updateRange();
        });

        document.getElementById('week-view').addEventListener('click', () => {
            calendar.changeView('timeGridWeek');
            updateViewButtons();
            updateRange();
        });

        document.getElementById('day-view').addEventListener('click', () => {
            calendar.changeView('timeGridDay');
            updateViewButtons();
            updateRange();
        });

        // Modal close button
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('booking-modal').style.display = 'none';
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('booking-modal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Add event listeners for filters
        document.getElementById('status-filter').addEventListener('change', filterBookings);
        document.getElementById('search-bookings').addEventListener('input', filterBookings);

        // Refresh data periodically (every 5 minutes)
        setInterval(loadBookings, 5 * 60 * 1000);
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        // Display error message to user
        const calendarEl = document.getElementById('calendar');
        if (calendarEl) {
            calendarEl.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 20px; color: red;">
                    <h3>Error Connecting to Database</h3>
                    <p>Please check your internet connection and try again.</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }
});
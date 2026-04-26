'use strict';

// Wait for FullCalendar to be available
document.addEventListener('DOMContentLoaded', async () => {
    // Check if FullCalendar is available
    if (typeof FullCalendar === 'undefined') {
        console.error('FullCalendar is not loaded');
        const calendarEl = document.getElementById('calendar');
        if (calendarEl) {
            calendarEl.innerHTML = '<div style="text-align: center; padding: 20px; color: red;"><h3>Error Loading Calendar</h3><p>Please refresh the page.</p></div>';
        }
        return;
    }

    // Calendar instance
    let calendar = null;
    let allBookings = [];

    function parseMoney(value) {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount : 0;
    }

    function getBookingTimestamp(booking) {
        return new Date(booking.createdAt || booking.updatedAt || booking.appointmentDateTime || 0);
    }

    function isBookingInRange(booking, rangeKey) {
        if (rangeKey === 'all') return true;

        const bookingDate = getBookingTimestamp(booking);
        if (Number.isNaN(bookingDate.getTime())) return false;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

        if (rangeKey === 'today') {
            return bookingDate >= startOfToday && bookingDate < startOfTomorrow;
        }

        if (rangeKey === 'week') {
            const startOfWeek = new Date(startOfToday);
            const weekDay = startOfWeek.getDay(); // 0 = Sunday
            startOfWeek.setDate(startOfWeek.getDate() - weekDay);
            return bookingDate >= startOfWeek && bookingDate < startOfTomorrow;
        }

        if (rangeKey === 'month') {
            return bookingDate.getFullYear() === now.getFullYear() && bookingDate.getMonth() === now.getMonth();
        }

        if (rangeKey === 'year') {
            return bookingDate.getFullYear() === now.getFullYear();
        }

        if (rangeKey === 'last7' || rangeKey === 'last30') {
            const days = rangeKey === 'last7' ? 7 : 30;
            const start = new Date(startOfToday);
            start.setDate(start.getDate() - (days - 1));
            return bookingDate >= start && bookingDate < startOfTomorrow;
        }

        return true;
    }

    function updateRevenueSummary() {
        // Revenue is now shown inside the Stats tab via renderStats — no-op here.
    }

    // Names/emails excluded from stats (test accounts, internal, etc.)
    const STATS_EXCLUDED_NAMES = ['christian james torres', 'moustapha'];

    function isExcludedFromStats(booking) {
        const name = (booking.name || '').toLowerCase().trim();
        return STATS_EXCLUDED_NAMES.some(ex => name.includes(ex));
    }

    function initializeTabs() {
        const tabs = [
            { btn: document.getElementById('stats-tab-btn'),    panel: document.getElementById('stats-tab'),    name: 'stats' },
            { btn: document.getElementById('calendar-tab-btn'), panel: document.getElementById('calendar-tab'), name: 'calendar' },
        ];

        function showTab(name) {
            tabs.forEach(t => {
                if (!t.btn || !t.panel) return;
                const active = t.name === name;
                t.btn.classList.toggle('active', active);
                t.panel.classList.toggle('active', active);
            });
            if (name === 'calendar' && calendar) {
                setTimeout(() => { calendar.updateSize(); updateRange(); updateViewButtons(); }, 10);
            }
        }

        tabs.forEach(t => { if (t.btn) t.btn.addEventListener('click', () => showTab(t.name)); });
    }

    // ── Stats Rendering ───────────────────────────────────────────
    function $fmt(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    let currentStatsRange = 'month';

    function renderStats(allData) {
        const rangeKey = currentStatsRange;

        // Exclude internal/test accounts and apply date range
        const bookings = allData.filter(b =>
            !isExcludedFromStats(b) && isBookingInRange(b, rangeKey)
        );

        // Update the range description label
        const rangeLabels = {
            all: 'All Time', today: 'Today', week: 'This Week',
            month: 'This Month', year: 'This Year', last7: 'Last 7 Days', last30: 'Last 30 Days'
        };
        const labelEl = document.getElementById('stats-range-label');
        if (labelEl) labelEl.textContent = rangeLabels[rangeKey] || '';

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7);

        const active = bookings.filter(b => (b.status || '').toLowerCase() !== 'cancelled');
        const upcoming = active.filter(b => new Date(b.appointmentDateTime) >= startOfToday);
        const cancelled = bookings.filter(b => (b.status || '').toLowerCase() === 'cancelled');
        const rescheduled = bookings.filter(b => (b.status || '').toLowerCase() === 'rescheduled');

        // Overview
        document.getElementById('st-total').textContent = bookings.length;
        document.getElementById('st-upcoming').textContent = upcoming.length;
        document.getElementById('st-rescheduled').textContent = rescheduled.length;
        document.getElementById('st-cancelled').textContent = cancelled.length;

        // Revenue
        const totalRev = active.reduce((s, b) => s + parseMoney(b.totalPrice), 0);
        const totalDep = active.reduce((s, b) => s + parseMoney(b.depositPaid), 0);
        const totalBal = active.reduce((s, b) => s + Math.max(0, parseMoney(b.totalPrice) - parseMoney(b.depositPaid)), 0);
        const avgVal  = active.length ? totalRev / active.length : 0;
        const avgDep  = active.length ? totalDep / active.length : 0;
        document.getElementById('st-rev-total').textContent    = $fmt(totalRev);
        document.getElementById('st-rev-deposits').textContent = $fmt(totalDep);
        document.getElementById('st-rev-balance').textContent  = $fmt(totalBal);
        document.getElementById('st-avg-value').textContent    = $fmt(avgVal);
        document.getElementById('st-avg-deposit').textContent  = $fmt(avgDep);

        // Clients
        const emailMap = {};
        bookings.forEach(b => {
            if (b.email) emailMap[b.email.toLowerCase()] = (emailMap[b.email.toLowerCase()] || 0) + 1;
        });
        const uniqueClients = Object.keys(emailMap).length;
        const returningClients = Object.values(emailMap).filter(c => c > 1).length;
        // "New" = email appears only once in the full unfiltered dataset within this period
        const allEmailMap = {};
        allData.filter(b => !isExcludedFromStats(b)).forEach(b => {
            if (b.email) allEmailMap[b.email.toLowerCase()] = (allEmailMap[b.email.toLowerCase()] || 0) + 1;
        });
        const newThisPeriodEmails = new Set(
            bookings.filter(b => b.email && allEmailMap[b.email.toLowerCase()] === 1)
                .map(b => b.email.toLowerCase())
        );
        document.getElementById('st-unique-clients').textContent = uniqueClients;
        document.getElementById('st-returning').textContent = returningClients;
        document.getElementById('st-new-month').textContent = newThisPeriodEmails.size;

        // Top Customers
        const clientStats = {};
        bookings.forEach(b => {
            const key = b.email?.toLowerCase();
            if (!key) return;
            if (!clientStats[key]) clientStats[key] = { name: b.name || b.email, count: 0, spent: 0 };
            clientStats[key].count++;
            if ((b.status || '').toLowerCase() !== 'cancelled') clientStats[key].spent += parseMoney(b.totalPrice);
        });
        const topClients = Object.values(clientStats).sort((a, b) => b.count - a.count || b.spent - a.spent).slice(0, 8);
        const topClientsEl = document.getElementById('st-top-customers');
        topClientsEl.innerHTML = topClients.length === 0
            ? '<div class="stats-empty">No data yet</div>'
            : topClients.map((c, i) => `
                <div class="stats-list-row">
                    <span class="stats-rank">#${i + 1}</span>
                    <span class="stats-list-name">${c.name}</span>
                    <span class="stats-list-meta">${c.count} booking${c.count !== 1 ? 's' : ''}</span>
                    <span class="stats-list-value">${$fmt(c.spent)}</span>
                </div>`).join('');

        // Popular Services
        const serviceMap = {};
        active.forEach(b => {
            const svc = b.selectedStyle || 'Unknown';
            if (!serviceMap[svc]) serviceMap[svc] = { count: 0, revenue: 0 };
            serviceMap[svc].count++;
            serviceMap[svc].revenue += parseMoney(b.totalPrice);
        });
        const topServices = Object.entries(serviceMap).sort((a, b) => b[1].count - a[1].count);
        const maxSvcCount = topServices.length ? topServices[0][1].count : 1;
        const svcEl = document.getElementById('st-services');
        svcEl.innerHTML = topServices.length === 0
            ? '<div class="stats-empty">No data yet</div>'
            : topServices.map(([svc, d]) => `
                <div class="stats-bar-row">
                    <div class="stats-bar-label">${svc}</div>
                    <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${Math.round((d.count/maxSvcCount)*100)}%;background:#6c5ce7;"></div></div>
                    <div class="stats-bar-meta">${d.count} <span style="color:#aaa;font-size:0.8rem;">${$fmt(d.revenue)}</span></div>
                </div>`).join('');

        // Bookings by Day of Week
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const dayCounts = [0,0,0,0,0,0,0];
        active.forEach(b => { const d = new Date(b.appointmentDateTime); if (!isNaN(d)) dayCounts[d.getDay()]++; });
        const maxDay = Math.max(...dayCounts, 1);
        const dayColors = ['#ff7675','#00b894','#0984e3','#fdcb6e','#6c5ce7','#fd79a8','#a29bfe'];
        document.getElementById('st-days').innerHTML = dayNames.map((day, i) => `
            <div class="stats-bar-row">
                <div class="stats-bar-label">${day}</div>
                <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${Math.round((dayCounts[i]/maxDay)*100)}%;background:${dayColors[i]};"></div></div>
                <div class="stats-bar-meta">${dayCounts[i]}</div>
            </div>`).join('');

        // Busiest Time Slots
        const hourMap = {};
        active.forEach(b => { const d = new Date(b.appointmentDateTime); if (!isNaN(d)) { const h = d.getHours(); hourMap[h] = (hourMap[h]||0)+1; } });
        const sortedHours = Object.entries(hourMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
        const maxHour = sortedHours.length ? sortedHours[0][1] : 1;
        const fmtHour = h => { h=parseInt(h); return `${h%12||12}:00 ${h>=12?'PM':'AM'}`; };
        const timesEl = document.getElementById('st-times');
        timesEl.innerHTML = sortedHours.length === 0
            ? '<div class="stats-empty">No data yet</div>'
            : sortedHours.map(([h, cnt]) => `
                <div class="stats-bar-row">
                    <div class="stats-bar-label">${fmtHour(h)}</div>
                    <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${Math.round((cnt/maxHour)*100)}%;background:#00b894;"></div></div>
                    <div class="stats-bar-meta">${cnt}</div>
                </div>`).join('');

        // Status Breakdown
        const statusCounts = {};
        bookings.forEach(b => { const s=(b.status||'pending').toLowerCase(); statusCounts[s]=(statusCounts[s]||0)+1; });
        const statusColors = { confirmed:'#00b894', rescheduled:'#6c5ce7', pending:'#fdcb6e', pending_payment:'#fdcb6e', cancelled:'#ff7675', completed:'#74b9ff' };
        const total = bookings.length || 1;
        document.getElementById('st-status-breakdown').innerHTML = Object.entries(statusCounts).sort((a,b)=>b[1]-a[1]).map(([s,cnt])=>`
            <div class="stats-bar-row">
                <div class="stats-bar-label" style="text-transform:capitalize;">${s.replace('_',' ')}</div>
                <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${Math.round((cnt/total)*100)}%;background:${statusColors[s]||'#b2bec3'};"></div></div>
                <div class="stats-bar-meta">${cnt} <span style="color:#aaa;font-size:0.8rem;">(${Math.round((cnt/total)*100)}%)</span></div>
            </div>`).join('');

        // This Week's Appointments (always current week regardless of range filter)
        const thisWeek = allData.filter(b => {
            if (isExcludedFromStats(b)) return false;
            const d = new Date(b.appointmentDateTime);
            return d >= startOfWeek && d < endOfWeek && (b.status||'').toLowerCase() !== 'cancelled';
        }).sort((a,b) => new Date(a.appointmentDateTime)-new Date(b.appointmentDateTime));
        const weekEl = document.getElementById('st-this-week');
        weekEl.innerHTML = thisWeek.length === 0
            ? '<div class="stats-empty">No appointments this week</div>'
            : thisWeek.map(b => {
                const dt = new Date(b.appointmentDateTime);
                return `<div class="stats-list-row">
                    <span class="stats-list-name">${b.name||'—'}</span>
                    <span class="stats-list-meta">${dt.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span>
                    <span class="stats-list-value" style="font-size:0.85rem;">${dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span>
                </div>`;
            }).join('');
    }
    // ── End Stats ─────────────────────────────────────────────────

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
                // Convert bookings to calendar events
                const events = allBookings.map(booking => {
                    const appointmentDateTime = booking.appointmentDateTime || booking['appointment-datetime'];
                    if (!appointmentDateTime) return null;
                    
                    const startDate = new Date(appointmentDateTime);
                    const duration = parseInt(booking.duration) || 120; // Default 2 hours
                    const endDate = new Date(startDate.getTime() + (duration * 60 * 1000));
                    
                    const name = booking.customerName || booking.name || 'Unknown';
                    const style = booking.selectedStyle || booking.selected_style || 'Service';
                    
                    return {
                        id: booking.id,
                        title: `${name} - ${style}`,
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
                }).filter(event => event !== null);

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

    // Load bookings from API
    async function loadBookings() {
        try {
            const endpoint = (typeof ENDPOINTS !== 'undefined' && ENDPOINTS.GET_BOOKINGS) 
                ? ENDPOINTS.GET_BOOKINGS 
                : '/api/get-bookings';
            
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
            }
            
            const bookings = await response.json();
            
            // Handle error response
            if (bookings.error) {
                throw new Error(bookings.error);
            }
            
            // Normalize booking data (handle both camelCase and snake_case)
            allBookings = bookings.map(booking => ({
                id: booking.id,
                bookingReference: booking.bookingReference || booking.booking_reference,
                name: booking.customerName || booking.name,
                phone: booking.phoneNumber || booking.phone,
                email: booking.email,
                appointmentDateTime: booking.appointmentDateTime || booking['appointment-datetime'],
                selectedStyle: booking.selectedStyle || booking.selected_style,
                hairLength: booking.hairLength || booking.hair_length,
                hairOption: booking.hairOption || booking.hair_option,
                preWashOption: booking.preWashOption || booking.pre_wash_option,
                detanglingOption: booking.detanglingOption || booking.detangling_option,
                notes: booking.notes,
                totalPrice: booking.totalPrice || booking.total_price || 0,
                duration: booking.duration,
                status: booking.status || 'pending',
                depositPaid: booking.depositPaid || booking.deposit_paid || 0,
                stripeSessionId: booking.stripeSessionId || booking.stripe_session_id,
                currentHairImageURL: booking.currentHairImageURL || booking.current_hair_image_url,
                referenceImageURL: booking.referenceImageURL || booking.reference_image_url,
                boxBraidsVariation: booking.boxBraidsVariation || booking.box_braids_variation,
                cornrowsVariation: booking.cornrowsVariation || booking.cornrows_variation,
                twoStrandTwistsVariation: booking.twoStrandTwistsVariation || booking.two_strand_twists_variation,
                createdAt: booking.createdAt || booking.created_at,
                updatedAt: booking.updatedAt || booking.updated_at,
                cancelledAt: booking.cancelledAt || booking.cancelled_at
            }));
            
            console.log(`Loaded ${allBookings.length} bookings`);

            updateRevenueSummary(allBookings);
            
            // Update calendar events
            if (calendar) {
                calendar.refetchEvents();
            }
            
            // Update bookings list
            renderBookings(allBookings);

            // Pre-compute stats so they're ready when the tab is opened
            renderStats(allBookings);
        } catch (error) {
            console.error('Error loading bookings:', error);
            const bookingsList = document.getElementById('bookings-list');
            if (bookingsList) {
                bookingsList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red; padding: 20px;">Error loading bookings: ${error.message}</td></tr>`;
            }
        }
    }

    function renderBookings(bookings) {
        const bookingsList = document.getElementById('bookings-list');
        if (!bookingsList) return;

        bookingsList.innerHTML = '';

        // Sort bookings by time booked (createdAt) in descending order
        const sortedBookings = [...bookings].sort((a, b) => {
            const dateA = new Date(a.createdAt || a.updatedAt || a.appointmentDateTime || 0);
            const dateB = new Date(b.createdAt || b.updatedAt || b.appointmentDateTime || 0);
            return dateB - dateA;
        });

        if (sortedBookings.length === 0) {
            bookingsList.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">No bookings found</td></tr>';
            return;
        }

        sortedBookings.forEach(booking => {
            const row = document.createElement('tr');
            const bookedDateTime = new Date(booking.createdAt || booking.updatedAt || booking.appointmentDateTime);
            
            row.innerHTML = `
                <td>${bookedDateTime.toLocaleString()}</td>
                <td>${booking.name || 'N/A'}</td>
                <td>${booking.selectedStyle || 'N/A'}</td>
                <td><span class="booking-status status-${booking.status || 'pending'}">${(booking.status || 'Pending').charAt(0).toUpperCase() + (booking.status || 'Pending').slice(1)}</span></td>
            `;
            
            // Add click handler to show booking details
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => showBookingDetails(booking));
            
            bookingsList.appendChild(row);
        });
    }

    function filterBookings() {
        const statusFilter = document.getElementById('status-filter').value;
        const searchText = document.getElementById('search-bookings').value.toLowerCase();

        const filteredBookings = allBookings.filter(booking => {
            const matchesStatus = statusFilter === 'all' || (booking.status || 'pending').toLowerCase() === statusFilter.toLowerCase();
            const matchesSearch = 
                (booking.name || '').toLowerCase().includes(searchText) ||
                (booking.selectedStyle || '').toLowerCase().includes(searchText) ||
                (booking.email || '').toLowerCase().includes(searchText) ||
                new Date(booking.appointmentDateTime).toLocaleString().toLowerCase().includes(searchText) ||
                new Date(booking.createdAt || booking.updatedAt || booking.appointmentDateTime).toLocaleString().toLowerCase().includes(searchText);
            
            return matchesStatus && matchesSearch;
        });

        renderBookings(filteredBookings);
    }

    // Get color based on booking status
    function getStatusColor(status) {
        const colors = {
            'confirmed': '#00b894',
            'pending': '#fdcb6e',
            'pending_payment': '#fdcb6e',
            'rescheduled': '#a29bfe',
            'cancelled': '#ff7675',
            'completed': '#74b9ff',
            'default': '#b2bec3'
        };
        return colors[(status || 'pending').toLowerCase()] || colors.default;
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
        if (!modal || !detailsContainer) return;

        const dateTime = new Date(booking.appointmentDateTime);
        const isCancelled = (booking.status || '').toLowerCase() === 'cancelled';
        const cancelBtnHtml = !isCancelled && booking.email
            ? `<button type="button" class="admin-cancel-booking-btn" data-booking-id="${booking.id}" data-booking-email="${(booking.email || '').replace(/"/g, '&quot;')}">Mark as Cancelled</button>`
            : '';

        // Format the details HTML
        const detailsHTML = `
            <div class="booking-details-grid">
                <div class="detail-group">
                    <h3>Client Information</h3>
                    <p><strong>Name:</strong> ${booking.name || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${booking.phone || 'N/A'}</p>
                    <p><strong>Email:</strong> ${booking.email || 'N/A'}</p>
                    ${booking.bookingReference ? `<p><strong>Booking ID:</strong> ${booking.bookingReference}</p>` : ''}
                </div>
                
                <div class="detail-group">
                    <h3>Appointment Details</h3>
                    <p><strong>Date & Time:</strong> ${dateTime.toLocaleString()}</p>
                    <p><strong>Service:</strong> ${booking.selectedStyle || 'N/A'}</p>
                    <p><strong>Duration:</strong> ${booking.duration || 'N/A'} minutes</p>
                    <p><strong>Total Price:</strong> $${(booking.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p><strong>Deposit Paid:</strong> $${(booking.depositPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p><strong>Status:</strong> <span class="status-${booking.status || 'pending'}">${(booking.status || 'Pending').charAt(0).toUpperCase() + (booking.status || 'Pending').slice(1)}</span></p>
                    ${cancelBtnHtml}
                </div>

                <div class="detail-group">
                    <h3>Service Options</h3>
                    ${booking.hairLength ? `<p><strong>Hair Length:</strong> ${booking.hairLength}</p>` : ''}
                    ${booking.hairOption ? `<p><strong>Hair Option:</strong> ${booking.hairOption}</p>` : ''}
                    ${booking.preWashOption ? `<p><strong>Pre-Wash:</strong> ${booking.preWashOption}</p>` : ''}
                    ${booking.detanglingOption ? `<p><strong>Detangling:</strong> ${booking.detanglingOption}</p>` : ''}
                    ${booking.boxBraidsVariation ? `<p><strong>Box Braids Variation:</strong> ${booking.boxBraidsVariation}</p>` : ''}
                    ${booking.cornrowsVariation ? `<p><strong>Cornrows Variation:</strong> ${booking.cornrowsVariation}</p>` : ''}
                    ${booking.twoStrandTwistsVariation ? `<p><strong>Two Strand Twists Variation:</strong> ${booking.twoStrandTwistsVariation}</p>` : ''}
                    ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
                </div>
                
                ${booking.currentHairImageURL || booking.referenceImageURL ? `
                <div class="detail-group">
                    <h3>Images</h3>
                    ${booking.currentHairImageURL ? `<p><strong>Current Hair:</strong><br><img src="${booking.currentHairImageURL}" alt="Current Hair" style="max-width: 200px; margin-top: 10px;"></p>` : ''}
                    ${booking.referenceImageURL ? `<p><strong>Reference Image:</strong><br><img src="${booking.referenceImageURL}" alt="Reference" style="max-width: 200px; margin-top: 10px;"></p>` : ''}
                </div>
                ` : ''}
            </div>
        `;
        
        detailsContainer.innerHTML = detailsHTML;
        modal.style.display = 'block';

        const cancelBtn = detailsContainer.querySelector('.admin-cancel-booking-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', async () => {
                if (!confirm('Are you sure you want to cancel this appointment? This will free the time slot and remove it from Google Calendar.')) return;
                
                const id = cancelBtn.getAttribute('data-booking-id');
                const email = cancelBtn.getAttribute('data-booking-email');
                
                cancelBtn.disabled = true;
                cancelBtn.textContent = 'Cancelling...';
                
                try {
                    const url = (typeof ENDPOINTS !== 'undefined' && ENDPOINTS.CANCEL_BOOKING) 
                        ? ENDPOINTS.CANCEL_BOOKING 
                        : '/api/cancel-booking';
                    
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookingId: id, email: email })
                    });
                    
                    const data = await res.json().catch(() => ({}));
                    
                    if (res.ok && (data.cancelled || data.message)) {
                        cancelBtn.textContent = 'Cancelled';
                        cancelBtn.disabled = true;
                        cancelBtn.style.background = '#ff7675';
                        
                        // Reload bookings to reflect the change
                        await loadBookings();
                        
                        // Close modal after a short delay
                        setTimeout(() => {
                            modal.style.display = 'none';
                        }, 1500);
                    } else {
                        alert(data.error || 'Failed to cancel booking. Please try again.');
                        cancelBtn.disabled = false;
                        cancelBtn.textContent = 'Mark as Cancelled';
                    }
                } catch (e) {
                    console.error('Error cancelling booking:', e);
                    alert('Request failed. Please try again.');
                    cancelBtn.disabled = false;
                    cancelBtn.textContent = 'Mark as Cancelled';
                }
            });
        }
        
        // Close modal when clicking the close button
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => modal.style.display = 'none';
        }
        
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
        if (!calendar) return;
        const currentView = calendar.view.type;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        switch (currentView) {
            case 'dayGridMonth':
                const monthBtn = document.getElementById('month-view');
                if (monthBtn) monthBtn.classList.add('active');
                break;
            case 'timeGridWeek':
                const weekBtn = document.getElementById('week-view');
                if (weekBtn) weekBtn.classList.add('active');
                break;
            case 'timeGridDay':
                const dayBtn = document.getElementById('day-view');
                if (dayBtn) dayBtn.classList.add('active');
                break;
        }
    }

    // Update the range display in the header
    function updateRange() {
        if (!calendar) return;
        const view = calendar.view;
        const range = document.getElementById('current-range');
        if (!range) return;
        
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

    initializeTabs();

    // Initialize calendar
    initializeCalendar();

    // Add event listeners for navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const todayBtn = document.getElementById('today-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (calendar) {
                calendar.prev();
                updateRange();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (calendar) {
                calendar.next();
                updateRange();
            }
        });
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            if (calendar) {
                calendar.today();
                updateRange();
            }
        });
    }

    // Add event listeners for view buttons
    const monthViewBtn = document.getElementById('month-view');
    const weekViewBtn = document.getElementById('week-view');
    const dayViewBtn = document.getElementById('day-view');
    
    if (monthViewBtn) {
        monthViewBtn.addEventListener('click', () => {
            if (calendar) {
                calendar.changeView('dayGridMonth');
                updateViewButtons();
                updateRange();
            }
        });
    }

    if (weekViewBtn) {
        weekViewBtn.addEventListener('click', () => {
            if (calendar) {
                calendar.changeView('timeGridWeek');
                updateViewButtons();
                updateRange();
            }
        });
    }

    if (dayViewBtn) {
        dayViewBtn.addEventListener('click', () => {
            if (calendar) {
                calendar.changeView('timeGridDay');
                updateViewButtons();
                updateRange();
            }
        });
    }

    // Modal close button
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('booking-modal');
            if (modal) modal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('booking-modal');
        if (event.target === modal && modal) {
            modal.style.display = 'none';
        }
    });

    // Add event listeners for filters
    const statusFilter = document.getElementById('status-filter');
    const searchBookings = document.getElementById('search-bookings');

    if (statusFilter) statusFilter.addEventListener('change', filterBookings);
    if (searchBookings) searchBookings.addEventListener('input', filterBookings);

    const statsRangeSelect = document.getElementById('stats-range');
    if (statsRangeSelect) {
        statsRangeSelect.value = currentStatsRange;
        statsRangeSelect.addEventListener('change', (e) => {
            currentStatsRange = e.target.value;
            renderStats(allBookings);
        });
    }

    // Refresh data periodically (every 5 minutes)
    setInterval(loadBookings, 5 * 60 * 1000);
    
    // Initial range update
    setTimeout(() => {
        updateRange();
        updateViewButtons();
    }, 100);
});

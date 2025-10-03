document.addEventListener('DOMContentLoaded', function() {
    // Get booking data from sessionStorage (fallback to URL parameters for backwards compatibility)
    let bookingData = {};
    
    // Try sessionStorage first
    const sessionData = sessionStorage.getItem('bookingData');
    if (sessionData) {
        bookingData = JSON.parse(sessionData);
        // Clear the data after use
        sessionStorage.removeItem('bookingData');
    } else {
        // Fallback to URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        bookingData = JSON.parse(decodeURIComponent(urlParams.get('booking') || '{}'));
    }
    
    // Populate booking details
    populateBookingDetails(bookingData);
    
    // Set up PDF download
    setupPDFDownload();
    
    // Add booking ID
    if (bookingData.bookingId) {
        document.getElementById('booking-id').textContent = `Booking #${bookingData.bookingId}`;
    }
    
    // Save booking to admin system
    if (bookingData && Object.keys(bookingData).length > 0) {
        saveBookingToAdmin(bookingData);
    }
    
    // PDF download is now handled by onclick attribute in HTML
});

function saveBookingToAdmin(bookingData) {
    // Prepare the booking data for admin storage
    const adminBookingData = {
        name: bookingData.name,
        phone: bookingData.phone,
        style: bookingData.style,
        hairLength: bookingData.hairLength || '',

        date: bookingData.date,
        time: bookingData.time, // Send as 'time' to match what saveBooking expects
        appointmentTime: bookingData.time, // Also include as appointmentTime for backwards compatibility
        duration: bookingData.duration,
        preWash: bookingData.preWash || 'none',
        detangling: bookingData.detangling || 'none',
        notes: bookingData.notes || '',
        totalPrice: bookingData.totalPrice,
        depositAmount: bookingData.depositAmount,
        depositPaid: bookingData.depositPaid || false,
        paymentMethod: bookingData.paymentMethod || 'cash',
        styleImage: bookingData.styleImage || null,
        hairImage: bookingData.hairImage || null,
        bookingId: bookingData.bookingId,
        status: bookingData.status || 'confirmed', // Use confirmed status since payment was successful
        createdAt: new Date().toISOString(),
        styleSpecificOptions: bookingData.styleSpecificOptions || {} // Include style-specific options for Google Calendar
    };

    // Try to save to Firebase Functions first (if available)
                fetch('https://us-central1-connect-2a17c.cloudfunctions.net/saveBooking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminBookingData)
    })
    .then(response => {
        if (response.ok) {
            console.log('Booking saved to admin system successfully');
        } else {
            console.log('Firebase Functions not available, trying local storage');
            saveToLocalStorage(adminBookingData);
        }
        
        // Sync to Google Calendar for all bookings
        syncToGoogleCalendar(adminBookingData);
    })
    .catch(error => {
        console.log('Error saving to Firebase Functions, using local storage:', error);
        saveToLocalStorage(adminBookingData);
        
        // Sync to Google Calendar for all bookings
        syncToGoogleCalendar(adminBookingData);
    });
}

function saveToLocalStorage(bookingData) {
    try {
        // Get existing bookings from localStorage
        const existingBookings = JSON.parse(localStorage.getItem('adminBookings') || '[]');
        
        // Add new booking
        existingBookings.push(bookingData);
        
        // Save back to localStorage
        localStorage.setItem('adminBookings', JSON.stringify(existingBookings));
        
        console.log('Booking saved to local storage successfully');
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

// Function to sync booking to Google Calendar
function syncToGoogleCalendar(bookingData) {
    fetch('https://us-central1-connect-2a17c.cloudfunctions.net/syncToGoogleCalendar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            console.log('Booking synced to Google Calendar successfully:', result.eventId);
        } else {
            console.log('Google Calendar sync failed:', result.error);
        }
    })
    .catch(error => {
        console.log('Error syncing to Google Calendar:', error);
        // Don't block the booking process if calendar sync fails
    });
}

function populateBookingDetails(booking) {
    const detailsContainer = document.getElementById('booking-details');
    
    if (!booking || Object.keys(booking).length === 0) {
        detailsContainer.innerHTML = `
            <h2>Booking Information</h2>
            <p>No booking information available.</p>
        `;
        return;
    }
    
    // Debug: log the booking data to see what date we're getting
    console.log('Booking data on success page:', booking);
    console.log('Date field:', booking.date);
    console.log('Style specific options:', booking.styleSpecificOptions);
    
    // Format date and time - parse as local date to avoid timezone issues
    const appointmentDate = new Date(booking.date + 'T00:00:00');
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const detailsHTML = `
        <h2>Booking Confirmation</h2>
        <div class="details-grid">
            <div class="detail-section">
                <h3><i class="fas fa-user"></i> Client Information</h3>
                <div class="detail-item">
                    <span class="detail-label">Name:</span>
                    <span class="detail-value">${booking.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${booking.phone}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-calendar-alt"></i> Appointment Details</h3>
                <div class="detail-item">
                    <span class="detail-label">Date:</span>
                    <span class="detail-value">${formattedDate}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Time:</span>
                    <span class="detail-value">${booking.displayTime || booking.time}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">${booking.duration} hours</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-cut"></i> Service Details</h3>
                <div class="detail-item">
                    <span class="detail-label">Style:</span>
                    <span class="detail-value">${booking.style}</span>
                </div>
                ${booking.hairLength ? `
                <div class="detail-item">
                    <span class="detail-label">Hair Length:</span>
                    <span class="detail-value">${booking.hairLength}</span>
                </div>
                ` : ''}
                
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-list"></i> Additional Services</h3>
                <div class="detail-item">
                    <span class="detail-label">Wash Service:</span>
                    <span class="detail-value">${booking.styleSpecificOptions && booking.styleSpecificOptions['wash-service'] && booking.styleSpecificOptions['wash-service'] === 'wash' ? 'Wash & Condition (+$30)' : 'Not selected'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Detangling Service:</span>
                    <span class="detail-value">${booking.styleSpecificOptions && booking.styleSpecificOptions['detangle-service'] && booking.styleSpecificOptions['detangle-service'] === 'detangle' ? 'Detangle Hair (+$20)' : 'Not selected'}</span>
                </div>
            </div>
            
            <div class="detail-section pricing-section">
                <h3><i class="fas fa-dollar-sign"></i> Pricing</h3>
                <div class="detail-item">
                    <span class="detail-label">Total Price:</span>
                    <span class="detail-value">$${booking.totalPrice}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Deposit Required:</span>
                    <span class="detail-value">$${booking.depositAmount}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Remaining Balance:</span>
                    <span class="detail-value">$${booking.totalPrice - booking.depositAmount}</span>
                </div>
            </div>
            
            ${booking.notes ? `
            <div class="detail-section">
                <h3><i class="fas fa-sticky-note"></i> Special Requests</h3>
                <div class="detail-item">
                    <span class="detail-label">Notes:</span>
                    <span class="detail-value">${booking.notes}</span>
                </div>
            </div>
            ` : ''}
            
            ${(booking.styleImage && booking.styleImage !== 'null' && booking.styleImage !== '') || (booking.hairImage && booking.hairImage !== 'null' && booking.hairImage !== '') ? `
            <div class="detail-section">
                <h3><i class="fas fa-images"></i> Reference Images</h3>
                ${booking.styleImage && booking.styleImage !== 'null' && booking.styleImage !== '' ? `
                <div class="detail-item">
                    <span class="detail-label">Style Reference:</span>
                    <span class="detail-value">Provided</span>
                </div>
                ` : ''}
                ${booking.hairImage && booking.hairImage !== 'null' && booking.hairImage !== '' ? `
                <div class="detail-item">
                    <span class="detail-label">Hair Reference:</span>
                    <span class="detail-value">Provided</span>
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>
    `;
    
    detailsContainer.innerHTML = detailsHTML;
}

function setupPDFDownload() {
    // The download functionality is now handled by the onclick attribute in HTML
    // No need to add event listener here since we're using onclick
}

function downloadPDF() {
    console.log('downloadPDF function called');
    
    // Check if jsPDF and html2canvas are available
    if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
        console.error('jsPDF or html2canvas library not loaded, trying fallback method');
        // Fallback: Create a simple text-based PDF
        createSimplePDF();
        return;
    }
    
    // Show loading state
    setDownloadLoading(true);
    console.log('Loading state set');
    
    // Create a comprehensive PDF content
    const pdfContent = createPDFContent();
    console.log('PDF content created:', pdfContent);
    
    // Create a temporary container for PDF generation
    const tempContainer = document.createElement('div');
    tempContainer.appendChild(pdfContent);
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '800px';
    tempContainer.style.background = 'white';
    tempContainer.style.padding = '40px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.color = 'black';
    
    document.body.appendChild(tempContainer);
    console.log('Temporary container added to DOM');
    
    // Wait a moment for the content to render
    setTimeout(() => {
        console.log('Starting PDF generation with jsPDF...');
        
        // Use html2canvas to capture the content
        html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: true,
            width: 800,
            height: tempContainer.scrollHeight
        }).then(canvas => {
            console.log('Canvas created, generating PDF...');
            
            // Create PDF with jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            let position = 0; // Start position
            
            // Add image to PDF
            pdf.addImage(canvas, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            // Add new pages if content is longer than one page
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(canvas, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            // Save the PDF
            pdf.save('maya-hair-booking-confirmation.pdf');
            console.log('PDF generated successfully');
            
            // Clean up
            document.body.removeChild(tempContainer);
            setDownloadLoading(false);
        }).catch(error => {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF. Please try again.');
            document.body.removeChild(tempContainer);
            setDownloadLoading(false);
        });
    }, 100);
}

// Fallback function to create a simple text-based PDF
function createSimplePDF() {
    console.log('Creating simple PDF fallback');
    
    // Show loading state
    setDownloadLoading(true);
    
    try {
        const bookingData = JSON.parse(decodeURIComponent(new URLSearchParams(window.location.search).get('booking') || '{}'));
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const appointmentDate = new Date(bookingData.date + 'T00:00:00');
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Create simple text content
        const pdfContent = `
MAYA AFRICAN HAIR BRAIDING
BOOKING CONFIRMATION
Generated on ${currentDate}

CLIENT INFORMATION
Name: ${bookingData.name}
Phone: ${bookingData.phone}

APPOINTMENT DETAILS
Date: ${formattedDate}
Time: ${bookingData.time}
Duration: ${bookingData.duration} hours

SERVICE DETAILS
Style: ${bookingData.style}
${bookingData.hairLength ? `Hair Length: ${bookingData.hairLength}` : ''}


ADDITIONAL SERVICES
Wash Service: ${bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['wash-service'] && bookingData.styleSpecificOptions['wash-service'] === 'wash' ? 'Wash & Condition (+$30)' : 'Not selected'}
Detangling Service: ${bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['detangle-service'] && bookingData.styleSpecificOptions['detangle-service'] === 'detangle' ? 'Detangle Hair (+$20)' : 'Not selected'}

PRICING INFORMATION
Total Price: $${bookingData.totalPrice}
Deposit Required: $${bookingData.depositAmount}
Remaining Balance: $${bookingData.totalPrice - bookingData.depositAmount}

${bookingData.notes ? `SPECIAL REQUESTS\n${bookingData.notes}` : ''}

SALON INFORMATION
Address: 116 Ocean Avenue, New London, CT 06320
Business Hours: Monday - Saturday: 7:00 AM - 6:00 PM, Sunday: Closed
Payment: Cash and Card accepted

IMPORTANT INFORMATION
- Please arrive 10 minutes before your scheduled appointment time
- Bring any reference photos you'd like to show
- Payment (deposit and remaining balance) will be collected at the salon
- If you need to reschedule, please contact us at least 24 hours in advance
- We accept cash and card payments

Thank you for choosing Maya African Hair Braiding!
We look forward to seeing you!
        `;
        
        // Create a blob and download
        const blob = new Blob([pdfContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'maya-hair-booking-confirmation.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('Simple PDF fallback created successfully');
        setDownloadLoading(false);
        
    } catch (error) {
        console.error('Fallback PDF creation failed:', error);
        alert('Failed to generate PDF. Please try again.');
        setDownloadLoading(false);
    }
}

function createPDFContent() {
    // Get booking data from sessionStorage (same as main page)
    let bookingData = {};
    const sessionData = sessionStorage.getItem('bookingData');
    if (sessionData) {
        bookingData = JSON.parse(sessionData);
    } else {
        // Fallback to URL parameters
        bookingData = JSON.parse(decodeURIComponent(new URLSearchParams(window.location.search).get('booking') || '{}'));
    }
    console.log('Booking data for PDF:', bookingData);
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const appointmentDate = new Date(bookingData.date + 'T00:00:00');
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const pdfHTML = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: 0 auto; background: white;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid black; padding-bottom: 20px;">
                <h1 style="color: black; font-size: 28px; margin-bottom: 10px;">Maya African Hair Braiding</h1>
                <h2 style="color: black; font-size: 24px; margin-bottom: 5px;">Booking Confirmation</h2>
                <p style="color: #666; font-size: 14px;">Generated on ${currentDate}</p>
                ${bookingData.bookingId ? `<p style="color: #333; font-size: 16px; font-weight: bold;">Booking #${bookingData.bookingId}</p>` : ''}
            </div>
            
            <!-- Client Information -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 15px;">
                    <span style="color: black;">●</span> Client Information
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 40%;">Name:</td>
                        <td style="padding: 8px 0;">${bookingData.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                        <td style="padding: 8px 0;">${bookingData.phone}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Appointment Details -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 15px;">
                    <span style="color: black;">●</span> Appointment Details
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 40%;">Date:</td>
                        <td style="padding: 8px 0;">${formattedDate}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                        <td style="padding: 8px 0;">${bookingData.time}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Duration:</td>
                        <td style="padding: 8px 0;">${bookingData.duration} hours</td>
                    </tr>
                </table>
            </div>
            
            <!-- Service Details -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 15px;">
                    <span style="color: black;">●</span> Service Details
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 40%;">Style:</td>
                        <td style="padding: 8px 0;">${bookingData.style}</td>
                    </tr>
                    ${bookingData.hairLength ? `
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Hair Length:</td>
                        <td style="padding: 8px 0;">${bookingData.hairLength}</td>
                    </tr>
                    ` : ''}

                </table>
            </div>
            
            <!-- Additional Services -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 15px;">
                    <span style="color: black;">●</span> Additional Services
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 40%;">Wash Service:</td>
                        <td style="padding: 8px 0;">${bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['wash-service'] && bookingData.styleSpecificOptions['wash-service'] === 'wash' ? 'Wash & Condition (+$30)' : 'Not selected'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Detangling Service:</td>
                        <td style="padding: 8px 0;">${bookingData.styleSpecificOptions && bookingData.styleSpecificOptions['detangle-service'] && bookingData.styleSpecificOptions['detangle-service'] === 'detangle' ? 'Detangle Hair (+$20)' : 'Not selected'}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Pricing -->
            <div style="margin-bottom: 25px; background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
                <h3 style="color: #333; font-size: 18px; margin-bottom: 15px;">
                    <span style="color: #28a745;">●</span> Pricing Information
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 40%;">Total Price:</td>
                        <td style="padding: 8px 0; font-weight: bold; color: #28a745;">$${bookingData.totalPrice}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Deposit Required:</td>
                        <td style="padding: 8px 0; font-weight: bold; color: #28a745;">$${bookingData.depositAmount}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Remaining Balance:</td>
                        <td style="padding: 8px 0; font-weight: bold; color: #28a745;">$${bookingData.totalPrice - bookingData.depositAmount}</td>
                    </tr>
                </table>
            </div>
            
            ${bookingData.notes ? `
            <!-- Special Requests -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 15px;">
                    <span style="color: #667eea;">●</span> Special Requests
                </h3>
                <p style="padding: 10px; background: #f8f9fa; border-radius: 5px; margin: 0;">${bookingData.notes}</p>
            </div>
            ` : ''}
            
            <!-- Salon Information -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #333; font-size: 18px; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 15px;">
                    <span style="color: black;">●</span> Salon Information
                </h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 40%;">Address:</td>
                        <td style="padding: 8px 0;">116 Ocean Avenue<br>New London, CT 06320</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Business Hours:</td>
                        <td style="padding: 8px 0;">Monday - Saturday: 7:00 AM - 6:00 PM<br>Sunday: Closed</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Payment:</td>
                        <td style="padding: 8px 0;">Cash and Card accepted</td>
                    </tr>
                </table>
            </div>
            
            <!-- Important Notes -->
            <div style="margin-bottom: 25px; background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="color: #333; font-size: 18px; margin-bottom: 15px;">
                    <span style="color: #ffc107;">●</span> Important Information
                </h3>
                <ul style="margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 5px;">Please arrive 10 minutes before your scheduled appointment time</li>
                    <li style="margin-bottom: 5px;">Bring any reference photos you'd like to show</li>
                    <li style="margin-bottom: 5px;">Payment (deposit and remaining balance) will be collected at the salon</li>
                    <li style="margin-bottom: 5px;">If you need to reschedule, please contact us at least 24 hours in advance</li>
                    <li style="margin-bottom: 5px;">We accept cash and card payments</li>
                </ul>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                <p style="color: #666; font-size: 12px; margin-bottom: 5px;">Thank you for choosing Maya African Hair Braiding!</p>
                <p style="color: black; font-size: 14px; font-weight: bold;">We look forward to seeing you!</p>
            </div>
        </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = pdfHTML;
    return div.firstElementChild;
}

// Add loading state to download button
function setDownloadLoading(loading) {
    const downloadBtn = document.getElementById('download-pdf');
    if (!downloadBtn) {
        console.error('Download button not found');
        return;
    }
    
    const noticeContent = downloadBtn.querySelector('.notice-content');
    if (!noticeContent) {
        console.error('Notice content not found');
        return;
    }
    
    const title = noticeContent.querySelector('h3');
    const description = noticeContent.querySelector('p');
    
    if (loading) {
        if (title) title.textContent = 'Generating PDF...';
        if (description) description.textContent = 'Please wait while we create your confirmation document.';
        downloadBtn.style.pointerEvents = 'none';
        downloadBtn.style.opacity = '0.7';
    } else {
        if (title) title.textContent = 'Download Your Booking Confirmation';
        if (description) description.textContent = 'Save your booking details as a PDF for your records. The PDF includes all your appointment information and can be shared or printed.';
        downloadBtn.style.pointerEvents = 'auto';
        downloadBtn.style.opacity = '1';
    }
} 
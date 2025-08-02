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
            window.location.href = 'admin.html';
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
// Mobile menu functionality
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger?.addEventListener('click', () => {
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                navLinks.style.display = 'none';
            }
        }
    });
});

// Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    } else {
        navbar.style.background = '#ffffff';
        navbar.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    }
});

// Create images directory
const createImagesDirectory = () => {
    // Note: This would typically be done server-side
    // For now, we'll just log a reminder
    console.log('Remember to create an "images" directory and add your hair braiding photos');
};

// Gallery Pagination
document.addEventListener('DOMContentLoaded', () => {
    const adminLoginBtn = document.getElementById('admin-login-btn');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => {
            const passkey = prompt('Enter admin passkey:');
            if (passkey === '111970') {
                window.location.href = '/admin.html';
            } else if (passkey !== null) { // Prevents alert if user clicks "Cancel"
                alert('Incorrect passkey.');
            }
        });
    }

    // Existing gallery logic
    const galleryGrids = document.querySelectorAll('.gallery-grid');
    const paginationButtons = document.querySelectorAll('.pagination-button');
    const pageIndicators = document.querySelectorAll('.page-dot');
    let currentGalleryIndex = 0;

    function showGallery(index) {
        galleryGrids.forEach((grid, i) => {
            grid.classList.toggle('active', i === index);
        });
        pageIndicators.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentGalleryIndex = index;
    }

    paginationButtons.forEach(button => {
        button.addEventListener('click', () => {
            const direction = button.id === 'next-page' ? 1 : -1;
            let nextIndex = currentGalleryIndex + direction;
            if (nextIndex >= galleryGrids.length) {
                nextIndex = 0;
            } else if (nextIndex < 0) {
                nextIndex = galleryGrids.length - 1;
            }
            showGallery(nextIndex);
        });
    });

    pageIndicators.forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.index, 10);
            showGallery(index);
        });
    });

    // Initialize first gallery
    if (galleryGrids.length > 0) {
        showGallery(0);
    }
}); 
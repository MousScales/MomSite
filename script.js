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
document.addEventListener('DOMContentLoaded', function() {
    const gallery = {
        currentPage: 1,
        pages: document.querySelectorAll('.gallery-grid'),
        dots: document.querySelectorAll('.page-dot'),
        prevBtn: document.querySelector('.prev-page'),
        nextBtn: document.querySelector('.next-page'),
        totalPages: document.querySelectorAll('.gallery-grid').length,

        init() {
            this.showPage(1);
            this.addEventListeners();
        },

        showPage(pageNumber) {
            // Hide all pages
            this.pages.forEach(page => {
                page.style.display = 'none';
                page.classList.remove('active');
            });

            // Show selected page
            const pageToShow = this.pages[pageNumber - 1];
            if (pageToShow) {
                pageToShow.style.display = 'grid';
                pageToShow.classList.add('active');
            }

            // Update dots
            this.dots.forEach((dot, index) => {
                dot.classList.toggle('active', index + 1 === pageNumber);
            });

            // Update buttons
            this.prevBtn.style.opacity = pageNumber === 1 ? '0.5' : '1';
            this.nextBtn.style.opacity = pageNumber === this.totalPages ? '0.5' : '1';

            this.currentPage = pageNumber;
        },

        next() {
            if (this.currentPage < this.totalPages) {
                this.showPage(this.currentPage + 1);
            }
        },

        prev() {
            if (this.currentPage > 1) {
                this.showPage(this.currentPage - 1);
            }
        },

        addEventListeners() {
            // Button clicks
            this.nextBtn.addEventListener('click', () => this.next());
            this.prevBtn.addEventListener('click', () => this.prev());

            // Dot clicks
            this.dots.forEach((dot, index) => {
                dot.addEventListener('click', () => this.showPage(index + 1));
            });

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.prev();
                if (e.key === 'ArrowRight') this.next();
            });

            // Touch swipe
            let touchStartX = 0;
            const galleryContainer = document.querySelector('.gallery-container');

            galleryContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
            });

            galleryContainer.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                const swipeDistance = touchEndX - touchStartX;

                if (Math.abs(swipeDistance) > 50) { // 50px threshold
                    if (swipeDistance > 0) {
                        this.prev();
                    } else {
                        this.next();
                    }
                }
            });
        }
    };

    // Initialize gallery
    gallery.init();
}); 
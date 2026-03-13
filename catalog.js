document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const hairstyleCards = document.querySelectorAll('.hairstyle-card');
    const hairstyleSections = document.querySelectorAll('.hairstyles-section');

    // Define search keywords for better matching
    const searchKeywords = {
        'box braids': ['box', 'protective', 'natural', 'braids'],
        'traditional box braids': ['traditional', 'box', 'classic', 'protective'],
        'boho box braids': ['boho', 'bohemian', 'curly', 'box', 'wavy', 'loose'],
        'jumbo box braids': ['jumbo', 'large', 'big', 'box', 'thick'],
        'micro braids': ['micro', 'small', 'tiny', 'fine', 'detailed'],
        'fulani braids': ['fulani', 'tribal', 'cultural', 'beads', 'patterns'],
        'lemonade braids': ['lemonade', 'side', 'beyonce', 'cornrows'],
        'stitch braids': ['stitch', 'feed-in', 'straight', 'clean'],
        'tribal braids': ['tribal', 'cultural', 'patterns', 'geometric'],
        'goddess braids': ['goddess', 'thick', 'large', 'chunky', 'bold'],
        'tree braids': ['tree', 'loose', 'natural', 'extensions'],
        'feed-in cornrows': ['feed-in', 'cornrows', 'scalp', 'straight'],
        'straight-back cornrows': ['straight', 'back', 'cornrows', 'classic'],
        'freestyle cornrows': ['freestyle', 'creative', 'patterns', 'artistic'],
        'zig-zag cornrows': ['zigzag', 'zig', 'zag', 'patterns', 'creative'],
        'heart-shaped braids': ['heart', 'shaped', 'patterns', 'romantic'],
        'senegalese twists': ['senegalese', 'twists', 'rope', 'protective'],
        'passion twists': ['passion', 'twists', 'spring', 'bouncy'],
        'marley twists': ['marley', 'twists', 'natural', 'textured'],
        'two strand twists': ['two', 'strand', 'twists', 'natural', 'protective', 'simple'],
        'starter locs': ['starter', 'locs', 'dreadlocks', 'beginning'],
        'locs retwist': ['locs', 'retwist', 'maintenance', 'dreadlocks'],
        'lock retwist 2 strands': ['locs', 'lock', 'retwist', 'strands', 'twist'],
        'locs retwist barrel': ['locs', 'retwist', 'barrel', 'spiral'],
        'weave install': ['weave', 'install', 'extensions', 'hair', 'length', 'volume', 'sew-in']
    };

    // Add search functionality
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();

        // If search is empty, show all cards and sections
        if (searchTerm === '') {
            hairstyleCards.forEach(card => {
                card.style.display = 'block';
            });
            hairstyleSections.forEach(section => {
                section.style.display = 'block';
            });
            hideNoResultsMessage();
            return;
        }

        let hasVisibleCards = false;

        // Filter through each section
        hairstyleSections.forEach(section => {
            let sectionHasVisibleCards = false;
            const cardsInSection = section.querySelectorAll('.hairstyle-card');

            cardsInSection.forEach(card => {
                const styleName = card.querySelector('.hairstyle-title').textContent.toLowerCase();
                const styleKey = styleName.toLowerCase();
                
                // Check if search term matches style name or keywords
                let matches = styleName.includes(searchTerm);
                
                // Also check against keywords if available
                if (!matches && searchKeywords[styleKey]) {
                    matches = searchKeywords[styleKey].some(keyword => 
                        keyword.includes(searchTerm) || searchTerm.includes(keyword)
                    );
                }
                
                if (matches) {
                    card.style.display = 'block';
                    sectionHasVisibleCards = true;
                    hasVisibleCards = true;
                } else {
                    card.style.display = 'none';
                }
            });

            // Show/hide entire section based on whether it has visible cards
            if (sectionHasVisibleCards) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });

        // Show "no results" message if no cards match
        if (!hasVisibleCards) {
            showNoResultsMessage(searchTerm);
        } else {
            hideNoResultsMessage();
        }
    });

    // Add search on Enter key press
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Search is already happening on input, so we don't need to do anything extra
        }
    });

    // Make search icon clickable
    const searchIcon = document.querySelector('.search-icon');
    if (searchIcon) {
        searchIcon.addEventListener('click', function() {
            searchInput.focus();
        });
    }

    // Function to show no results message
    function showNoResultsMessage(searchTerm) {
        hideNoResultsMessage(); // Remove any existing message
        
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'no-results-message';
        noResultsDiv.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--soft-grey); background: white; border-radius: 15px; margin: 2rem 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; color: var(--primary-blue);"></i>
                <h3 style="margin-bottom: 0.5rem; color: var(--primary-dark);">No hairstyles found</h3>
                <p style="margin: 0;">No results found for "${searchTerm}". Try searching for a different style.</p>
                <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">Try searching for: box braids, cornrows, twists, locs, fulani, goddess, etc.</p>
            </div>
        `;
        
        const catalogMain = document.querySelector('.catalog-main');
        catalogMain.appendChild(noResultsDiv);
    }

    // Function to hide no results message
    function hideNoResultsMessage() {
        const existingMessage = document.querySelector('.no-results-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    // Clear search function (can be called externally)
    window.clearSearch = function() {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
    };

    // Add popular search suggestions when input is focused and empty
    searchInput.addEventListener('focus', function() {
        if (this.value === '') {
            // Could add search suggestions here in the future
        }
    });
}); 
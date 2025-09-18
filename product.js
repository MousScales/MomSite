document.addEventListener('DOMContentLoaded', function() {
    // Style definitions with details for each braiding style
    const styleDetails = {
        'knotless-box-braids': {
            title: 'Box Braids',
            description: 'Box braids offer a versatile and protective styling option. These classic braids can be styled in various ways and provide excellent protection for your natural hair while maintaining a beautiful, neat appearance. We also offer the option to make them knotless for a more natural look with less tension on your scalp.',
            price: {
                range: '$230 - $250',
                note: 'Price varies by length (shoulder: $230, midback: $250). Knotless option available for +$30'
            },
            features: [
                'Versatile styling options',
                'Excellent protection for natural hair',
                'Available in various sizes',
                'Can be styled in multiple ways',
                'Lasts 6-8 weeks with proper care'
            ],
            maintenance: [
                'Wash every 2-3 weeks with diluted shampoo',
                'Moisturize scalp and braids regularly',
                'Sleep with a silk or satin scarf',
                'Avoid excessive manipulation'
            ],
            images: [
                'images/knotless-box-braids-1.jpg',
                'images/knotless-box-braids-2.jpg',
                'images/knotless-box-braids-3.jpg'
            ]
        },
        'traditional-box-braids': {
            title: 'Traditional Box Braids',
            description: 'Classic box braids are a timeless protective style where your natural hair is sectioned into square-shaped parts and braided with extensions. Versatile and long-lasting.',
            features: [
                'Available in small, medium, or large sizes',
                'Multiple length and color options',
                'Durable and long-lasting style',
                'Can be styled in various ways',
                'Great for all hair textures'
            ],
            maintenance: [
                'Wash every 2-3 weeks',
                'Keep scalp moisturized',
                'Wrap hair at night',
                'Avoid tight styling that pulls on roots'
            ]
        },
        'boho-box-braids': {
            title: 'Boho Box Braids',
            description: 'Boho box braids feature curly or wavy pieces left out at the ends or throughout the braids, creating a carefree, bohemian aesthetic perfect for any occasion.',
            price: {
                range: '$250 - $280',
                note: 'Price varies by length (shoulder: $280, midback: $250). Comes with human hair'
            },
            features: [
                'Curly or wavy ends for texture',
                'Face-framing pieces left out',
                'Bohemian, relaxed appearance',
                'Multiple styling options',
                'Perfect for festivals and casual wear'
            ],
            maintenance: [
                'Gently detangle loose curly pieces',
                'Use leave-in conditioner on loose hair',
                'Sleep with a silk bonnet',
                'Regular scalp care and moisturizing'
            ],
            images: [
                'images/boho-box-braids-1.jpg',
                'images/boho-box-braids-2.jpg',
                'images/boho-box-braids-3.jpg'
            ]
        },
        'fulani-braids': {
            title: 'Fulani Braids',
            description: 'Fulani braids are a cultural style featuring cornrows that often lead into box braids, decorated with beads, rings, and accessories for a stunning traditional look.',
            price: {
                range: '$220 - $250',
                note: 'Price varies by length (shoulder: $220, midback: $250)'
            },
            features: [
                'Combination of cornrows and box braids',
                'Traditional cultural significance',
                'Decorative beads and accessories',
                'Unique parting patterns',
                'Versatile styling options'
            ],
            maintenance: [
                'Gentle washing to preserve accessories',
                'Regular scalp moisturizing',
                'Careful handling of decorative elements',
                'Sleep protection to maintain style'
            ],
            images: [
                'images/fulani-braids-1.jpg',
                'images/fulani-braids-2.jpg',
                'images/fulani-braids-3.jpg'
            ]
        },
        'lemonade-braids': {
            title: 'Lemonade Braids',
            description: 'Lemonade braids are side-swept cornrows that create a beautiful flowing pattern. Made popular by Beyoncé, this style is both elegant and edgy.',
            price: {
                range: '$130 - $200',
                note: 'Price varies by length (short: $130, medium: $160, long: $200)'
            },
            features: [
                'Side-swept cornrow pattern',
                'Creates flowing, cascading effect',
                'Can incorporate various braid sizes',
                'Modern and trendy appearance',
                'Great for special occasions'
            ],
            maintenance: [
                'Gentle washing to maintain pattern',
                'Regular scalp care',
                'Sleep with silk scarf to preserve style',
                'Light oil application for shine'
            ],
            images: [
                'images/lemonade-braids-1.jpg',
                'images/lemonade-braids-2.jpg',
                'images/lemonade-braids-3.jpg'
            ]
        },
        'stitch-braids': {
            title: 'Stitch Braids',
            description: 'Stitch braids feature a unique braiding technique that creates horizontal "stitched" lines across the scalp, resulting in a distinctive geometric pattern.',
            price: {
                range: '$150',
                note: 'Human hair option available for +$50'
            },
            features: [
                'Geometric stitched pattern',
                'Clean, precise lines',
                'Modern artistic appearance',
                'Can be combined with other styles',
                'Eye-catching and unique'
            ],
            maintenance: [
                'Maintain clean parts with light oil',
                'Gentle cleansing to preserve pattern',
                'Regular moisturizing',
                'Careful styling to keep lines crisp'
            ],
            images: [
                'images/stitch-braids-1.jpg',
                'images/stitch-braids-2.jpg',
                'images/stitch-braids-3.jpg'
            ]
        },
        'tribal-braids': {
            title: 'Tribal Braids',
            description: 'Tribal braids incorporate various traditional African braiding techniques, often featuring intricate patterns, accessories, and cultural elements.',
            price: {
                range: '$220 - $250',
                note: 'Price varies by length (shoulder: $220, midback: $250)'
            },
            features: [
                'Traditional African styling techniques',
                'Intricate and artistic patterns',
                'Cultural significance and heritage',
                'Often includes beads and accessories',
                'Unique and personalized designs'
            ],
            maintenance: [
                'Respectful care of cultural elements',
                'Gentle handling of accessories',
                'Regular scalp and hair moisturizing',
                'Preserve traditional styling integrity'
            ],
            images: [
                'images/tribal-braids-1.jpg',
                'images/tribal-braids-2.jpg',
                'images/tribal-braids-3.jpg'
            ]
        },

        'tree-braids': {
            title: 'Tree Braids',
            description: 'Tree braids involve braiding extensions into your natural hair while leaving some hair loose, creating a natural, flowing appearance with protective benefits.',
            features: [
                'Extensions braided in with loose ends',
                'Natural, flowing appearance',
                'Protective for natural hair',
                'Allows hair movement and styling',
                'Blends with natural texture'
            ],
            maintenance: [
                'Regular detangling of loose hair',
                'Moisturize both braided and loose sections',
                'Use leave-in conditioners',
                'Gentle styling of loose pieces'
            ]
        },
        'cornrows': {
            title: 'Cornrows',
            description: 'Cornrows are a traditional protective hairstyle where hair is braided very close to the scalp in continuous, raised rows. Available in various patterns including feed-in, straight-back, freestyle, zig-zag, and decorative designs like heart shapes.',
            price: {
                range: '$80 - $120',
                note: 'No style: $80. With style: $120 (requires reference image)'
            },
            features: [
                'Multiple pattern options available',
                'Feed-in technique for natural hairline',
                'Straight-back, freestyle, and zig-zag patterns',
                'Decorative designs and artistic patterns',
                'Professional, neat appearance',
                'Great protective style for all ages',
                'Can be styled up or accessorized',
                'Suitable for all hair textures'
            ],
            maintenance: [
                'Regular scalp moisturizing essential',
                'Gentle washing between rows',
                'Sleep with silk scarf to maintain pattern',
                'Light oil application for shine and health',
                'Avoid excessive manipulation',
                'Keep edges protected and moisturized'
            ],
            images: [
                'images/cornrows-1.jpg',
                'images/cornrows-2.jpg',
                'images/cornrows-3.jpg'
            ]
        },
        'feed-in-cornrows': {
            title: 'Feed-In Cornrows',
            description: 'Feed-in cornrows start small at the hairline and gradually increase in size as hair is fed in, creating a natural-looking style with less tension.',
            features: [
                'Gradual size increase from hairline',
                'Natural-looking hairline',
                'Less tension and pulling',
                'Various pattern options',
                'Professional, neat appearance'
            ],
            maintenance: [
                'Gentle edge care and moisturizing',
                'Regular scalp treatments',
                'Sleep with silk scarf',
                'Avoid excessive manipulation'
            ]
        },
        'straight-back-cornrows': {
            title: 'Straight-Back Cornrows',
            description: 'Classic straight-back cornrows are a timeless protective style featuring neat, parallel rows that run from the front hairline to the back.',
            features: [
                'Clean, parallel row pattern',
                'Timeless and classic appearance',
                'Great for all ages',
                'Professional and neat',
                'Foundation for many other styles'
            ],
            maintenance: [
                'Regular scalp moisturizing',
                'Gentle washing between rows',
                'Edge care and protection',
                'Light oil application for shine'
            ]
        },
        'freestyle-cornrows': {
            title: 'Freestyle Cornrows',
            description: 'Freestyle cornrows feature creative patterns and designs, allowing for artistic expression through unique parting and braiding techniques.',
            features: [
                'Creative and artistic patterns',
                'Unique, personalized designs',
                'Artistic expression through braiding',
                'Can incorporate curves and shapes',
                'One-of-a-kind appearance'
            ],
            maintenance: [
                'Preserve artistic pattern integrity',
                'Gentle care to maintain design',
                'Regular moisturizing',
                'Careful styling around patterns'
            ]
        },
        'zigzag-cornrows': {
            title: 'Zig-Zag Cornrows',
            description: 'Zig-zag cornrows feature a distinctive zigzag parting pattern that creates visual interest and a playful, modern twist on traditional cornrows.',
            features: [
                'Distinctive zigzag parting pattern',
                'Modern twist on classic cornrows',
                'Playful and eye-catching',
                'Creates visual movement',
                'Great for all occasions'
            ],
            maintenance: [
                'Maintain zigzag parts with light oil',
                'Gentle cleansing to preserve pattern',
                'Regular scalp care',
                'Sleep protection to keep pattern crisp'
            ]
        },
        'heart-shaped-braids': {
            title: 'Heart-Shaped Braids',
            description: 'Heart-shaped braids feature cornrows or box braids arranged in heart patterns, creating a romantic and playful style perfect for special occasions.',
            features: [
                'Romantic heart-shaped patterns',
                'Perfect for special occasions',
                'Playful and feminine appearance',
                'Can be combined with other styles',
                'Instagram-worthy design'
            ],
            maintenance: [
                'Preserve heart pattern shape',
                'Gentle care around design areas',
                'Regular moisturizing',
                'Careful styling to maintain pattern'
            ]
        },
        'senegalese-twists': {
            title: 'Senegalese Twists',
            description: 'Senegalese twists are a beautiful protective style that uses a special twisting technique to create rope-like strands. This elegant style offers versatility and can last 6-8 weeks with proper care.',
            price: {
                range: '$230 - $250',
                note: 'Price varies by length (shoulder: $230, midback: $250)'
            },
            features: [
                'Rope-like twisted strands',
                'Elegant and versatile style',
                'Long-lasting protection',
                'Can be styled in various ways',
                'Professional and polished look'
            ],
            maintenance: [
                'Wash every 2-3 weeks',
                'Keep scalp and twists moisturized',
                'Sleep with a silk or satin scarf',
                'Avoid heavy products that cause buildup'
            ],
            images: [
                'images/senegalese-twists-1.jpg',
                'images/senegalese-twists-2.jpg',
                'images/senegalese-twists-3.jpg'
            ]
        },
        'passion-twists': {
            title: 'Passion Twists',
            description: 'Passion twists are a modern protective style that combines the technique of Senegalese twists with specially textured hair to create a bohemian, romantic look.',
            price: {
                range: '$250 - $300',
                note: 'Price varies by length (shoulder: $250, midback: $300)'
            },
            features: [
                'Textured, bohemian appearance',
                'Combination of different techniques',
                'Natural-looking texture',
                'Lightweight and comfortable',
                'Modern protective style'
            ],
            maintenance: [
                'Moisturize regularly for texture',
                'Use leave-in conditioner',
                'Gentle detangling when needed',
                'Sleep protection for longevity'
            ],
            images: [
                'images/passion-twists-1.jpg',
                'images/passion-twists-2.jpg',
                'images/passion-twists-3.jpg'
            ]
        },
        'marley-twists': {
            title: 'Marley Twists',
            description: 'Marley twists use textured hair to create a natural-looking twisted style that is both protective and stylish.',
            price: {
                range: '$230 - $300',
                note: 'Price varies by length (shoulder: $230, midback: $300)'
            },
            features: [
                'Natural hair texture appearance',
                'Blends with natural hair',
                'Affordable protective option',
                'Quick installation process',
                'Versatile and comfortable'
            ],
            maintenance: [
                'Regular moisturizing for texture',
                'Gentle cleansing routine',
                'Use natural oils for shine',
                'Careful handling to prevent frizz'
            ],
            images: [
                'images/marley-twists-1.jpg',
                'images/marley-twists-2.jpg',
                'images/marley-twists-3.jpg'
            ]
        },
        'two-strand-twists': {
            title: 'Two Strand Twists',
            description: 'Two strand twists are a classic natural hair style that protects and promotes healthy hair growth.',
            price: {
                range: '$130',
                note: 'Style uses your natural hair only. Extensions available for +$20'
            },
            features: [
                'Simple yet elegant protective style',
                'Works beautifully on natural hair',
                'Can be worn as-is or styled further',
                'Low manipulation technique',
                'Great foundation for twist-outs'
            ],
            maintenance: [
                'Moisturize regularly to prevent dryness',
                'Sleep with silk scarf or bonnet',
                'Gentle cleansing with co-wash',
                'Light oil application for shine',
                'Avoid over-manipulation'
            ],
            images: [
                'images/two-strand-twists-1.png',
                'images/two-strand-twists-2.png',
                'images/two-strand-twists-3.png'
            ]
        },
        'micro-braids': {
            title: 'Micro Braids',
            description: 'Micro braids are extremely small, fine braids that offer maximum versatility in styling while providing excellent protection for natural hair.',
            features: [
                'Extremely fine, small braids',
                'Maximum styling versatility',
                'Excellent hair protection',
                'Natural hair appearance',
                'Long-lasting when properly maintained'
            ],
            maintenance: [
                'Very gentle handling required',
                'Regular scalp care essential',
                'Light moisturizing routine',
                'Professional removal recommended'
            ]
        },
        'jumbo-box-braids': {
            title: 'Jumbo Box Braids',
            description: 'Jumbo box braids are a bold and beautiful protective style featuring larger sections, perfect for those wanting a statement look with less installation time.',
            price: {
                range: '$230',
                note: 'Midback length only. 3 hours duration'
            },
            features: [
                'Large, thick braid size',
                'Faster installation time',
                'Bold, statement appearance',
                'Lower maintenance requirements',
                'Great for busy lifestyles'
            ],
            maintenance: [
                'Regular scalp moisturizing',
                'Gentle washing routine',
                'Sleep protection essential',
                'Avoid heavy styling products'
            ],
            images: [
                'images/jumbo-box-braids-1.jpg',
                'images/jumbo-box-braids-2.jpg',
                'images/jumbo-box-braids-3.jpg'
            ]
        },
        'starter-locs': {
            title: 'Starter Locs',
            description: 'Start your loc journey with professional installation of starter locs.',
            price: {
                range: '$150+',
                note: 'Price may vary by hair length - will discuss during appointment. Palm roll method'
            },
            features: [
                'Beginning stage of loc journey',
                'Controlled starting process',
                'Foundation for mature locs',
                'Neat and organized appearance',
                'Professional installation important'
            ],
            maintenance: [
                'Regular palm rolling or twisting',
                'Avoid over-manipulation',
                'Use residue-free products',
                'Regular maintenance appointments'
            ],
            images: [
                'images/starter-locs-1.png',
                'images/starter-locs-2.png',
                'images/starter-locs-3.png'
            ]
        },
        'locs-retwist': {
            title: 'Locs Retwist',
            description: 'Professional maintenance and retwisting of established locs.',
            price: {
                range: '$130+',
                note: 'Final price will be discussed depending on the amount of locs you have'
            },
            features: [
                'Maintains loc shape and neatness',
                'Promotes healthy loc development',
                'Regular maintenance service',
                'Keeps roots tidy',
                'Essential for loc health'
            ],
            maintenance: [
                'Schedule regular retwist appointments',
                'Use natural, residue-free products',
                'Gentle cleansing routine',
                'Avoid frequent manipulation'
            ],
            images: [
                'images/locs-retwist-1.png',
                'images/locs-retwist-2.png',
                'images/locs-retwist-3.png'
            ]
        },
        'lock-retwist-2-strands': {
            title: 'Locs Retwist 2 Strands',
            description: 'Professional maintenance and two-strand retwisting of established locs.',
            price: {
                range: '$150+',
                note: 'Final price will be discussed depending on the amount of locs you have'
            },
            features: [
                'Two-strand twist technique',
                'Creates spiral patterns',
                'Maintains loc definition',
                'Promotes even growth',
                'Professional maintenance method'
            ],
            maintenance: [
                'Regular professional maintenance',
                'Use appropriate loc products',
                'Gentle daily care routine',
                'Protect during sleep'
            ],
            images: [
                'images/lock-retwist-2-strands-1.png',
                'images/lock-retwist-2-strands-2.png',
                'images/lock-retwist-2-strands-3.png'
            ]
        },
        'locs-retwist-barrel': {
            title: 'Barrel Twists',
            description: 'Professional barrel twist installation and styling.',
            price: {
                range: '$150',
                note: 'Standard length. 2 hours duration'
            },
            features: [
                'Creates fuller, rounder locs',
                'Barrel-shaped loc formation',
                'Professional technique',
                'Enhances loc volume',
                'Specialized maintenance method'
            ],
            maintenance: [
                'Specialized care routine',
                'Regular professional maintenance',
                'Use products that enhance volume',
                'Gentle handling to maintain shape'
            ],
            images: [
                'images/locs-retwist-barrel-1.png',
                'images/locs-retwist-barrel-2.png',
                'images/locs-retwist-barrel-3.png'
            ]
        },
        'weave': {
            title: 'Weave Install',
            description: 'Professional installation of weave extensions.',
            price: {
                range: '$150+',
                note: 'Base service $150. Add hair bundle for +$100. 2 hours duration'
            },
            features: [
                'Adds instant length and volume',
                'Multiple texture and color options',
                'Versatile styling possibilities',
                'Professional installation',
                'Can be styled like natural hair'
            ],
            maintenance: [
                'Wash every 1-2 weeks',
                'Use sulfate-free shampoo',
                'Deep condition regularly',
                'Sleep with silk scarf or bonnet',
                'Regular professional maintenance'
            ],
            images: [
                'images/weave-1.jpg',
                'images/weave-2.jpg',
                'images/weave-3.jpg'
            ]
        },
        'test-style': {
            title: 'Test Style',
            description: 'This is a test style for development and testing purposes. It has a minimal deposit requirement and is perfect for testing the booking system functionality.',
            price: {
                range: '$1 deposit',
                note: 'Test style with minimal deposit for development purposes'
            },
            features: [
                'Perfect for testing',
                'Minimal deposit required',
                'Quick service',
                'Development friendly',
                'Easy to book'
            ],
            maintenance: [
                'No special maintenance required',
                'Perfect for testing purposes',
                'Quick turnaround time'
            ],
            images: [
                'images/test-style-1.jpg'
            ]
        }
    };

    // Function to get style from URL
    function getStyleFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('style');
    }



    // Update page content based on selected style
    function updatePageContent() {
        const style = getStyleFromURL();
        const details = styleDetails[style] || styleDetails['cornrows'];
        
        // Update page title
        document.title = `${details.title} - Maya African Hair Braiding`;
        
        // Update main heading
        const mainHeading = document.querySelector('.product-info h1');
        if (mainHeading) {
            mainHeading.textContent = details.title;
        }
        
        // Update description
        const description = document.querySelector('.product-description p');
        if (description) {
            description.textContent = details.description;
        }
        
        // Update features list
        const featuresList = document.querySelector('.features-section ul');
        if (featuresList) {
            featuresList.innerHTML = details.features.map(feature => `<li>${feature}</li>`).join('');
        }
        
        // Update maintenance list
        const maintenanceList = document.querySelector('.maintenance-section ul');
        if (maintenanceList) {
            maintenanceList.innerHTML = details.maintenance.map(tip => `<li>${tip}</li>`).join('');
        }
        
        // Update carousel images
        const carouselSlides = document.querySelectorAll('.carousel-slide');
        if (details.images && details.images.length > 0) {
            // Replace placeholder divs with actual images
            carouselSlides.forEach((slide, index) => {
                if (index < details.images.length) {
                    // Clear existing content
                    slide.innerHTML = '';
                    
                    // Create image element
                    const img = document.createElement('img');
                    img.src = details.images[index];
                    img.alt = `${details.title} Style ${index + 1}`;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '15px';
                    
                    slide.appendChild(img);
                } else {
                    // Fallback to placeholder if not enough images
                    const placeholderDiv = slide.querySelector('.placeholder-image');
                    if (placeholderDiv) {
                        placeholderDiv.textContent = `${details.title} Style ${index + 1}`;
                    }
                }
            });
        } else {
            // Use placeholder images
            const placeholderImages = document.querySelectorAll('.placeholder-image');
            placeholderImages.forEach((img, index) => {
                img.textContent = `${details.title} Style ${index + 1}`;
            });
        }
        
        // Update price
        updatePriceDisplay(style);
        

    }

    // Update the price display when the page loads
    function updatePriceDisplay(style) {
        const priceRange = document.querySelector('.price-range');
        const priceNote = document.querySelector('.price-note');
        
        if (styleDetails[style] && styleDetails[style].price) {
            priceRange.textContent = styleDetails[style].price.range;
            priceNote.textContent = styleDetails[style].price.note;
        }
    }

    // Function to handle booking button click
    window.bookNow = function() {
        const selectedStyle = getStyleFromURL();
        const styleTitle = styleDetails[selectedStyle]?.title;
        if (styleTitle) {
            window.location.href = `booking?style=${encodeURIComponent(styleTitle)}`;
        } else {
            window.location.href = 'booking';
        }
    }

    // Initialize page content
    updatePageContent();

    const carousel = {
        track: document.querySelector('.carousel-track'),
        slides: document.querySelectorAll('.carousel-slide'),
        dots: document.querySelectorAll('.carousel-dot'),
        prevBtn: document.querySelector('.carousel-button.prev'),
        nextBtn: document.querySelector('.carousel-button.next'),
        currentIndex: 0,
        slideWidth: 100, // percentage

        init() {
            this.updateButtons();
            this.addEventListeners();
        },

        goToSlide(index) {
            if (index < 0 || index >= this.slides.length) return;
            
            this.currentIndex = index;
            this.track.style.transform = `translateX(-${index * this.slideWidth}%)`;
            
            // Update dots
            this.dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });

            this.updateButtons();
        },

        next() {
            if (this.currentIndex < this.slides.length - 1) {
                this.goToSlide(this.currentIndex + 1);
            }
        },

        prev() {
            if (this.currentIndex > 0) {
                this.goToSlide(this.currentIndex - 1);
            }
        },

        updateButtons() {
            this.prevBtn.style.opacity = this.currentIndex === 0 ? '0.5' : '1';
            this.nextBtn.style.opacity = this.currentIndex === this.slides.length - 1 ? '0.5' : '1';
        },

        addEventListeners() {
            // Button clicks
            this.nextBtn.addEventListener('click', () => this.next());
            this.prevBtn.addEventListener('click', () => this.prev());

            // Dot clicks
            this.dots.forEach((dot, index) => {
                dot.addEventListener('click', () => this.goToSlide(index));
            });

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') this.prev();
                if (e.key === 'ArrowRight') this.next();
            });

            // Touch swipe
            let touchStartX = 0;
            const container = document.querySelector('.carousel-container');

            container.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
            });

            container.addEventListener('touchend', (e) => {
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

    // Initialize carousel
    carousel.init();
}); 
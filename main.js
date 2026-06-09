// Smooth scroll behavior for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const targetId = this.getAttribute('href').substring(1);
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Intersection Observer for scroll reveal animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe all sections
document.querySelectorAll('.section').forEach(section => {
  section.classList.add('fade-in');
  observer.observe(section);
});

// Safer, clamped parallax + fade for hero image
const heroSection = document.getElementById('home');
const heroImage = document.querySelector('.hero-image');
if (heroImage && heroSection) {
  const onScrollParallax = () => {
    const rect = heroSection.getBoundingClientRect();
    const centerOffset = (rect.top + rect.height / 2) - (window.innerHeight / 2);
    const translate = Math.max(-30, Math.min(30, -centerOffset * 0.06));
    heroImage.style.transform = `translateY(${translate}px)`;
  };
  window.addEventListener('scroll', onScrollParallax, { passive: true });
  onScrollParallax();

  // fade in/out based on intersection ratio
  if ('IntersectionObserver' in window) {
    const thresholds = Array.from({length: 21}, (_,i) => i/20);
    const heroObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const r = e.intersectionRatio;
        // slightly boost visibility when fully visible
        heroImage.style.opacity = Math.max(0, Math.min(1, r * 1.2));
      });
    }, { threshold: thresholds });
    heroObs.observe(heroSection);
  }
}

// Gallery card hover lift effect
document.querySelectorAll('.gallery-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.zIndex = '10';
  });
  card.addEventListener('mouseleave', function() {
    this.style.zIndex = '1';
  });
});

// Random gallery image rotation every 10 seconds
const galleryCards = document.querySelectorAll('.gallery-card');
const galleryImages = [
  'src/images/2026-03-11T09-56-26.png',
  'src/images/ascii-art (14).png',
  'src/images/ascii-art.png',
  'src/images/asciikit-2026-03-10T17-40-43.png',
  'src/images/dither-2026-06-08-mmw9nb.png',
  'src/images/Image1_000 (2).png',
  'src/images/Image1_001.png',
  'src/images/Image1_002 (2).png',
  'src/images/Image1_002.png',
  'src/images/Image1_006.png',
  'src/images/Image1_008.png',
  'src/images/Image1_011.png',
  'src/images/Image1_014.png',
  'src/images/uji_2026-03-11T10.03.45.997Z_r160ro-0.65e1.005ex1.006t0.5i115w2560h2560c0ca0can0l255li28line0.12f1000wa848j10fa104exp42expa-54canva0.27sh-10.png',
  'src/images/uji_2026-03-11T16.25.37.819Z_r160ro-0.65e1.005ex1.006t0.5i402w2560h1406c0ca0can0l255li18line0.05f1000wa300j10.png'
];

const shuffle = (array) => {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const normalizeImageName = (uri) => uri.split('/').pop().replace(/%20/g, ' ');

const setCardImage = (card, imageUrl) => {
  const img = card.querySelector('img');
  if (!img) return;
  img.classList.add('fading');
  setTimeout(() => {
    img.src = encodeURI(imageUrl);
    img.alt = normalizeImageName(imageUrl).replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    img.classList.remove('fading');
  }, 300);
};

const getCurrentImageUrls = () => Array.from(document.querySelectorAll('.gallery-card img')).map(img => normalizeImageName(img.src));

const rotateGalleryImage = () => {
  const currentUrls = getCurrentImageUrls();
  const unusedImages = galleryImages.filter(url => !currentUrls.includes(normalizeImageName(url)));
  const nextImage = unusedImages.length ? unusedImages[Math.floor(Math.random() * unusedImages.length)] : galleryImages[Math.floor(Math.random() * galleryImages.length)];
  const card = galleryCards[Math.floor(Math.random() * galleryCards.length)];
  setCardImage(card, nextImage);
};

const initializeGallery = () => {
  const shuffled = shuffle(galleryImages);
  galleryCards.forEach((card, index) => {
    const img = card.querySelector('img');
    if (!img) return;
    const imageUrl = shuffled[index % shuffled.length];
    img.src = encodeURI(imageUrl);
    img.alt = normalizeImageName(imageUrl).replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  });
};

initializeGallery();
// rotation timer (can be paused while lightbox open)
let rotationTimer = setInterval(rotateGalleryImage, 10000);
let rotationPaused = false;
let currentLightboxIndex = -1;

const getGallerySources = () => Array.from(document.querySelectorAll('.gallery-card img')).map(img => img.getAttribute('src') || img.src);

// Lightbox / modal for full-image preview (with spinner + smooth load animation)
const lightbox = document.getElementById('lightbox');
const lightboxBackdrop = document.getElementById('lightbox-backdrop');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxSpinner = document.getElementById('lightbox-spinner');

const openLightbox = (src, fallback, index) => {
  if (!lightbox) return;
  // pause rotation
  if (rotationTimer) { clearInterval(rotationTimer); rotationTimer = null; rotationPaused = true; }
  if (typeof index === 'number') currentLightboxIndex = index;
  // prepare spinner & image
  if (lightboxSpinner) lightboxSpinner.classList.add('show');
  lightboxImage.classList.remove('loaded');
  lightboxImage.src = '';
  lightboxImage.alt = '';
  lightboxCaption.textContent = ''; // intentionally hide titles

  // show modal
  lightbox.classList.add('show');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // build candidate sources to try (preserve raw attr, dataset, encoded variations)
  const candidates = [];
  if (src) candidates.push(src);
  if (fallback) candidates.push(fallback);
  try { candidates.push(src && src.replace(/\s/g, '%20')); } catch(e) {}
  try { candidates.push(src && encodeURI(src)); } catch(e) {}
  try { candidates.push(src && decodeURI(src)); } catch(e) {}

  let idx = 0;
  const tryNext = () => {
    if (idx >= candidates.length) {
      if (lightboxSpinner) lightboxSpinner.classList.remove('show');
      lightboxImage.classList.add('loaded');
      lightboxImage.alt = 'Unable to load image';
      return;
    }
    const candidate = candidates[idx++];
    if (!candidate) return tryNext();

    lightboxImage.onload = () => {
      if (lightboxSpinner) lightboxSpinner.classList.remove('show');
      lightboxImage.classList.add('loaded');
      lightboxImage.onload = null;
    };
    lightboxImage.onerror = () => {
      // try next candidate
      lightboxImage.onerror = null;
      tryNext();
    };

    lightboxImage.src = candidate;
  };

  tryNext();
};

const closeLightbox = () => {
  if (!lightbox) return;
  lightbox.classList.remove('show');
  lightbox.setAttribute('aria-hidden', 'true');
  if (lightboxSpinner) lightboxSpinner.classList.remove('show');
  lightboxImage.src = '';
  lightboxImage.classList.remove('loaded');
  lightboxCaption.textContent = '';
  document.body.style.overflow = '';
  // resume rotation if it was paused
  if (rotationPaused && !rotationTimer) {
    rotationTimer = setInterval(rotateGalleryImage, 10000);
    rotationPaused = false;
  }
};

// Open lightbox when clicking a gallery preview (no visible titles)
document.querySelectorAll('.gallery-preview').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const img = btn.querySelector('img');
    const card = btn.closest('.gallery-card');
    if (!img) return;
    // prefer the raw attribute value to avoid browser-normalized absolute URLs
    const rawSrc = img.getAttribute('src') || img.src;
    const fallback = card ? (card.dataset.image || null) : null;
    // determine index within current gallery sources for navigation
    const sources = getGallerySources();
    let idx = sources.findIndex(s => s === rawSrc || s === encodeURI(rawSrc) || normalizeImageName(s) === normalizeImageName(rawSrc));
    if (idx === -1 && fallback) {
      idx = sources.findIndex(s => normalizeImageName(s) === normalizeImageName(fallback));
    }
    if (idx === -1) idx = 0;
    openLightbox(rawSrc, fallback, idx);
  });
});

// Lightbox navigation: prev/next
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');

const showAtIndex = (i) => {
  const sources = getGallerySources();
  if (!sources.length) return;
  const len = sources.length;
  const idx = ((i % len) + len) % len;
  currentLightboxIndex = idx;
  const src = sources[idx];
  const card = document.querySelectorAll('.gallery-card')[idx];
  const fallback = card ? (card.dataset.image || null) : null;
  openLightbox(src, fallback, idx);
};

const showNext = () => { showAtIndex(currentLightboxIndex + 1); };
const showPrev = () => { showAtIndex(currentLightboxIndex - 1); };

if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });

document.addEventListener('keydown', (e) => {
  if (!lightbox || !lightbox.classList.contains('show')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); showPrev(); }
  if (e.key === 'ArrowRight') { e.preventDefault(); showNext(); }
});

// Close handlers
if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);
if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

// Contact form submission with loading spinner
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const submitButton = this.querySelector('button[type="submit"]');
    
    // Simple validation
    if (!data.name || !data.email || !data.message) {
      alert('Please fill in all fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      alert('Please enter a valid email');
      return;
    }
    
    // Show loading spinner
    submitButton.classList.add('loading');
    submitButton.disabled = true;
    
    // Simulate form submission delay
    setTimeout(() => {
      console.log('Form submitted:', data);
      
      // Success feedback
      submitButton.classList.remove('loading');
      submitButton.textContent = '✓ Message Sent!';
      submitButton.style.color = '#f5f0e6';
      
      // Reset after 2 seconds
      setTimeout(() => {
        submitButton.textContent = 'Send Message';
        submitButton.disabled = false;
        this.reset();
      }, 2000);
    }, 1500);
  });
}

// Add active state to nav links and section glow on scroll
window.addEventListener('scroll', () => {
  const sections = document.querySelectorAll('.section');
  const navLinks = document.querySelectorAll('.site-nav a');
  
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    if (pageYOffset >= sectionTop - 220) {
      current = section.getAttribute('id');
    }
  });
  
  sections.forEach(section => {
    if (section.getAttribute('id') === current) {
      section.classList.add('active-section');
    } else {
      section.classList.remove('active-section');
    }
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href').substring(1) === current) {
      link.classList.add('active');
    }
  });
});

// Debounce scroll events for better performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Handle window resize responsively
const handleResize = debounce(() => {
  console.log('Window resized');
}, 250);

window.addEventListener('resize', handleResize);

// Lazy load images
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src || img.src;
        img.classList.add('loaded');
        imageObserver.unobserve(img);
      }
    });
  });
  
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

// Splash screen reveal logic
window.addEventListener('load', () => {
  const splashScreen = document.querySelector('.splash-screen');
  const body = document.body;
  const splashDelay = 1500;

  setTimeout(() => {
    body.classList.add('loaded');

    if (splashScreen) {
      splashScreen.classList.add('hidden');
      setTimeout(() => {
        splashScreen.style.display = 'none';
      }, 600);
    }
  }, splashDelay);
});

// Performance monitoring
if (window.performance && window.performance.timing) {
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    console.log('Page load time: ' + pageLoadTime + 'ms');
  });
}

/* Particle network background (dark blood-red) */
(function(){
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let DPR = Math.max(1, window.devicePixelRatio || 1);
  let width = 0, height = 0;
  let particles = [];
  let rafId = null;
  let running = true;

  function resize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(width * DPR);
    canvas.height = Math.floor(height * DPR);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initParticles();
  }

  function initParticles() {
    const area = width * height;
    const base = Math.round(Math.min(120, Math.max(30, area / 120000))); // scale with viewport
    particles = [];
    for (let i = 0; i < base; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: 0.8 + Math.random() * 1.6
      });
    }
  }

  function step() {
    if (!running) return;
    ctx.clearRect(0,0,width,height);

    // draw connections first (fainter)
    const maxDist = Math.min(140, Math.max(80, (width + height) / 24));
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        if (d2 <= maxDist * maxDist) {
          const alpha = Math.max(0, 0.9 * (1 - (d2 / (maxDist*maxDist))));
          ctx.strokeStyle = `rgba(240,235,220,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      // wrap around
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      ctx.beginPath();
      ctx.fillStyle = 'rgba(245,240,225,0.9)';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    }

    rafId = window.requestAnimationFrame(step);
  }

  // visibility handling to save CPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      running = true;
      if (!rafId) rafId = requestAnimationFrame(step);
    }
  });

  window.addEventListener('resize', () => {
    // debounce
    clearTimeout(window._bgResizeTimer);
    window._bgResizeTimer = setTimeout(resize, 120);
  });

  // init
  resize();
  rafId = requestAnimationFrame(step);

  // expose for debugging
  window.__bgParticles = { restart: () => { resize(); }, stop: () => { running = false; } };
})();

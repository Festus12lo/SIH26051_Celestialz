# ThermoShelter Landing Page — Immersive Build Prompt
## Climate-First Cinematic Entry Experience

---

## Design Philosophy

The landing page is not a static brochure. It is a **climate portal**. When a visitor arrives, they do not read about ThermoShelter — they **feel** the climate of the location they select. The page breathes, ripples, and transforms based on user intent. Every scroll is a journey deeper into the system's intelligence. Every button feels like pressing a physical surface. Every word arrives with purpose.

**Core metaphor:** The user is standing at the edge of a climate zone, looking out at the environment their shelter must survive. The interface is the lens through which they see the problem and the solution.

---

## Tech Stack

| Library | Purpose |
|---------|---------|
| **React 18 + Vite** | Core framework |
| **Tailwind CSS** | Utility styling |
| **GSAP + ScrollTrigger** | Scroll-driven animations, pinning, scrubbing |
| **Lenis** | Smooth scroll with inertia |
| **Framer Motion** | Component enter/exit animations |
| **Three.js / React Three Fiber** | Background particle atmosphere |
| **Canvas API** | Water drop ripple effects |
| **CSS Houdini** | Custom paint worklets (if supported, fallback to canvas) |

---

## Global Visual System

### Background Strategy: Location-Aware Video

The entire landing page background is a **full-screen looping video** that changes based on the selected location. This is the single most impactful visual decision.

**Video Asset Mapping:**

| Location | Video Source | Mood | Color Tint |
|----------|-------------|------|------------|
| **Leh, Ladakh** | Pexels: `https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4` (snow mountains) | Harsh, serene, extreme | Cyan `#06b6d4` overlay at 15% |
| **Jaipur, Rajasthan** | Pexels: `https://videos.pexels.com/video-files/3214448/3214448-hd_1920_1080_25fps.mp4` (desert heat) | Intense, golden, dry | Amber `#f59e0b` overlay at 15% |
| **Shimla, Himachal** | Pexels: `https://videos.pexels.com/video-files/1536322/1536322-hd_1920_1080_30fps.mp4` (misty mountains) | Soft, green, temperate | Emerald `#10b981` overlay at 15% |
| **Default / No selection** | Pexels: `https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_30fps.mp4` (abstract particles) | Neutral, tech, mysterious | Blue `#3b82f6` overlay at 10% |

**Video Implementation:**
```tsx
<video
  autoPlay
  muted
  loop
  playsInline
  className="absolute inset-0 w-full h-full object-cover"
  style={{ filter: 'brightness(0.4)' }}
>
  <source src={locationVideoMap[selectedLocation]} type="video/mp4" />
</video>
<div className="absolute inset-0 bg-gradient-to-b from-transparent via-[location-tint]/15 to-[#0a0e17]" />
```

**Transition:** When location changes, the current video **cross-fades** (opacity 1→0 over 0.8s) while the new video **cross-fades in** (opacity 0→1 over 0.8s). Both videos play simultaneously during transition to avoid black frames.

### Color Palette

```
Background:           #0a0e17  (near-black with blue undertone)
Surface Glass:        rgba(16, 24, 39, 0.6)
Surface Glass Border: rgba(148, 163, 184, 0.08)

Text Primary:         #f8fafc
Text Secondary:       #94a3b8
Text Accent:          #e2e8f0

Button Primary:       #000000  (pitch black)
Button Primary Text:  #ffffff
Button Primary Glow:  0 0 30px rgba(255,255,255,0.1), 0 0 60px rgba(255,255,255,0.05)

Button Secondary:     transparent
Button Secondary Border: rgba(255,255,255,0.2)

Accent Leh:           #06b6d4  (cyan)
Accent Jaipur:        #f59e0b  (amber)
Accent Shimla:        #10b981  (emerald)
Accent Universal:     #3b82f6  (blue)

Water Ripple:         rgba(255, 255, 255, 0.15)
```

### Typography

- **Hero Title:** Inter, 800 weight, 72px desktop / 40px mobile, letter-spacing -0.03em, line-height 1.1
- **Section Titles:** Inter, 700 weight, 48px, letter-spacing -0.02em
- **Body:** Inter, 400 weight, 18px, line-height 1.7, color #94a3b8
- **Labels / Badges:** JetBrains Mono, 500 weight, 12px, uppercase, letter-spacing 0.1em
- **Data Numbers:** JetBrains Mono, 600 weight, tabular-nums

---

## Section 1: Hero — The Climate Portal

### Layout
Full viewport height (100vh). Content centered vertically and horizontally. Background video fills entire screen.

### Elements

**1A. Navigation Bar (Fixed Top)**
- Height: 72px
- Background: `rgba(10, 14, 23, 0.8)` + `backdrop-filter: blur(20px)`
- Border-bottom: `1px solid rgba(255,255,255,0.05)`
- Left: ThermoShelter logo (icon + wordmark)
- Right: Links — "How it Works", "Archetypes", "Technology", "Get Started" button
- **Scroll behavior:** On scroll down, nav bar **compresses** to 56px height and background opacity increases to 0.95. On scroll up, expands back.

**1B. Location Selector (Floating, Top-Center)**
- Position: `top: 100px`, centered horizontally
- Three pill buttons: "Leh" | "Jaipur" | "Shimla"
- Default: None selected, shows "Choose Your Climate"
- Active pill: `background: [location-accent]`, `color: #000`, `font-weight: 600`
- Inactive pill: `background: rgba(255,255,255,0.05)`, `border: 1px solid rgba(255,255,255,0.1)`
- **Animation:** On select, pill **morphs** width to fit text with spring physics. A **glow ring** expands outward from the pill and fades.

**1C. Hero Title**
- Text: "Design Shelters That Survive Their Climate"
- Animation: **Split text reveal** — each word fades in + slides up (`y: 40 → 0`, `opacity: 0 → 1`) with stagger 0.08s between words. Triggered on page load.
- Subtitle: "AI-assisted, physics-validated, engineering-guaranteed shelter design for any environment."
- Subtitle animation: Fades in 0.5s after title completes.

**1D. Climate Data Orb (Center-Bottom)**
- A large circular element (280px diameter) positioned at bottom-center, partially off-screen
- Shows live weather data for selected location:
  - Center: Large temperature (JetBrains Mono, 64px)
  - Ring around orb: Animated gradient stroke showing temperature relative to comfort zone
  - Inner particles: Snowflakes for Leh, dust motes for Jaipur, mist for Shimla
- **Animation:** Orb **floats** gently (`translateY: -10px ↔ 10px`, 4s loop, ease: sine). On location change, orb **spins** 360° and data **morphs** to new values.

**1E. Get Started Button (Bottom-Center)**
- Text: "Get Started"
- Style:
  ```css
  .btn-get-started {
    background: #000000;
    color: #ffffff;
    padding: 18px 48px;
    border-radius: 100px;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 
      0 0 30px rgba(255,255,255,0.08),
      0 0 60px rgba(255,255,255,0.04),
      inset 0 1px 0 rgba(255,255,255,0.1);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .btn-get-started:hover {
    box-shadow: 
      0 0 40px rgba(255,255,255,0.15),
      0 0 80px rgba(255,255,255,0.08),
      inset 0 1px 0 rgba(255,255,255,0.2);
    transform: translateY(-2px);
  }
  .btn-get-started:active {
    transform: translateY(0) scale(0.98);
  }
  ```
- **Water Drop Effect:** On hover, a **ripple originates from the cursor position** and expands across the button surface. The ripple is a radial gradient that fades from white (center) to transparent (edge) over 0.6s. Multiple ripples can exist simultaneously if user moves mouse quickly.
- **Click:** Button **sinks** (`scale: 0.98`), then a **full-screen ripple** expands from the button center, transitioning to the next section.

**1F. Scroll Indicator**
- Bottom-center, below button
- Animated mouse icon or "Scroll to explore" text
- Bounces gently (`translateY: 0 ↔ 8px`, 2s loop)
- Fades out after user scrolls 100px

---

## Water Drop / Ripple Effect System

This is a **global interaction layer** that applies to the entire landing page, not just buttons.

### Implementation: Canvas Overlay

A full-screen `<canvas>` element sits above the background video but below the content, with `pointer-events: none` by default. When user clicks anywhere, it temporarily captures the event.

```typescript
interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
  speed: number;
}

class RippleSystem {
  private ripples: Ripple[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  addRipple(x: number, y: number, color: string = 'rgba(255,255,255,0.15)') {
    this.ripples.push({
      x, y,
      radius: 0,
      maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.4,
      opacity: 1,
      color,
      speed: 3
    });
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ripples = this.ripples.filter(r => r.opacity > 0.01);
    
    this.ripples.forEach(r => {
      r.radius += r.speed;
      r.opacity = 1 - (r.radius / r.maxRadius);
      
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color.replace('0.15', String(r.opacity * 0.15));
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Secondary ring
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius * 0.7, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color.replace('0.15', String(r.opacity * 0.08));
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
    
    requestAnimationFrame(() => this.animate());
  }
}
```

### Button-Specific Ripple

For the Get Started button, the ripple is **contained to the button boundary** and uses a lighter color:

```css
.btn-get-started {
  position: relative;
  overflow: hidden;
}

.btn-get-started .ripple {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  transform: scale(0);
  animation: ripple-expand 0.6s ease-out forwards;
  pointer-events: none;
}

@keyframes ripple-expand {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
```

**Trigger:** On `mouseenter`, create a small ripple at cursor position. On `click`, create a larger ripple that fills the button.

---

## Section 2: The Problem — Why Generic Shelters Fail

### Layout
120vh height. Pinned for 50vh of scroll. Two-column on desktop, stacked on mobile.

### Scroll Animation (GSAP ScrollTrigger)
- Section **pins** when it reaches center of viewport
- Left column (text): Slides in from left (`x: -100 → 0`, `opacity: 0 → 1`)
- Right column (visual): Slides in from right (`x: 100 → 0`, `opacity: 0 → 1`)
- Both triggered by scroll position with `scrub: 0.5`

### Content

**Label:** "THE PROBLEM" (JetBrains Mono, 12px, uppercase, accent color)

**Title:** "A Shelter That Looks Right Can Still Fail"
- Animation: **Word-by-word reveal** with `overflow: hidden` on each word container. Words slide up from below (`y: 100% → 0`).

**Body:**
"Generic shelter designs are reused across deserts, mountains, and coastlines without rigorous thermal validation. The result? Structures that overheat in Rajasthan, freeze in Ladakh, or waste energy everywhere."
- Animation: Lines fade in with stagger 0.1s

**Statistic Cards (3 cards in a row):**
1. "68%" — "Of shelters in high-altitude regions suffer from thermal inefficiency"
2. "₹2.4L" — "Average wasted cost per shelter due to poor climate adaptation"
3. "48h" — "Our simulation horizon for transient thermal analysis"

**Card Animation:** Each card **flips in** from 90° X rotation. Numbers **count up** from 0 using `react-countup`. Stagger: 0.15s between cards.

**Visual (Right Column):**
- A split-screen comparison:
  - Left half: "Generic Design" — a plain box shelter in a harsh environment, glowing red (overheating) or blue (freezing)
  - Right half: "ThermoShelter Design" — an optimized shelter with proper insulation, windows, and materials, glowing green (comfortable)
- The divide between them is a **vertical line that sweeps** left to right as user scrolls, revealing the optimized version

---

## Section 3: How It Works — The Pipeline

### Layout
200vh scroll height. Pinned section with **horizontal scroll** converted from vertical scroll. User scrolls down, content moves left.

### Concept
The user "walks through" the 6-step pipeline. Each step is a full viewport-width panel.

### Step Panels

**Panel 1: Input**
- Visual: A hand-typed message appearing in a chat bubble: "Emergency shelter in Leh for 4 people"
- Label: "01 — INPUT"
- Title: "Describe Your Need"
- Body: "Natural language, simple parameters, or detailed specifications. Our LLM understands intent."

**Panel 2: Generate**
- Visual: Three shelter silhouettes **morphing** into existence from wireframe to solid
- Label: "02 — GENERATE"
- Title: "AI Proposes Candidates"
- Body: "Multiple archetypes explored. Each candidate is a complete design, not a sketch."

**Panel 3: Simulate**
- Visual: A **thermal chart drawing itself** across the screen. Outdoor temp (blue jagged), indoor temp (green smooth). Comfort zone band.
- Label: "03 — SIMULATE"
- Title: "Physics Proves Performance"
- Body: "48-hour transient thermal simulation. Heat transfer, solar gain, infiltration — computed, not guessed."

**Panel 4: Validate**
- Visual: An engineering checklist **stamping** pass marks. One item flashes yellow (warning).
- Label: "04 — VALIDATE"
- Title: "Engineering Validates Safety"
- Body: "Structural checks, code compliance, geometry validation. Unsafe designs are rejected, not ranked."

**Panel 5: Compare**
- Visual: Three cards **fanning out** like playing cards. Scores appear.
- Label: "05 — COMPARE"
- Title: "Procurement Compares Reality"
- Body: "Material costs, supplier links, availability. The design must be buildable, not just theoretical."

**Panel 6: Recommend**
- Visual: A single shelter **emerging from a glow**, surrounded by truth badges.
- Label: "06 — RECOMMEND"
- Title: "Evidence-Based Decision"
- Body: "One recommended design. One explanation of why it won. Full provenance for every claim."

### Horizontal Scroll Implementation
```javascript
gsap.to(".pipeline-container", {
  x: () => -(document.querySelector(".pipeline-container").scrollWidth - window.innerWidth),
  ease: "none",
  scrollTrigger: {
    trigger: ".pipeline-section",
    pin: true,
    scrub: 1,
    end: () => "+=" + document.querySelector(".pipeline-container").scrollWidth
  }
});
```

---

## Section 4: Location Deep-Dive — Choose Your Climate

### Layout
Full viewport. Three large cards, each taking 1/3 width. On hover, hovered card expands to 50%, others shrink to 25%.

### Cards

**Card 1: Leh, Ladakh**
- Background video: Snow mountains, slow pan
- Overlay gradient: Cyan to transparent
- Title: "Extreme Cold"
- Subtitle: "-20°C winters · High altitude · Snow load"
- Stats: Avg winter low, peak solar hours, wind load
- Button: "Explore Leh Designs" (secondary style)

**Card 2: Jaipur, Rajasthan**
- Background video: Desert heat, dust shimmer
- Overlay gradient: Amber to transparent
- Title: "Hot Arid"
- Subtitle: "45°C summers · Low humidity · Thermal mass critical"
- Stats: Avg summer high, cooling degree days, solar exposure
- Button: "Explore Jaipur Designs"

**Card 3: Shimla, Himachal**
- Background video: Misty green valleys
- Overlay gradient: Emerald to transparent
- Title: "Temperate Mountain"
- Subtitle: "Mixed climate · Significant snowfall · Moderate humidity"
- Stats: Annual rainfall, freeze-thaw cycles, solar potential
- Button: "Explore Shimla Designs"

### Card Hover Animation
```css
.location-card {
  flex: 1;
  transition: flex 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.location-card:hover {
  flex: 2;
}
.location-card:hover ~ .location-card,
.location-card:has(~ .location-card:hover) {
  flex: 0.5;
}
```

On hover:
- Background video **speeds up** slightly (1x → 1.2x)
- Title **scales up** (`1 → 1.1`)
- Stats **slide up** from below (`y: 20 → 0`, `opacity: 0 → 1`)
- A **glow border** appears matching the location accent color

### Click Behavior
Clicking a card:
1. Card **expands to full screen** (`scale: 1 → 1.5`, covering viewport)
2. Background video **takes over** full screen
3. Content **fades out**
4. Transition to **Dashboard App** with that location pre-selected

---

## Section 5: Archetypes — Shelter Types

### Layout
Vertical scroll. Cards stack with **parallax depth**.

### Cards (5 archetypes)

Each card is **full-width**, ~60vh height, with:
- Left: Large image or 3D render of archetype
- Right: Description and key specs
- Background: Subtle gradient based on climate suitability

**Archetypes:**
1. **Emergency Rapid-Deployment** — "Deploy in 24 hours. Survive any climate."
2. **Residential Passive House** — "Zero-energy comfort through design intelligence."
3. **Duplex Family Home** — "Multi-level living, climate-optimized."
4. **Community Center** — "Shared spaces, engineered for occupancy and weather."
5. **Medical Station** — "Hygiene, ventilation, and thermal stability for care."

### Scroll Animation
- Cards enter with **3D rotation**: `rotateX: 15deg → 0`, `y: 100 → 0`, `opacity: 0 → 1`
- Staggered by scroll position — each card triggers when it reaches 80% viewport
- Images have **parallax** within their container (`y: -50 → 50` relative to scroll)

---

## Section 6: Technology — The Truth Hierarchy

### Layout
Dark section (solid `#0a0e17`, no video). Centered content.

### Content

**Label:** "OUR APPROACH"
**Title:** "AI Proposes. Physics Proves. Engineering Validates."

**Truth Hierarchy Visualization:**
A vertical stack of 4 layers, each a **glassmorphism card**:

1. **AI Layer** (top) — Purple glow
   - "Generative Design Exploration"
   - "Candidates, not conclusions"

2. **Physics Layer** — Blue glow
   - "48-Hour Transient Simulation"
   - "Heat transfer, solar gain, comfort modeling"

3. **Engineering Layer** — Red glow
   - "Constraint Validation"
   - "NBC/IS-aligned structural checks"

4. **Evidence Layer** (bottom) — Green glow
   - "Transparent Provenance"
   - "Every number has a source"

**Animation:**
- Cards **stack** on top of each other initially
- On scroll, they **spread apart vertically** like a deck of cards being fanned
- Each card has a **glow pulse** matching its color
- Connecting lines **draw themselves** between layers (SVG path animation)

**Badge Showcase:**
Below the stack, show all 5 truth badges at full size with explanations:
- PHYSICS VERIFIED
- ENGINEERING VALIDATED
- OBSERVED PRICE
- ESTIMATED
- REGIONAL WEATHER PROXY

---

## Section 7: CTA — Start Designing

### Layout
Full viewport. Background returns to the selected location video (or default if none selected).

### Content

**Title:** "Your Climate. Your Shelter. Your Evidence."
- Animation: **Character-by-character typewriter** with a blinking cursor

**Subtitle:** "Join teams designing shelters that survive their environments."

**Buttons:**
- Primary: "Get Started Free" — Pitch black, same water drop ripple effect as hero
- Secondary: "View Demo" — Transparent with white border, plays a 30-second demo video in a modal

**Trust Bar (below buttons):**
- "Trusted by DRDO · SIH 2026 Finalist · Open Source"
- Logos / badges in a horizontal row, grayscale, opacity 0.5

### Background Effect
- A **large, slow-moving gradient orb** (400px) floats behind the content, color matching selected location accent
- Orb has `filter: blur(100px)` and `opacity: 0.3`
- On location change, orb **morphs color** over 1s

---

## Section 8: Footer

### Layout
Compact, dark, professional.

### Content
- Left: ThermoShelter logo + tagline
- Center: Links — GitHub, Documentation, Contact
- Right: "Built for SIH 2026 · Team Celestials"
- Bottom: "ThermoShelter is a decision-support platform. It does not replace professional engineering certification."

---

## Global Interactions & Micro-Animations

### Fluid Buttons (All Buttons)
Every button on the page uses this interaction model:

```css
.btn-fluid {
  position: relative;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s ease;
}

.btn-fluid::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 55%, transparent 60%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.btn-fluid:hover::before {
  transform: translateX(100%);
}

.btn-fluid:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
}

.btn-fluid:active {
  transform: translateY(0) scale(0.98);
}
```

### Magnetic Cursor Effect (Optional, Desktop Only)
Buttons subtly attract toward the cursor within a 50px radius:

```typescript
const handleMouseMove = (e: MouseEvent, btn: HTMLElement) => {
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;
  const distance = Math.sqrt(x * x + y * y);
  
  if (distance < 50) {
    const strength = (50 - distance) / 50;
    btn.style.transform = `translate(${x * strength * 0.3}px, ${y * strength * 0.3}px)`;
  }
};
```

### Scroll-Triggered Text Reveals
All section titles use this pattern:

```tsx
<motion.h2
  initial={{ opacity: 0, y: 60 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
>
```

### Parallax Layers
Background video moves at 0.3x scroll speed. Content moves at 1x. Decorative particles move at 0.5x.

```javascript
gsap.to(".bg-video", {
  yPercent: 30,
  ease: "none",
  scrollTrigger: {
    trigger: "body",
    start: "top top",
    end: "bottom bottom",
    scrub: true
  }
});
```

---

## Page Connections & Navigation Flow

### Landing Page → App

| From | Action | To | Transition |
|------|--------|-----|------------|
| Hero "Get Started" | Click | Location Selector Modal | Full-screen ripple from button, modal slides up |
| Location Card (Section 4) | Click | Dashboard with location pre-selected | Card expands to fill screen, video cross-fades to app background |
| "Explore [Location] Designs" | Click | Dashboard → Archetype Selection | Same as above, plus archetype filter applied |
| "View Demo" (CTA) | Click | Demo Video Modal | Modal fades in with backdrop blur |
| Nav "Get Started" | Click | Hero scroll + button pulse | Smooth scroll to hero, button glows |

### App → Landing Page
- App header has "ThermoShelter" logo. Clicking it returns to landing page with **reverse ripple** transition.
- Browser back button works naturally (React Router `history.push`).

---

## Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.5s |
| Video preload | First location video only |
| Other videos | Lazy-loaded, fetched on location hover |
| Animation frame rate | 60fps minimum |
| Total JS bundle | < 200KB gzipped |

**Optimization:**
- Use `video preload="metadata"` initially, switch to `preload="auto"` on location select
- Compress videos to 720p for mobile, 1080p for desktop
- Use `loading="lazy"` on all below-fold images
- Code-split Three.js — only load when user reaches 3D section

---

## Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| Desktop (>1200px) | Full horizontal layouts, 3D effects active, video 1080p |
| Tablet (768-1200px) | Stacked layouts, reduced parallax, video 720p |
| Mobile (<768px) | Single column, touch-optimized buttons, video replaced with high-quality static image + subtle CSS animation, horizontal scroll sections become vertical swipe |

---

## Copy Text Master List

### Hero
- Title: "Design Shelters That Survive Their Climate"
- Subtitle: "AI-assisted, physics-validated, engineering-guaranteed shelter design for any environment."
- CTA: "Get Started"
- Scroll hint: "Scroll to explore"

### Problem Section
- Label: "THE PROBLEM"
- Title: "A Shelter That Looks Right Can Still Fail"
- Body: "Generic shelter designs are reused across deserts, mountains, and coastlines without rigorous thermal validation. The result? Structures that overheat in Rajasthan, freeze in Ladakh, or waste energy everywhere."
- Stat 1: "68%" / "Of shelters in high-altitude regions suffer from thermal inefficiency"
- Stat 2: "2.4L" / "Average wasted cost per shelter due to poor climate adaptation"
- Stat 3: "48h" / "Our simulation horizon for transient thermal analysis"

### Pipeline Section
- Step 1: "Describe Your Need" / "Natural language, simple parameters, or detailed specifications. Our LLM understands intent."
- Step 2: "AI Proposes Candidates" / "Multiple archetypes explored. Each candidate is a complete design, not a sketch."
- Step 3: "Physics Proves Performance" / "48-hour transient thermal simulation. Heat transfer, solar gain, infiltration — computed, not guessed."
- Step 4: "Engineering Validates Safety" / "Structural checks, code compliance, geometry validation. Unsafe designs are rejected, not ranked."
- Step 5: "Procurement Compares Reality" / "Material costs, supplier links, availability. The design must be buildable, not just theoretical."
- Step 6: "Evidence-Based Decision" / "One recommended design. One explanation of why it won. Full provenance for every claim."

### Location Cards
- Leh: "Extreme Cold" / "-20°C winters · High altitude · Snow load"
- Jaipur: "Hot Arid" / "45°C summers · Low humidity · Thermal mass critical"
- Shimla: "Temperate Mountain" / "Mixed climate · Significant snowfall · Moderate humidity"

### CTA Section
- Title: "Your Climate. Your Shelter. Your Evidence."
- Subtitle: "Join teams designing shelters that survive their environments."
- Primary: "Get Started Free"
- Secondary: "View Demo"

### Footer
- Disclaimer: "ThermoShelter is a decision-support platform. It does not replace professional engineering certification."

---

## The "Judge Jaw-Drop" Landing Page Checklist

- [ ] Background video plays smoothly, cross-fades on location change
- [ ] Water drop ripple effect works on every click
- [ ] Get Started button has pitch-black background with white glow
- [ ] Hero title reveals word-by-word on load
- [ ] Climate data orb floats and updates on location change
- [ ] Scroll indicator bounces until user scrolls
- [ ] Problem section pins and reveals with scroll
- [ ] Pipeline section scrolls horizontally as user scrolls vertically
- [ ] Location cards expand/contract on hover with video speed change
- [ ] Archetype cards enter with 3D rotation
- [ ] Truth hierarchy cards fan out like a deck
- [ ] CTA section has typewriter title effect
- [ ] All buttons have fluid shine effect on hover
- [ ] Magnetic cursor effect on desktop (optional but impressive)
- [ ] Entire page runs at 60fps
- [ ] Mobile version is functional with reduced but smooth animations

---

**End of Landing Page Prompt. This is a complete specification for building a cinematic, immersive, climate-aware landing page that connects seamlessly to the ThermoShelter application.**

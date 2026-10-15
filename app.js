(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#${name}"/></svg>`;
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const PHONE = '+13854823995';
  const EMAIL = 'hello@muirwebco.com';
  const sms = message => `sms:${PHONE}?&body=${encodeURIComponent(message)}`;
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  let mode = document.documentElement.dataset.mode === 'trade' ? 'trade' : 'agent';
  let toastTimer;
  const notify = message => {
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
  };

  const properties = [
    { id: 'ridge', name: 'The Ridgeline', location: 'Alpine, Utah · Concept residence', price: 2450000, beds: 5, baths: 4, sqft: 4200, style: 'mountain', label: 'MOUNTAIN MODERN', image: '/assets/hero-home.webp', position: '65% center', alt: 'Architectural concept of a contemporary stone and glass home at dusk',
      description: 'A study in quiet confidence. Warm stone, expansive glass, and spaces that open to the evening light. A sample property designed to show what a memorable listing experience can feel like.',
      features: { architecture: 'Low horizontal lines, limestone textures, and dark bronze frames create a distinctly contemporary silhouette.', living: 'The gallery explores a complementary interior concept: warm oak, an inviting fireplace, and room to slow down.', outside: 'An architectural reflecting pool and native planting create a considered transition from the home to its surroundings.' } },
    { id: 'courtyard', name: 'The Courtyard', location: 'Holladay, Utah · Concept residence', price: 1785000, beds: 4, baths: 3, sqft: 3100, style: 'courtyard', label: 'COURTYARD LIVING', image: '/assets/courtyard.webp', position: 'center', alt: 'Architectural concept of a warm limestone home around a planted courtyard',
      description: 'A home that brings the outside in. Natural textures, a sheltered courtyard, and light that shifts through every room. This illustrative residence is made for exploring.',
      features: { architecture: 'A sheltered central courtyard connects the living spaces, framed by cedar overhangs and pale stone.', living: 'Open spaces, thoughtful sightlines, and warm materials make the house feel inviting rather than imposing.', outside: 'A sculptural tree, native grasses, and gravel paths bring life to the sheltered outdoor rooms.' } },
    { id: 'retreat', name: 'The Quiet Retreat', location: 'Draper, Utah · Concept residence', price: 1295000, beds: 3, baths: 2, sqft: 2450, style: 'mountain', label: 'DESIGNED TO EXHALE', image: '/assets/interior.webp', position: 'center', alt: 'Interior concept of a quiet modern living room with mountain views',
      description: 'Mountain views, soft textures, and a slower pace. A more intimate interpretation of modern living. Sample details demonstrate how your listings could tell a richer story.',
      features: { architecture: 'Floor-to-ceiling glazing and a strong limestone fireplace anchor an open, understated living space.', living: 'Ivory upholstery, oak flooring, and walnut accents make the room feel as comfortable as it looks.', outside: 'An open terrace extends the living room toward the mountain backdrop. This is concept imagery, not a surveyed location.' } }
  ];
  const validIds = new Set(properties.map(p => p.id));
  const storedSaved = read('mwc-saved', []);
  const saved = new Set(Array.isArray(storedSaved) ? storedSaved.filter(id => validIds.has(id)) : []);
  let filter = 'all', savedOnly = false, currentProperty = null, galleryIndex = 0, dialogOpener = null, contactAfterClose = false;
  const dialog = $('#propertyDialog');
  const facts = p => `<span>${p.beds} BEDS</span><span>${p.baths} BATHS</span><span>${p.sqft.toLocaleString('en-US')} SQ FT</span>`;

  function renderProperties() {
    const max = $('#priceFilter').value;
    const visible = properties.filter(p => (filter === 'all' || p.style === filter) && (max === 'all' || p.price < Number(max)) && (!savedOnly || saved.has(p.id)));
    $('#propertyGrid').innerHTML = visible.map(p => `<article class="property-card" data-property="${p.id}">
      <button class="property-image" type="button" data-open="${p.id}" aria-label="Explore ${p.name}"><img src="${p.image}" alt="${p.alt}" width="1200" height="900" loading="lazy" decoding="async" style="object-position:${p.position}"><span class="property-badge">${p.label}</span><span class="view-label">Explore residence ${icon('diagonal')}</span></button>
      <button class="property-save" type="button" data-save="${p.id}" aria-label="${saved.has(p.id) ? 'Unsave' : 'Save'} ${p.name}" aria-pressed="${saved.has(p.id)}">${icon('heart')}</button>
      <div class="property-card-heading"><h3>${p.name}</h3><span>${money(p.price)}</span></div><p class="property-location">${icon('pin')}${p.location}</p><div class="property-facts">${facts(p)}</div></article>`).join('');
    $('#propertyEmpty').hidden = visible.length > 0;
    $('#propertyStatus').textContent = `${visible.length} ${visible.length === 1 ? 'property' : 'properties'} shown`;
    $('#savedCount').textContent = saved.size;
    $('#savedFilter').setAttribute('aria-pressed', String(savedOnly));
    $$('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  }
  function updateSaveButton(button, p) {
    const isSaved = saved.has(p.id);
    button.setAttribute('aria-pressed', String(isSaved));
    button.setAttribute('aria-label', `${isSaved ? 'Unsave' : 'Save'} ${p.name}`);
  }
  function toggleSave(id, button) {
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    write('mwc-saved', [...saved]);
    const p = properties.find(item => item.id === id);
    $('#savedCount').textContent = saved.size;
    if (button) updateSaveButton(button, p);
    const cardButton = $(`[data-save="${id}"]`);
    if (cardButton) updateSaveButton(cardButton, p);
    if (currentProperty?.id === id) updateSaveButton($('#dialogSave'), p);
    notify(saved.has(id) ? `${p.name} added to your collection` : `${p.name} removed from your collection`);
    if (savedOnly && !dialog.open) {
      renderProperties();
      ($('#propertyGrid [data-save]') || $('#savedFilter')).focus({ preventScroll: true });
    }
  }
  $('#propertyGrid').addEventListener('click', e => {
    const saveButton = e.target.closest('[data-save]');
    const openButton = e.target.closest('[data-open]');
    if (saveButton) toggleSave(saveButton.dataset.save, saveButton);
    if (openButton) openProperty(openButton.dataset.open, openButton);
  });
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; renderProperties(); }));
  $('#priceFilter').addEventListener('change', renderProperties);
  $('#savedFilter').addEventListener('click', () => { savedOnly = !savedOnly; renderProperties(); });
  $('#resetFilters').addEventListener('click', () => { filter = 'all'; savedOnly = false; $('#priceFilter').value = 'all'; renderProperties(); $('[data-filter="all"]').focus(); });

  function renderGallery() {
    // Alternative images are complementary design concepts, not verified photos of the same real property.
    const images = currentProperty.id === 'retreat'
      ? [{ src: currentProperty.image, alt: currentProperty.alt }, { src: '/assets/courtyard.webp', alt: 'Complementary courtyard design inspiration, not an additional photo of a real listing' }]
      : [{ src: currentProperty.image, alt: currentProperty.alt }, { src: '/assets/interior.webp', alt: 'Complementary interior design inspiration, not an additional photo of a real listing' }];
    $('#dialogImage').src = images[galleryIndex].src;
    $('#dialogImage').alt = images[galleryIndex].alt;
    $('#dialogImage').style.objectPosition = galleryIndex === 0 ? currentProperty.position : 'center';
    $('#galleryCount').textContent = `${galleryIndex + 1} / ${images.length}${galleryIndex ? ' · Design inspiration' : ''}`;
  }
  function setDetail(detail) {
    $$('[data-detail]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.detail === detail)));
    $('#featureDetail').textContent = currentProperty.features[detail];
  }
  function openProperty(id, opener) {
    currentProperty = properties.find(p => p.id === id);
    if (!currentProperty) return;
    dialogOpener = opener || $('#sceneHotspot');
    galleryIndex = 0;
    $('#dialogTitle').textContent = currentProperty.name;
    $('#dialogLocation').textContent = currentProperty.location;
    $('#dialogPrice').textContent = money(currentProperty.price);
    $('#dialogFacts').innerHTML = facts(currentProperty);
    $('#dialogDescription').textContent = currentProperty.description;
    updateSaveButton($('#dialogSave'), currentProperty);
    renderGallery(); setDetail('architecture');
    dialog.showModal();
    dialog.scrollTop = 0;
    $('#dialogClose').focus({ preventScroll: true });
  }
  $('#dialogClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (savedOnly) renderProperties();
    if (contactAfterClose) {
      contactAfterClose = false;
      $('#f-name').focus({ preventScroll: true });
      return;
    }
    const fallback = dialogOpener?.dataset.open ? $(`[data-open="${dialogOpener.dataset.open}"]`) : dialogOpener;
    (fallback || $('#savedFilter')).focus({ preventScroll: true });
  });
  dialog.addEventListener('keydown', e => {
    if (e.target.matches('button,a,input,select,textarea') && !['galleryPrev', 'galleryNext', 'dialogClose'].includes(e.target.id)) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); galleryIndex = 1 - galleryIndex; renderGallery(); }
  });
  $('#galleryPrev').addEventListener('click', () => { galleryIndex = 1 - galleryIndex; renderGallery(); });
  $('#galleryNext').addEventListener('click', () => { galleryIndex = 1 - galleryIndex; renderGallery(); });
  $('#dialogSave').addEventListener('click', () => toggleSave(currentProperty.id, $('#dialogSave')));
  $$('[data-detail]').forEach(button => button.addEventListener('click', () => setDetail(button.dataset.detail)));
  $('#dialogCta').addEventListener('click', () => {
    contactAfterClose = true;
    dialog.close();
    $('#f-msg').value = `I'd love an interactive property experience like ${currentProperty.name} for my own listings.`;
    $('#requestHandoff').hidden = true;
    $('#formStatus').textContent = '';
  });

  const copy = {
    agent: {
      hero: "You make a living helping people find their place.<br>Let's make your website a place they remember.",
      sceneLabel: 'A DIFFERENT KIND OF PROPERTY EXPERIENCE', sceneTitle: 'A place to<br>call extraordinary.', sceneMeta: 'THE PROPERTY COLLECTION', sceneFooter: 'Thoughtfully built. Beautifully lived.',
      experienceIntro: 'A property search that feels like discovery.<br>Go ahead. Find your kind of extraordinary.', pricingFor: 'FOR THE AGENTS BUILDING THEIR OWN NAME.'
    },
    trade: {
      hero: "You build things that last. Your website should show it.<br>Let's give your craftsmanship the presence it deserves.",
      sceneLabel: 'CRAFTSMANSHIP YOU CAN FEEL', sceneTitle: 'Built with pride.<br>Shown with purpose.', sceneMeta: 'THE TRANSFORMATION COLLECTION', sceneFooter: 'From what was. To what could be.',
      experienceIntro: 'Your work makes a visible difference.<br>Let your next customer see it for themselves.', pricingFor: 'FOR THE PEOPLE WHO BUILD THE REAL WORLD.'
    }
  };
  const pricing = {
    agent: [
      { label: 'THE FOUNDATION', name: 'Agent Site', amount: 1500, period: 'One time. Flat price.', items: ['Custom site built around your brand', 'Featured listings you can update', 'SEO pages for the cities you work', 'Google Business & reviews wiring', 'Two revision rounds included'], action: 'Start with a free mockup' },
      { label: 'THE FULL EXPERIENCE', name: 'Agent Site + IDX', amount: 2000, period: 'One time. IDX subscription separate.', items: ['Everything in Agent Site', 'Live MLS search on your own site', 'Buyer search & saved properties', 'Showing & information requests', 'IDX setup handled for you'], action: "Let's build something great", featured: true },
      { label: 'THE ONGOING SUPPORT', name: 'Keep It Running', amount: 70, period: 'Per month. Cancel anytime.', items: ['Hosting, security & backups', 'Small edits: listings, photos & bio', 'Lead & showing alerts covered', 'Monthly website check-in', 'One person. A text away.'], action: 'Ask me about it' }
    ],
    trade: [
      { label: 'THE FOUNDATION', name: 'The Site', amount: 1500, period: 'One time. Flat price.', items: ['Custom website for your trade', 'Mobile-first, with tap-to-call', 'Projects, reviews & service area', 'Google Business profile wiring', 'Two revision rounds included'], action: 'Start with a free mockup' },
      { label: 'THE FULL EXPERIENCE', name: 'Site + Smart Leads', amount: 2500, period: 'One time. Flat price.', items: ['Everything in The Site', 'AI-assisted lead qualification', 'Project details before you call', 'Lead alerts to phone & email', 'An emergency lane for urgent jobs'], action: "Let's build something great", featured: true },
      { label: 'THE ONGOING SUPPORT', name: 'Keep It Running', amount: 149, period: 'Per month. Cancel anytime.', items: ['Hosting, security & backups', 'Small edits: projects, prices & crew', 'AI features & lead alerts covered', 'Monthly website check-in', 'One person. A text away.'], action: 'Ask me about it' }
    ]
  };
  const calcConfig = {
    agent: { label1: 'Average commission per closing', label2: 'Additional closings per year', min: 2000, max: 30000, step: 500, initial: 8000, n: 2, maxN: 12, cost: 2000 + 70 * 12, unit: 'closing', plural: 'closings' },
    trade: { label1: 'Average revenue per project', label2: 'Additional projects per year', min: 500, max: 30000, step: 500, initial: 4500, n: 3, maxN: 24, cost: 2500 + 149 * 12, unit: 'project', plural: 'projects' }
  };
  const calcState = { agent: [8000, 2], trade: [4500, 3] };
  function renderCalc(reset = false) {
    const config = calcConfig[mode];
    if (reset) {
      $('#calcValLabel').textContent = config.label1; $('#calcNumLabel').textContent = config.label2;
      Object.assign($('#calcVal'), { min: config.min, max: config.max, step: config.step, value: calcState[mode][0] });
      Object.assign($('#calcNum'), { min: 1, max: config.maxN, step: 1, value: calcState[mode][1] });
    }
    const value = Number($('#calcVal').value), count = Number($('#calcNum').value);
    calcState[mode] = [value, count];
    $('#calcValOut').textContent = money(value); $('#calcNumOut').textContent = count;
    $('#calcBig').textContent = money(value * count);
    const needed = Math.ceil(config.cost / value);
    $('#calcLine').textContent = `${needed === 1 ? 'One additional ' + config.unit : needed + ' additional ' + config.plural} could cover the first-year website cost in revenue.`;
    $('#calcFine').textContent = `First-year website cost: ${money(config.cost)} for ${mode === 'agent' ? 'Agent Site + IDX and care; IDX subscription extra' : 'Site + Smart Leads and care'}. Illustration only. Revenue is before business expenses, taxes, and any splits; this is not a profit or lead guarantee.`;
  }
  $('#calcVal').addEventListener('input', () => renderCalc());
  $('#calcNum').addEventListener('input', () => renderCalc());
  let tradeTouched = false;
  $('#f-trade').addEventListener('change', () => { tradeTouched = true; });
  function applyMode(next, user = false) {
    mode = next;
    document.documentElement.dataset.mode = mode;
    document.body.dataset.mode = mode;
    $$('[data-set-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setMode === mode)));
    $$('[data-copy]').forEach(element => { element.innerHTML = copy[mode][element.dataset.copy]; });
    $('#propertyExperience').hidden = mode !== 'agent'; $('#tradeExperience').hidden = mode !== 'trade';
    $('#scenePhoto').style.backgroundImage = `url('/assets/${mode === 'agent' ? 'hero-home' : 'renovation'}.webp')`;
    $('#scenePhoto').style.backgroundSize = mode === 'agent' ? 'cover' : '200% 100%';
    $('#scenePhoto').style.backgroundPosition = mode === 'agent' ? '65% center' : '100% center';
    $('#sceneNumber').textContent = mode === 'agent' ? 'MW—01' : 'MW—02';
    $('#stageCount').textContent = mode === 'agent' ? '01 / 02' : '02 / 02';
    $('#pricingSwitch').textContent = mode === 'agent' ? 'See tradesman pricing ↗' : 'See realtor pricing ↗';
    $('#pricingGrid').innerHTML = pricing[mode].map(p => `<article class="price-card${p.featured ? ' featured' : ''}">${p.featured ? '<span class="price-featured-label">THE MOST POPULAR CHOICE</span>' : ''}<span class="price-type">${p.label}</span><h3>${p.name}</h3><strong class="price-amount">${money(p.amount)}</strong><p class="price-period">${p.period}</p><ul>${p.items.map(item => `<li>${icon('check')}${item}</li>`).join('')}</ul><a class="button ${p.featured ? 'button-accent' : 'button-outline'}" href="${sms(`Hey Cash, I'm interested in ${p.name} for my ${mode === 'agent' ? 'real estate' : 'trade'} business. Can we talk?`)}">${p.action} ${icon('diagonal')}</a></article>`).join('');
    $('#pricingFootnote').textContent = mode === 'agent' ? 'About IDX: live MLS access requires broker approval and a separate IDX Broker subscription, billed directly by the provider. The property explorer above is a concept demo and does not connect to an MLS.' : 'Smart Leads is a service package, not a live AI demo on this page. Scope, integrations, and any third-party costs are agreed before work begins. Already have a site that just needs fixing? Let’s talk about that, too.';
    $('#industryQuestion').textContent = mode === 'agent' ? 'What about live MLS listings?' : 'How does the quote assistant work?';
    $('#industryAnswer').textContent = mode === 'agent' ? "The property explorer above uses illustrative content. For live MLS search, the IDX package needs your broker's approval and an IDX Broker subscription, billed separately." : 'A guided assistant can ask about the job, location, timeline, and urgency so your first conversation starts with useful details. It helps qualify a request; a final price still comes from you. We agree the workflow before building it.';
    if (!tradeTouched) $('#f-trade').value = mode === 'agent' ? 'Real estate agent' : 'Roofing';
    document.title = `Muir Web Co. — Websites for Utah ${mode === 'agent' ? 'Realtors' : 'Tradesmen'}`;
    $('meta[name="theme-color"]').content = mode === 'agent' ? '#101211' : '#141310';
    renderCalc(true);
    if (user) {
      try { localStorage.setItem('mwc-mode', mode); } catch {}
      const url = new URL(location.href);
      url.pathname = '/'; url.searchParams.set('for', mode === 'agent' ? 'realtors' : 'contractors');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      notify(mode === 'agent' ? 'Welcome to the realtor experience' : 'Welcome to the tradesman experience');
    }
  }
  function switchMode(next) {
    if (next === mode) return;
    // View Transitions enhance the switch without becoming a requirement.
    if (document.startViewTransition && !reducedMotion.matches) document.startViewTransition(() => applyMode(next, true));
    else applyMode(next, true);
  }
  $$('[data-set-mode]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.setMode)));
  $('#pricingSwitch').addEventListener('click', () => switchMode(mode === 'agent' ? 'trade' : 'agent'));
  $('#sceneHotspot').addEventListener('click', () => {
    if (mode === 'agent') openProperty('ridge', $('#sceneHotspot'));
    else $('#experience').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  const projects = {
    exterior: { image: 'renovation', title: 'Same address.<br>Entirely new feeling.', description: "When your craftsmanship makes this much of a difference, a tiny photo gallery doesn't do it justice.", materials: 'Limewashed brick · Cedar accents · Native planting', label: 'home exterior' },
    landscape: { image: 'landscape', title: 'Unused space.<br>Unlimited possibility.', description: 'Show the vision, the details, and the transformation. Help a customer picture what their own backyard could become.', materials: 'Limestone pavers · Timber pergola · Layered planting', label: 'outdoor living space' }
  };
  $$('[data-project]').forEach(button => button.addEventListener('click', () => {
    const project = projects[button.dataset.project];
    $$('[data-project]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('#projectTitle').innerHTML = project.title; $('#projectDescription').textContent = project.description; $('#projectMaterials').textContent = project.materials;
    $('#comparisonBefore').style.backgroundImage = $('#comparisonAfter').style.backgroundImage = `url('/assets/${project.image}.webp')`;
    $('#comparisonBefore').setAttribute('aria-label', `Illustrative ${project.label} before transformation`);
    $('#comparisonAfter').setAttribute('aria-label', `Illustrative ${project.label} after transformation`);
    $('#comparisonRange').value = 50; updateComparison();
  }));
  function updateComparison() {
    const value = Number($('#comparisonRange').value);
    $('#comparison').style.setProperty('--split', `${value}%`);
    $('#comparisonRange').setAttribute('aria-valuetext', `${value} percent before, ${100 - value} percent after`);
  }
  $('#comparisonRange').addEventListener('input', updateComparison);

  $$('[data-sms]').forEach(link => { link.href = sms(link.dataset.sms); });
  const form = $('#leadForm');
  function invalidate(element, message) {
    $('#formStatus').textContent = message; $('#formStatus').className = 'form-status error';
    element.setAttribute('aria-invalid', 'true'); element.setAttribute('aria-describedby', 'formStatus'); element.focus();
  }
  form.addEventListener('input', () => {
    $('#requestHandoff').hidden = true;
    $('#formStatus').textContent = '';
    $$('[aria-invalid]', form).forEach(el => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (form.elements.website.value) return;
    $('#requestHandoff').hidden = true;
    const name = form.elements.name.value.trim(), phone = form.elements.phone.value.trim(), company = form.elements.company.value.trim(), trade = form.elements.trade.value, message = form.elements.message.value.trim();
    if (!name) return invalidate($('#f-name'), 'Add your name so I know who to get back to.');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return invalidate($('#f-phone'), 'Add a phone number with 10 to 15 digits so I can get back to you.');
    const request = `Hi Cash, I'm ${name}${company ? ' from ' + company : ''}.\nBusiness: ${trade}\nPhone: ${phone}\n\n${message || "I'd like a free homepage mockup."}`;
    $('#requestSms').href = sms(request);
    $('#requestEmail').href = `mailto:${EMAIL}?subject=${encodeURIComponent(`Website request: ${name}`)}&body=${encodeURIComponent(request)}`;
    $('#formStatus').textContent = 'Prepared. Your request has not been sent yet.'; $('#formStatus').className = 'form-status';
    $('#requestHandoff').hidden = false;
    $('#requestSms').focus({ preventScroll: true });
    $('#requestHandoff').scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
  });

  const stage = $('#heroStage'), card = $('#sceneCard');
  const pointerFine = matchMedia('(hover: hover) and (pointer: fine)');
  let pointerFrame = 0;
  stage.addEventListener('pointermove', e => {
    if (reducedMotion.matches || !pointerFine.matches) return;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      const box = stage.getBoundingClientRect();
      const x = (e.clientX - box.left) / box.width - .5, y = (e.clientY - box.top) / box.height - .5;
      card.style.transform = `rotateY(${x * 8 - 4}deg) rotateX(${-y * 5 + 2}deg) rotateZ(1deg)`;
    });
  });
  stage.addEventListener('pointerleave', () => { cancelAnimationFrame(pointerFrame); card.style.transform = ''; });
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    $$('.section-heading,.case-study,.process-grid>li,.contact-copy').forEach(el => { el.classList.add('reveal'); observer.observe(el); });
  }
  $('#year').textContent = new Date().getFullYear();
  renderProperties(); applyMode(mode); updateComparison();
})();

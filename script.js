/* AWARA v6 — vanilla JS: tilt + light, magnetic, ripple, dock, chips, lightbox, sheet, reveals. */
(function(){
  var doc = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $(s, r){ return (r || document).querySelector(s); }
  function $$(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function vib(n){ try { if (navigator.vibrate) navigator.vibrate(n); } catch(e){} }

  /* ---- press ripple + haptic tick ---- */
  document.addEventListener('pointerdown', function(e){
    var t = e.target.closest && e.target.closest('.btn, .chip, .reel-card, .dock__link, .brand');
    if (!t) return;
    if (t.matches('.btn, .chip')) vib(6);
    if (reduce) return;
    var r = t.getBoundingClientRect();
    var s = document.createElement('span');
    var size = Math.max(r.width, r.height) * 1.6;
    s.className = 'ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top = (e.clientY - r.top - size / 2) + 'px';
    t.appendChild(s);
    s.addEventListener('animationend', function(){ s.remove(); });
  }, { passive: true });

  /* ---- tilt + moving light (mouse hover, finger press on touch) ---- */
  function tiltAt(el, e){
    var r = el.getBoundingClientRect();
    var x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    var y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    var k = parseFloat(el.getAttribute('data-tilt') || '1');
    el.style.setProperty('--rx', ((0.5 - y) * 7 * k).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((x - 0.5) * 9 * k).toFixed(2) + 'deg');
    el.style.setProperty('--lx', (x * 100).toFixed(1) + '%');
    el.style.setProperty('--ly', (y * 100).toFixed(1) + '%');
    el.classList.add('is-lit');
  }
  function tiltReset(el){
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.classList.remove('is-lit');
  }
  if (!reduce){
    $$('.tilt').forEach(function(el){
      el.addEventListener('pointermove', function(e){ if (e.pointerType === 'mouse') tiltAt(el, e); });
      el.addEventListener('pointerleave', function(){ tiltReset(el); });
      el.addEventListener('pointerdown', function(e){ if (e.pointerType !== 'mouse') tiltAt(el, e); });
      el.addEventListener('pointerup', function(){ tiltReset(el); });
      el.addEventListener('pointercancel', function(){ tiltReset(el); });
    });
  }

  /* ---- magnetic primary buttons (mouse only) ---- */
  if (fine && !reduce){
    $$('.btn--primary').forEach(function(b){
      b.addEventListener('pointermove', function(e){
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.setProperty('--mx', (dx * 12).toFixed(1) + 'px');
        b.style.setProperty('--my', (dy * 8).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function(){
        b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---- reveals (stagger by sibling index; drop the delay once in, so tilt stays snappy) ---- */
  var revs = $$('.reveal');
  function revealEl(el){
    var sibs = $$('.reveal', el.parentElement).filter(function(c){ return c.parentElement === el.parentElement; });
    var i = Math.max(0, sibs.indexOf(el));
    el.style.setProperty('--d', Math.min(i, 6) * 80 + 'ms');
    el.classList.add('in');
    el.addEventListener('transitionend', function done(ev){
      if (ev.propertyName !== 'opacity') return;
      el.style.setProperty('--d', '0ms');
      el.removeEventListener('transitionend', done);
    });
  }
  if ('IntersectionObserver' in window && !reduce){
    var rio = new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        if (en.isIntersecting){ revealEl(en.target); rio.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revs.forEach(function(el){ rio.observe(el); });
  } else {
    revs.forEach(function(el){ el.classList.add('in'); });
  }

  /* ---- videos: play only while on screen ---- */
  var vids = $$('video[data-auto]');
  if ('IntersectionObserver' in window){
    var vio = new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        var v = en.target;
        if (en.isIntersecting){ var p = v.play(); if (p && p.catch) p.catch(function(){}); }
        else v.pause();
      });
    }, { threshold: 0.25 });
    vids.forEach(function(v){ vio.observe(v); });
  } else {
    vids.forEach(function(v){ var p = v.play(); if (p && p.catch) p.catch(function(){}); });
  }

  /* ---- scroll: blob parallax + dock compaction + section highlight ---- */
  var dock = $('#dock');
  var ind = $('.dock__ind');
  var links = $$('.dock__link[href^="#"]');
  var blobs = $$('.blob');
  var lastY = window.scrollY || 0, ticking = false;
  function moveInd(){
    var a = $('.dock__link.is-active');
    if (!a){ ind.style.opacity = '0'; return; }
    ind.style.opacity = '1';
    ind.style.width = a.offsetWidth + 'px';
    ind.style.transform = 'translate3d(' + a.offsetLeft + 'px,0,0)';
  }
  function frame(){
    ticking = false;
    var y = window.scrollY || 0;
    if (!reduce) blobs.forEach(function(b){
      var s = parseFloat(b.getAttribute('data-speed') || '0.1');
      b.style.translate = '0 ' + (-y * s).toFixed(1) + 'px';
    });
    if (y < 80) dock.classList.remove('is-compact');
    else if (y > lastY + 6) dock.classList.add('is-compact');
    else if (y < lastY - 6) dock.classList.remove('is-compact');
    if (Math.abs(y - lastY) > 6) lastY = y;
  }
  window.addEventListener('scroll', function(){
    if (!ticking){ ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  links.forEach(function(a){ a.addEventListener('transitionend', moveInd); });
  if ('IntersectionObserver' in window){
    var sio = new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        if (!en.isIntersecting) return;
        links.forEach(function(a){ a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
        moveInd();
        setTimeout(moveInd, 520);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function(a){ var s = $(a.getAttribute('href')); if (s) sio.observe(s); });
  }
  window.addEventListener('resize', moveInd, { passive: true });

  /* ---- filter chips with sliding glass indicator ---- */
  var chips = $$('.chip');
  var find = $('.filters__ind');
  var reels = $$('.reel-card');
  function moveChip(){
    var c = chips.filter(function(x){ return x.getAttribute('aria-pressed') === 'true'; })[0];
    if (!c) return;
    find.style.width = c.offsetWidth + 'px';
    find.style.transform = 'translate3d(' + c.offsetLeft + 'px,0,0)';
  }
  chips.forEach(function(c){
    c.addEventListener('click', function(){
      chips.forEach(function(x){ x.setAttribute('aria-pressed', String(x === c)); });
      var f = c.getAttribute('data-f');
      reels.forEach(function(card){
        var show = f === 'all' || card.getAttribute('data-cat') === f;
        var was = !card.classList.contains('is-off');
        card.classList.toggle('is-off', !show);
        if (show && !was){ card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); }
      });
      moveChip();
    });
  });
  moveChip();
  window.addEventListener('resize', moveChip, { passive: true });

  /* ---- lightbox ---- */
  var lb = $('#lb');
  var slot = $('.lb__slot');
  var lbPanel = $('.lb__panel');
  var cur = 0, list = [];
  function visible(){ return reels.filter(function(c){ return !c.classList.contains('is-off'); }); }
  function fill(){
    var card = list[cur];
    var embed = card.getAttribute('data-embed');
    if (embed){
      var f = document.createElement('iframe');
      f.src = embed;
      f.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('title', card.getAttribute('data-title') || 'Video');
      slot.replaceChildren(f);
      if (lbSnd) lbSnd.style.display = 'none';
    } else {
      var src = card.querySelector('video');
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', '');
      v.autoplay = true; v.preload = 'auto';
      v.poster = src.getAttribute('poster') || '';
      var s = document.createElement('source');
      s.src = src.querySelector('source').getAttribute('src'); s.type = 'video/mp4';
      v.appendChild(s);
      slot.replaceChildren(v);
      if (lbSnd){ lbSnd.style.display = ''; lbSnd.__v = v; lbSnd.__fresh = false; syncSnd(); }
      var p = v.play(); if (p && p.catch) p.catch(function(){});
    }
    $('.lb__tag').textContent = card.getAttribute('data-tag') || '';
    $('.lb__title').textContent = card.getAttribute('data-title') || '';
    $('.lb__sub').textContent = card.getAttribute('data-sub') || '';
    $('.lb__count').textContent = (cur + 1) + ' / ' + list.length;
  }
  function openLb(card){
    list = visible();
    cur = Math.max(0, list.indexOf(card));
    fill();
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }
  function closeLb(){
    if (!lb.classList.contains('is-open')) return;
    lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    setTimeout(function(){ if (!lb.classList.contains('is-open')) slot.replaceChildren(); }, 400);
  }
  function step(d){
    if (!list.length) return;
    cur = (cur + d + list.length) % list.length;
    fill();
    if (slot.animate) slot.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
  }
  reels.forEach(function(card){
    card.addEventListener('click', function(){ openLb(card); });
    card.addEventListener('keydown', function(e){
      if (e.target !== card) return;
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openLb(card); }
    });
  });
  $('[data-next]').addEventListener('click', function(){ step(1); });
  $('[data-prev]').addEventListener('click', function(){ step(-1); });
  slot.addEventListener('click', function(){
    var v = slot.querySelector('video');
    if (!v) return;
    if (v.paused){ var p = v.play(); if (p && p.catch) p.catch(function(){}); } else v.pause();
  });

  /* ---- sound: every reel has a toggle; a tap unmutes that one (only one at a time), autoplay stays muted ---- */
  var snds = [];
  var lbSnd = null;
  function syncSnd(){
    snds.forEach(function(b){
      var on = !b.__v.muted;
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('.snd__txt').textContent = on ? 'Sound on' : (b.__fresh ? 'Tap to hear' : 'Sound off');
    });
  }
  function toggleSnd(b){
    var v = b.__v;
    var turnOn = v.muted;
    b.__fresh = false;
    $$('video').forEach(function(o){ o.muted = true; });
    v.muted = !turnOn;
    var p = v.play(); if (p && p.catch) p.catch(function(){});
    syncSnd();
  }
  function addSnd(host, v, first){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'snd' + (first ? ' snd--first' : '');
    b.setAttribute('aria-label', 'Sound on/off');
    b.innerHTML = '<span class="snd__dot" aria-hidden="true"></span><span class="snd__txt">' + (first ? 'Tap to hear' : 'Sound off') + '</span>';
    b.__v = v; b.__fresh = !!first;
    b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); toggleSnd(b); });
    host.appendChild(b);
    snds.push(b);
    return b;
  }
  var heroVid = $('.phone video');
  if (heroVid) addSnd($('.phone__screen'), heroVid, false);
  reels.forEach(function(card, i){
    var v = card.querySelector('video');
    if (v) addSnd(card, v, i === 0);
  });
  var lbDummy = document.createElement('video'); lbDummy.muted = true;
  lbSnd = addSnd($('.lb__stage'), lbDummy, false);
  syncSnd();

  /* ---- swipe: down to close (both panels), sideways for next/prev (lightbox) ---- */
  function swipe(panel, o){
    var on = false, sx = 0, sy = 0, dx = 0, dy = 0, axis = null;
    panel.addEventListener('pointerdown', function(e){
      if (e.target.closest('button, a')) return;
      on = true; sx = e.clientX; sy = e.clientY; dx = dy = 0; axis = null;
      panel.classList.add('dragging');
      try { panel.setPointerCapture(e.pointerId); } catch(err){}
    });
    panel.addEventListener('pointermove', function(e){
      if (!on) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (!axis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) axis = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h';
      if (axis === 'v'){
        var t = dy > 0 ? dy : dy * 0.15;
        panel.style.transform = 'translate3d(0,' + t + 'px,0)';
      } else if (axis === 'h' && o.next){
        panel.style.transform = 'translate3d(' + (dx * 0.35) + 'px,0,0)';
      }
    });
    function end(){
      if (!on) return;
      on = false;
      panel.classList.remove('dragging');
      panel.style.transform = '';
      if (axis === 'v' && dy > 110) o.close();
      else if (axis === 'h' && o.next){ if (dx < -60) o.next(); else if (dx > 60) o.prev(); }
      axis = null;
    }
    panel.addEventListener('pointerup', end);
    panel.addEventListener('pointercancel', end);
  }
  swipe(lbPanel, { close: closeLb, next: function(){ step(1); }, prev: function(){ step(-1); } });

  /* ---- hire sheet ---- */
  var sheet = $('#sheet');
  var sheetPanel = $('.sheet__panel');
  function openSheet(){
    sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }
  function closeSheet(){
    if (!sheet.classList.contains('is-open')) return;
    sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }
  swipe(sheetPanel, { close: closeSheet });
  $$('[data-hire]').forEach(function(b){ b.addEventListener('click', openSheet); });

  function closeAll(){ closeLb(); closeSheet(); }
  document.addEventListener('click', function(e){
    if (e.target.closest && e.target.closest('[data-close]')) closeAll();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeAll();
    if (lb.classList.contains('is-open')){
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    }
  });

  /* ---- copy handle ---- */
  var toast = $('#toast');
  var tt = null;
  function say(msg){
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(tt);
    tt = setTimeout(function(){ toast.classList.remove('is-on'); }, 1900);
  }
  $$('[data-copy]').forEach(function(b){
    b.addEventListener('click', function(){
      var txt = b.getAttribute('data-copy');
      var ok = function(){ say('Copy ho gaya ✓ ' + txt); };
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(ok, function(){ say(txt); });
      } else { say(txt); }
    });
  });
})();

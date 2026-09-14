(function(){
  'use strict';

  var craftSection = document.getElementById('craft');
  if (!craftSection) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var videoSrc = 'Cinematic-premium-product-animation-for.mp4';

  var wrap = document.createElement('section');
  wrap.className = 'craft-story';
  wrap.setAttribute('aria-label','The craft, one drink taken apart layer by layer');
  wrap.innerHTML = [
    '<div class="craft-story__track">',
      '<div class="craft-story__sticky">',
        '<div class="craft-story__eyebrow">THE CRAFT</div>',
        '<div class="craft-story__intro">',
          '<h2>One drink, taken apart.</h2>',
          '<p>Scroll through the build. Each layer gets its moment, then the drink comes back together at the end.</p>',
        '</div>',
        '<div class="craft-story__media">',
          '<video id="craftStoryVideo" playsinline muted preload="auto" aria-hidden="true"></video>',
          '<div class="craft-story__vignette" aria-hidden="true"></div>',
        '</div>',
        '<div class="craft-story__panel" id="craftStoryPanel">',
          '<span class="craft-story__step" id="craftStoryStep">01 / 05</span>',
          '<h3 id="craftStoryTitle">Whipped cream</h3>',
          '<p id="craftStoryCopy">The finish looks light, but it adds the first soft contrast against the colder matcha underneath.</p>',
        '</div>',
        '<div class="craft-story__progress" aria-hidden="true"><span id="craftStoryProgress"></span></div>',
      '</div>',
    '</div>'
  ].join('');

  craftSection.parentNode.insertBefore(wrap, craftSection);
  craftSection.style.display = 'none';

  var style = document.createElement('style');
  style.textContent = [
    '.craft-story{position:relative;background:#050505;color:#f5f0e8;}',
    '.craft-story__track{height:520vh;}',
    '.craft-story__sticky{position:sticky;top:0;height:100svh;min-height:640px;overflow:hidden;background:#050505;}',
    '.craft-story__media{position:absolute;inset:0;display:grid;place-items:center;background:#050505;}',
    '.craft-story__media video{width:100%;height:100%;object-fit:contain;object-position:center;background:#050505;}',
    '.craft-story__vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 48%,transparent 30%,rgba(0,0,0,.18) 62%,rgba(0,0,0,.72) 100%);}',
    '.craft-story__eyebrow{position:absolute;z-index:3;top:clamp(5.5rem,9vh,7rem);left:max(4vw,1rem);font-family:var(--mono);font-size:.68rem;letter-spacing:.24em;color:var(--gold);}',
    '.craft-story__intro{position:absolute;z-index:3;left:max(4vw,1rem);top:17%;width:min(28rem,38vw);transition:opacity .35s ease,transform .35s ease;}',
    '.craft-story__intro h2{font-family:var(--display);font-size:clamp(2.1rem,4.3vw,4.5rem);line-height:.98;color:#f5f0e8;}',
    '.craft-story__intro p{margin-top:1rem;max-width:34ch;color:rgba(245,240,232,.68);font-size:1rem;line-height:1.6;}',
    '.craft-story__panel{position:absolute;z-index:4;right:max(4vw,1rem);bottom:12%;width:min(25rem,31vw);padding:1.35rem 1.45rem 1.45rem;background:rgba(5,5,5,.72);border:1px solid rgba(201,178,127,.32);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);opacity:0;transform:translateY(18px);transition:opacity .32s ease,transform .32s ease;}',
    '.craft-story__panel.is-on{opacity:1;transform:none;}',
    '.craft-story__step{display:block;font-family:var(--mono);font-size:.65rem;letter-spacing:.18em;color:var(--gold);margin-bottom:.7rem;}',
    '.craft-story__panel h3{font-family:var(--display);font-size:clamp(1.55rem,2.5vw,2.45rem);color:#f5f0e8;margin:0 0 .65rem;}',
    '.craft-story__panel p{color:rgba(245,240,232,.72);font-size:.98rem;line-height:1.58;}',
    '.craft-story__progress{position:absolute;z-index:5;left:0;right:0;bottom:0;height:2px;background:rgba(245,240,232,.12);}',
    '.craft-story__progress span{display:block;height:100%;width:0;background:var(--gold);}',
    '@media(max-width:900px){.craft-story__track{height:430vh}.craft-story__intro{top:13%;width:min(88vw,32rem)}.craft-story__panel{left:1rem;right:1rem;bottom:8%;width:auto}.craft-story__media video{object-fit:cover}.craft-story__eyebrow{top:5.2rem}}',
    '@media(prefers-reduced-motion:reduce){.craft-story__track{height:auto}.craft-story__sticky{position:relative;height:auto;min-height:100svh}.craft-story__media{position:relative;min-height:70svh}.craft-story__intro{position:relative;top:auto;left:auto;width:auto;padding:7rem 1rem 1rem}.craft-story__panel{position:relative;left:auto;right:auto;bottom:auto;width:auto;margin:1rem;opacity:1;transform:none}.craft-story__eyebrow,.craft-story__progress{display:none}}'
  ].join('');
  document.head.appendChild(style);

  var video = document.getElementById('craftStoryVideo');
  var panel = document.getElementById('craftStoryPanel');
  var stepEl = document.getElementById('craftStoryStep');
  var titleEl = document.getElementById('craftStoryTitle');
  var copyEl = document.getElementById('craftStoryCopy');
  var progressBar = document.getElementById('craftStoryProgress');
  var intro = wrap.querySelector('.craft-story__intro');

  var stages = [
    {at:.14,title:'Whipped cream',copy:'The finish adds the first soft contrast to the colder matcha underneath.'},
    {at:.30,title:'Caramel drizzle',copy:'A richer, toasted sweetness cuts across the grassy matcha instead of simply making the drink sweeter.'},
    {at:.46,title:'Matcha',copy:'This is the backbone: earthy, slightly bitter, and strong enough to hold up against milk and cream.'},
    {at:.62,title:'Milk',copy:'Milk rounds the matcha, changes the texture, and carries the flavor through the whole cup.'},
    {at:.78,title:'Ice + build',copy:'Temperature, dilution, and the order of the layers determine whether the first sip tastes balanced or flat.'},
    {at:.91,title:'The finished drink',copy:'Everything closes back together. The final cup is the reward — now you know what is inside it.'}
  ];

  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
  function progress(){
    var r = wrap.getBoundingClientRect();
    var span = wrap.offsetHeight - window.innerHeight;
    return span > 0 ? clamp(-r.top / span,0,1) : 0;
  }

  var duration = 0;
  var raf = 0;
  function render(){
    raf = 0;
    var p = progress();
    progressBar.style.width = (p*100).toFixed(2)+'%';

    if (duration && !video.seeking) {
      var desired = p * Math.max(0,duration - 0.03);
      if (Math.abs(video.currentTime - desired) > 1/36) {
        try{video.currentTime = desired;}catch(e){}
      }
    }

    intro.style.opacity = p > .10 ? '0' : String(1 - p/.10);
    intro.style.transform = 'translateY(' + (-20*p) + 'px)';

    var active = -1;
    for (var i=0;i<stages.length;i++) if (p >= stages[i].at) active = i;
    if (active >= 0) {
      panel.classList.add('is-on');
      stepEl.textContent = String(active+1).padStart(2,'0') + ' / ' + String(stages.length).padStart(2,'0');
      titleEl.textContent = stages[active].title;
      copyEl.textContent = stages[active].copy;
    } else {
      panel.classList.remove('is-on');
    }
  }
  function wake(){if(!raf) raf=requestAnimationFrame(render);}

  video.addEventListener('loadedmetadata',function(){duration=video.duration||0; if(reduced){try{video.currentTime=duration-.05;}catch(e){}} render();});
  video.src = videoSrc;
  video.load();

  if (!reduced) {
    window.addEventListener('scroll',wake,{passive:true});
    window.addEventListener('resize',wake,{passive:true});
    video.addEventListener('seeked',wake);
    render();
  }
})();

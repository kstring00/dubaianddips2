/* Dubai & Dips — cinematic scroll hero
   The film is the hero. Code only directs the camera, pacing and interface.
   One normalized progress value drives the scrub, editorial chrome, landing
   copy and the final depth push. No animation soup, no competing tricks. */
(function(){
  'use strict';

  var old=document.getElementById('top');
  if(!old)return;

  var FILM='Use-the-supplied-chocolate-bar-as-the-ex.mp4';
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileQ=window.matchMedia('(max-width: 760px), (hover: none)');

  var hero=document.createElement('section');
  hero.id='top';
  hero.className='cinema';
  hero.setAttribute('aria-label','Dubai and Dips — chocolate opens into the café');
  hero.innerHTML='\
    <div class="cinema__sticky">\
      <div class="cinema__aperture" id="cinemaAperture">\
        <div class="cinema__media" id="cinemaMedia">\
          <video id="cinemaFilm" muted playsinline preload="auto" aria-hidden="true">\
            <source src="'+FILM+'" type="video/mp4">\
          </video>\
          <div class="cinema__grade" id="cinemaGrade" aria-hidden="true"></div>\
          <div class="cinema__vignette" aria-hidden="true"></div>\
          <div class="cinema__grain" aria-hidden="true"></div>\
        </div>\
      </div>\
\
      <div class="cinema__chrome" id="cinemaChrome">\
        <div class="cinema__chapter" id="cinemaChapter">\
          <span id="cinemaNum">01</span><i></i><b id="cinemaTitle">ARRIVAL</b>\
        </div>\
        <div class="cinema__brand">DUBAI <em>&amp;</em> DIPS</div>\
        <div class="cinema__place">CLEAR LAKE · HOUSTON</div>\
        <div class="cinema__scroll" id="cinemaScroll">SCROLL TO OPEN <span>↓</span></div>\
      </div>\
\
      <div class="cinema__landing" id="cinemaLanding">\
        <span class="cinema__landing-kicker">04 / FULL IMMERSION</span>\
        <h1>Made here,<br><em>every morning.</em></h1>\
        <p>Gelato, pastries, coffee and matcha.</p>\
        <div class="cinema__actions">\
          <a class="btn btn--gold" href="https://maps.google.com/?q=Dubai+and+Dips+Clear+Lake+Houston+TX" target="_blank" rel="noopener">Get directions</a>\
          <a class="cinema__link" href="#known">See what we make <span>↘</span></a>\
        </div>\
      </div>\
\
      <div class="cinema__rule" id="cinemaRule" aria-hidden="true"><i></i></div>\
      <div class="cinema__loader" id="cinemaLoader" aria-hidden="true"><span>DUBAI <em>&amp;</em> DIPS</span><i></i></div>\
      <div class="cinema__exit" id="cinemaExit" aria-hidden="true"></div>\
    </div>';

  old.parentNode.insertBefore(hero,old);
  old.remove();

  var style=document.createElement('style');
  style.id='cinemaHeroStyles';
  style.textContent='\
  .cinema{position:relative;height:440vh;background:#07100b;color:#f2eadf;isolation:isolate}\
  .cinema__sticky{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden;background:#07100b;isolation:isolate}\
  .cinema__aperture{position:absolute;inset:0;z-index:1;overflow:hidden;clip-path:inset(18px round 18px);will-change:clip-path,transform;background:#07100b}\
  .cinema__media{position:absolute;inset:-2%;will-change:transform;transform-origin:50% 50%;background:#07100b}\
  .cinema__media video{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;object-position:center center;filter:saturate(.96) contrast(1.035) brightness(.92);will-change:transform;backface-visibility:hidden}\
  .cinema__grade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(3,8,5,.20),transparent 27%,transparent 72%,rgba(3,8,5,.18)),linear-gradient(180deg,rgba(2,6,3,.15),transparent 27%,transparent 65%,rgba(2,6,3,.26));opacity:.72;will-change:opacity}\
  .cinema__vignette{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 190px rgba(0,0,0,.34);mix-blend-mode:multiply}\
  .cinema__grain{position:absolute;inset:-50%;pointer-events:none;opacity:.055;background-image:radial-gradient(circle,rgba(255,255,255,.85) 0 .55px,transparent .75px);background-size:4px 4px;mix-blend-mode:soft-light;animation:cinemaGrain .32s steps(2,end) infinite}\
  @keyframes cinemaGrain{0%{transform:translate3d(-2%,1%,0)}25%{transform:translate3d(1%,-1%,0)}50%{transform:translate3d(2%,2%,0)}75%{transform:translate3d(-1%,-2%,0)}100%{transform:translate3d(0,0,0)}}\
  .cinema__chrome{position:absolute;inset:0;z-index:8;pointer-events:none;color:#eadfce;will-change:opacity}\
  .cinema__chapter{position:absolute;left:max(3vw,24px);top:max(3.2vh,24px);display:flex;align-items:center;gap:.72rem;font:300 .66rem/1 var(--mono);letter-spacing:.2em;color:rgba(237,225,206,.78);text-transform:uppercase}\
  .cinema__chapter span{color:#d5bb7b}.cinema__chapter i{display:block;width:42px;height:1px;background:rgba(213,187,123,.55)}.cinema__chapter b{font-weight:300;color:#f0e6d6}\
  .cinema__brand{position:absolute;right:max(3vw,24px);top:max(3.05vh,22px);font:500 .78rem/1 var(--display);letter-spacing:.12em;color:rgba(240,230,214,.86)}.cinema__brand em{font-style:normal;color:#d5bb7b}\
  .cinema__place{position:absolute;right:max(3vw,24px);bottom:max(3.4vh,26px);font:300 .62rem/1 var(--mono);letter-spacing:.2em;color:rgba(240,230,214,.5)}\
  .cinema__scroll{position:absolute;left:max(3vw,24px);bottom:max(3.4vh,26px);font:300 .62rem/1 var(--mono);letter-spacing:.2em;color:rgba(240,230,214,.62)}.cinema__scroll span{display:inline-block;margin-left:.55rem;color:#d5bb7b;animation:cinemaArrow 1.5s var(--ease) infinite}\
  @keyframes cinemaArrow{0%,100%{transform:translateY(0);opacity:.65}50%{transform:translateY(5px);opacity:1}}\
  .cinema__landing{position:absolute;z-index:9;left:max(4.6vw,34px);bottom:max(5.5vh,42px);width:min(620px,48vw);opacity:0;transform:translate3d(0,42px,0);will-change:transform,opacity;pointer-events:none}\
  .cinema__landing-kicker{display:block;margin-bottom:1rem;font:300 .65rem/1 var(--mono);letter-spacing:.22em;color:#d5bb7b}\
  .cinema__landing h1{font:500 clamp(3rem,5.8vw,6.7rem)/.88 var(--display);letter-spacing:-.052em;color:#f3eadc;text-shadow:0 8px 40px rgba(0,0,0,.28)}.cinema__landing h1 em{font-weight:400;color:#d5bb7b}\
  .cinema__landing p{margin-top:1.15rem;font-size:clamp(.98rem,1.15vw,1.15rem);font-weight:300;color:rgba(244,235,221,.74);letter-spacing:.01em}\
  .cinema__actions{display:flex;align-items:center;gap:1.25rem;margin-top:1.65rem}.cinema__actions .btn{pointer-events:auto;padding:.78rem 1.55rem;min-height:46px}.cinema__link{pointer-events:auto;color:#f1e7d8;text-decoration:none;font-size:.92rem;border-bottom:1px solid rgba(213,187,123,.5);padding:.55rem .08rem}.cinema__link span{color:#d5bb7b;margin-left:.3rem}\
  .cinema__rule{position:absolute;z-index:10;left:0;right:0;bottom:0;height:2px;background:rgba(255,255,255,.08);transform-origin:left}.cinema__rule i{display:block;width:0;height:100%;background:#d5bb7b;box-shadow:0 0 16px rgba(213,187,123,.35);will-change:width}\
  .cinema__loader{position:absolute;inset:0;z-index:30;display:grid;place-items:center;background:#07100b;transition:opacity .7s var(--ease),visibility .7s}.cinema__loader span{font:500 clamp(1rem,1.4vw,1.35rem)/1 var(--display);letter-spacing:.14em;color:#eee4d5}.cinema__loader span em{font-style:normal;color:#d5bb7b}.cinema__loader i{position:absolute;left:50%;top:calc(50% + 34px);width:88px;height:1px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,#d5bb7b,transparent);animation:cinemaLoad 1.1s ease-in-out infinite}\
  @keyframes cinemaLoad{0%,100%{opacity:.2;transform:translateX(-50%) scaleX(.4)}50%{opacity:1;transform:translateX(-50%) scaleX(1)}}\
  .cinema.is-ready .cinema__loader{opacity:0;visibility:hidden;pointer-events:none}\
  .cinema__exit{position:absolute;inset:0;z-index:7;pointer-events:none;background:linear-gradient(to top,rgba(20,29,23,.88),rgba(20,29,23,.2) 24%,transparent 50%);opacity:0;will-change:opacity}\
  .cinema+main{position:relative;z-index:2}.cinema+main>.sec:first-child{box-shadow:0 -1px 0 rgba(201,178,127,.08)}\
  @media(max-width:760px),(hover:none){.cinema{height:360vh}.cinema__aperture{clip-path:inset(10px round 13px)}.cinema__media{inset:0;background:#07100b}.cinema__media video{object-fit:contain;filter:saturate(.98) contrast(1.03) brightness(.9)}.cinema__vignette{box-shadow:inset 0 0 80px rgba(0,0,0,.26)}.cinema__chapter{left:18px;top:20px;font-size:.58rem;gap:.55rem}.cinema__chapter i{width:28px}.cinema__brand{right:18px;top:19px;font-size:.68rem}.cinema__place{display:none}.cinema__scroll{left:18px;bottom:calc(66px + 2.8vh);font-size:.56rem}.cinema__landing{left:20px;right:20px;bottom:calc(62px + 3vh);width:auto}.cinema__landing-kicker{font-size:.58rem;margin-bottom:.72rem}.cinema__landing h1{font-size:clamp(2.45rem,12vw,4rem);line-height:.9}.cinema__landing p{margin-top:.8rem;font-size:.95rem}.cinema__actions{margin-top:1rem}.cinema__actions .btn{display:none}.cinema__link{font-size:.86rem}.cinema__grain{opacity:.035}}\
  @media(prefers-reduced-motion:reduce){.cinema{height:100svh}.cinema__sticky{position:relative}.cinema__grain,.cinema__scroll{display:none}.cinema__aperture{clip-path:inset(0 round 0)}.cinema__landing{opacity:1;transform:none}.cinema__chrome{opacity:.3}}';
  document.head.appendChild(style);

  var film=document.getElementById('cinemaFilm');
  var media=document.getElementById('cinemaMedia');
  var aperture=document.getElementById('cinemaAperture');
  var chrome=document.getElementById('cinemaChrome');
  var chapter=document.getElementById('cinemaChapter');
  var num=document.getElementById('cinemaNum');
  var title=document.getElementById('cinemaTitle');
  var scrollHint=document.getElementById('cinemaScroll');
  var landing=document.getElementById('cinemaLanding');
  var rule=document.querySelector('#cinemaRule i');
  var grade=document.getElementById('cinemaGrade');
  var exit=document.getElementById('cinemaExit');
  var nav=document.getElementById('nav');

  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function range(p,a,b){return clamp((p-a)/(b-a),0,1)}
  function lerp(a,b,t){return a+(b-a)*t}
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function easeOut(t){return 1-Math.pow(1-t,3)}

  var cache={};
  function styleSet(el,prop,val){
    if(!el)return;
    var key=(el.id||el.className)+'|'+prop;
    if(cache[key]===val)return;
    cache[key]=val;
    el.style[prop]=val;
  }

  var beats=[
    {at:0,num:'01',title:'ARRIVAL'},
    {at:.18,num:'02',title:'REVEAL'},
    {at:.43,num:'03',title:'OPEN'},
    {at:.69,num:'04',title:'FULL IMMERSION'}
  ];
  var beatIndex=-1;
  function setBeat(p){
    var next=0;
    for(var i=0;i<beats.length;i++)if(p>=beats[i].at)next=i;
    if(next===beatIndex)return;
    beatIndex=next;
    num.textContent=beats[next].num;
    title.textContent=beats[next].title;
    chapter.animate([{opacity:.25,transform:'translateY(-4px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'});
  }

  var duration=5;
  var canScrub=false;
  var lastSeek=0;
  function ready(){hero.classList.add('is-ready')}
  film.addEventListener('loadedmetadata',function(){duration=isFinite(film.duration)&&film.duration>0?film.duration:5;canScrub=true;ready();if(reduce){try{film.currentTime=Math.max(0,duration-.06)}catch(e){}}},{once:true});
  film.addEventListener('loadeddata',ready,{once:true});
  film.load();

  var vh=window.innerHeight;
  var travel=1;
  var mobile=mobileQ.matches;
  function layout(){
    vh=window.innerHeight;
    mobile=mobileQ.matches;
    travel=Math.max(1,hero.offsetHeight-vh);
    cache={};
  }

  function videoTimeFor(p){
    var t=ease(range(p,.025,.655));
    return Math.min(Math.max(0,duration-.045),t*(duration-.045));
  }

  function apply(p,now){
    setBeat(p);

    var opening=easeOut(range(p,0,.10));
    var edge=lerp(mobile?10:18,0,opening);
    var radius=lerp(mobile?13:18,0,opening);
    styleSet(aperture,'clipPath','inset('+edge.toFixed(2)+'px round '+radius.toFixed(2)+'px)');

    if(canScrub&&!reduce){
      var wanted=videoTimeFor(p);
      if(Math.abs(film.currentTime-wanted)>.022 && (now-lastSeek>30 || Math.abs(film.currentTime-wanted)>.22)){
        lastSeek=now;
        try{film.currentTime=wanted}catch(e){}
      }
    }

    /* Once the film lands, the room itself becomes the parallax layer. */
    var depth=easeOut(range(p,.66,.91));
    var scale=lerp(1.02,mobile?1.045:1.085,depth);
    var y=lerp(0,mobile?-0.4:-1.45,depth);
    styleSet(media,'transform','translate3d(0,'+y.toFixed(3)+'vh,0) scale('+scale.toFixed(4)+')');
    styleSet(grade,'opacity',lerp(.72,.88,depth).toFixed(3));

    var chromeOut=1-ease(range(p,.57,.72));
    styleSet(chrome,'opacity',chromeOut.toFixed(3));
    var scrollOut=1-ease(range(p,.10,.27));
    styleSet(scrollHint,'opacity',scrollOut.toFixed(3));

    var land=easeOut(range(p,.69,.83));
    styleSet(landing,'opacity',land.toFixed(3));
    styleSet(landing,'transform','translate3d(0,'+(42*(1-land)).toFixed(2)+'px,0)');
    styleSet(landing,'pointerEvents',land>.75?'auto':'none');

    styleSet(rule,'width',(p*100).toFixed(2)+'%');
    styleSet(exit,'opacity',ease(range(p,.91,.995)).toFixed(3));

    var navIn=ease(range(p,.82,.91));
    styleSet(nav,'opacity',navIn.toFixed(3));
    styleSet(nav,'pointerEvents',navIn>.6?'':'none');
  }

  if(reduce){
    hero.style.height='100svh';
    if(nav){nav.style.opacity='1';nav.style.pointerEvents='';}
    apply(.84,performance.now());
    return;
  }

  var current=0,target=0,raf=0;
  function targetProgress(){return clamp((window.scrollY||window.pageYOffset||0)/travel,0,1)}
  function tick(now){
    raf=0;
    target=targetProgress();
    current+=(target-current)*(mobile?.18:.125);
    if(Math.abs(target-current)<.00045)current=target;
    apply(current,now);
    if(current!==target)raf=requestAnimationFrame(tick);
  }
  function wake(){if(!raf)raf=requestAnimationFrame(tick)}

  layout();
  current=target=targetProgress();
  apply(current,performance.now());
  window.addEventListener('scroll',wake,{passive:true});
  window.addEventListener('resize',function(){layout();wake()},{passive:true});
  if(mobileQ.addEventListener)mobileQ.addEventListener('change',function(){layout();wake()});
})();

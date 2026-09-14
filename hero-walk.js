/* Hero v3, "walking in".
   One photo (Stage A) or four cut-out layers (Stage B) inside a sticky stage.
   Scroll progress p (0 to 1 across the hero's travel) is the only input.
   apply(p) writes every transform and opacity. A rAF loop lerps toward the
   scroll target and stops when it settles. DOM writes happen only on change. */
(function(){
  'use strict';

  var hero=document.getElementById('top');
  if(!hero||!hero.classList.contains('walk'))return;

  /* Stage B, real layers. Flip this to true once assets/layers/ holds all four
     files (1-front.png, 2-column.png, 3-counter.png, 4-wall.jpg). Until then
     the single photo in the markup does the walk and this path is unused. */
  var STAGE_B=false;

  var stage=hero.querySelector('.walk__stage');
  var plate=document.getElementById('walkPlate');
  var room=document.getElementById('walkRoom');
  var glow=document.getElementById('walkGlow');
  var caseL=document.getElementById('walkCaseL');
  var caseR=document.getElementById('walkCaseR');
  var dimHole=document.getElementById('walkDimHole');
  var dimFull=document.getElementById('walkDimFull');
  var blur=document.getElementById('walkBlur');
  var landScrim=document.getElementById('walkLandScrim');
  var eyebrow=document.getElementById('walkEyebrow');
  var copyItems=[].slice.call(hero.querySelectorAll('[data-rise]'));
  var nav=document.getElementById('nav');
  var main=hero.nextElementSibling;
  var next=main?main.querySelector('.sec'):null;

  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobileQ=window.matchMedia('(hover: none), (max-width: 899px)');

  var layers=null;
  if(STAGE_B){
    /* The front PNG is mounted twice and clipped down the middle so the left
       cluster and the right chairs can slide apart. */
    var tpl=''
      +'<div class="walk__layer walk__layer--wall" data-layer="wall"><img src="assets/layers/4-wall.jpg" width="1920" height="1080" alt="" fetchpriority="high" decoding="async"></div>'
      +'<div class="walk__layer walk__layer--counter" data-layer="counter"><img src="assets/layers/3-counter.png" width="1920" height="1080" alt="" decoding="async"></div>'
      +'<div class="walk__layer walk__layer--column" data-layer="column"><img src="assets/layers/2-column.png" width="1920" height="1080" alt="" decoding="async"></div>'
      +'<div class="walk__layer walk__layer--front walk__layer--front-l" data-layer="frontL"><img src="assets/layers/1-front.png" width="1920" height="1080" alt="" decoding="async"></div>'
      +'<div class="walk__layer walk__layer--front walk__layer--front-r" data-layer="frontR"><img src="assets/layers/1-front.png" width="1920" height="1080" alt="" decoding="async"></div>';
    var frag=document.createElement('div');
    frag.innerHTML=tpl;
    var roomPic=room.closest('picture');
    while(frag.firstChild)plate.insertBefore(frag.firstChild,roomPic);
    roomPic.remove();
    layers={};
    [].forEach.call(plate.querySelectorAll('[data-layer]'),function(el){layers[el.getAttribute('data-layer')]=el});
    /* The case light overlays ride on the counter so they scale with it. */
    layers.counter.appendChild(caseL);
    layers.counter.appendChild(caseR);
    hero.classList.add('walk--layers');
  }

  function clamp(v,a,b){return v<a?a:v>b?b:v}
  function range(p,a,b){return clamp((p-a)/(b-a),0,1)}
  function easeInOutCubic(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function lin(a,b,t){return a+(b-a)*t}

  /* Cached DOM writes: only touch the element when the value changes. */
  var cache={};
  function setStyle(el,prop,val){
    if(!el)return;
    var key=(el.id||el.className)+'|'+prop;
    if(cache[key]===val)return;
    cache[key]=val;
    el.style[prop]=val;
  }

  var vh=window.innerHeight,vw=window.innerWidth,mobile=mobileQ.matches;
  function measure(){vh=window.innerHeight;vw=window.innerWidth;mobile=mobileQ.matches}

  /* Scroll beats.
     0.00 to 0.06  at the door
     0.06 to 0.70  the walk
     0.60 to 0.85  the lights
     0.62 to 0.82  the landing
     0.85 to 1.00  clamp, nothing moves */
  function apply(p){
    var w=easeInOutCubic(range(p,.06,.70));

    if(layers){
      var fx=(mobile?19:38)*w;
      var fy=18*w;
      var fs=lin(1,1.55,w);
      var fo=1-range(w,.75,1);
      setStyle(layers.frontL,'transform','translate3d('+(-fx).toFixed(2)+'vw,'+fy.toFixed(2)+'vh,0) scale('+fs.toFixed(4)+')');
      setStyle(layers.frontR,'transform','translate3d('+fx.toFixed(2)+'vw,'+fy.toFixed(2)+'vh,0) scale('+fs.toFixed(4)+')');
      setStyle(layers.frontL,'opacity',fo.toFixed(3));
      setStyle(layers.frontR,'opacity',fo.toFixed(3));
      setStyle(layers.column,'transform','translate3d('+(16*w).toFixed(2)+'vw,0,0) scale('+lin(1,1.28,w).toFixed(4)+')');
      setStyle(layers.counter,'transform','translate3d(0,'+(2*w).toFixed(2)+'vh,0) scale('+lin(1,1.22,w).toFixed(4)+')');
      setStyle(layers.wall,'transform','scale('+lin(1,1.08,w).toFixed(4)+')');
    }else{
      /* Stage A: one plane, depth push toward the sign. */
      setStyle(plate,'transform','translate3d(0,'+(3*w).toFixed(2)+'vh,0) scale('+lin(1,1.28,w).toFixed(4)+')');
    }

    var lights=easeInOutCubic(range(p,.60,.85));
    setStyle(glow,'opacity',lin(.12,.32,lights).toFixed(3));
    var caseOp=(.20*lights).toFixed(3);
    setStyle(caseL,'opacity',caseOp);
    setStyle(caseR,'opacity',caseOp);

    var door=1-easeInOutCubic(range(p,.56,.64));
    setStyle(eyebrow,'opacity',door.toFixed(3));

    for(var i=0;i<copyItems.length;i++){
      var start=.62+i*.03;
      var t=easeInOutCubic(range(p,start,start+.12));
      setStyle(copyItems[i],'opacity',t.toFixed(3));
      setStyle(copyItems[i],'transform','translate3d(0,'+(16*(1-t)).toFixed(2)+'px,0)');
    }
    setStyle(landScrim,'opacity',easeInOutCubic(range(p,.60,.78)).toFixed(3));

    var navOp=easeInOutCubic(range(p,.66,.76));
    setStyle(nav,'opacity',navOp.toFixed(3));
    setStyle(nav,'pointerEvents',navOp>.5?'':'none');
  }

  /* The cover. c runs 0 to 1 while the next section slides over the frozen
     frame. The room dims to 30 percent; the sign keeps its brightness until
     the last tenth. */
  function applyCover(c){
    var hole=easeInOutCubic(range(c,0,.9));
    var full=easeInOutCubic(range(c,.9,1));
    setStyle(dimHole,'opacity',hole.toFixed(3));
    setStyle(dimFull,'opacity',full.toFixed(3));
    if(nav)nav.classList.toggle('is-stuck',c>0);
  }

  if(reduce){
    /* Static close state: counter close, lights warm, copy landed. */
    hero.classList.add('walk--static');
    apply(.9);
    applyCover(0);
    setStyle(nav,'opacity','1');
    setStyle(nav,'pointerEvents','');
    setStyle(blur,'opacity','0');
    var stuck=false;
    window.addEventListener('scroll',function(){var s=window.scrollY>hero.offsetHeight-80;if(s!==stuck){stuck=s;nav.classList.toggle('is-stuck',s)}},{passive:true});
    return;
  }

  hero.classList.add('walk--live');

  var travel=1,coverLen=1;
  function layout(){
    measure();
    /* The stage stays pinned for travel + coverLen. The next section starts
       one viewport early, so it slides over the frozen frame. */
    travel=hero.offsetHeight-2*vh;
    if(travel<1)travel=1;
    coverLen=vh;
    cache={};
  }

  var current=0,target=0,raf=0,lastY=window.scrollY||0,lastT=0,vel=0,blurOp=0,blurShown=false;
  function targetP(){
    var y=window.scrollY||window.pageYOffset||0;
    return clamp(y/travel,0,1);
  }
  function coverP(){
    var y=window.scrollY||window.pageYOffset||0;
    return clamp((y-travel)/coverLen,0,1);
  }

  function tick(now){
    raf=0;
    target=targetP();
    var moving=false;
    current+=(target-current)*.14;
    if(Math.abs(target-current)<.0005)current=target;else moving=true;
    apply(current);
    applyCover(coverP());

    /* Scroll velocity drives the Stage A blur band: 0 at rest, full while
       moving through the walk. Clamped so a flick never over-blurs. */
    var y=window.scrollY||0;
    var dt=lastT?Math.max(8,now-lastT):16;
    var v=Math.abs(y-lastY)/dt;
    lastY=y;lastT=now;
    vel+=(clamp(v/1.2,0,1)-vel)*.22;
    var want=layers?0:vel*(1-range(current,.7,.8));
    if(want<.02)want=0;
    if(Math.abs(want-blurOp)>.005||(want===0&&blurOp!==0)){
      blurOp=want;
      setStyle(blur,'opacity',blurOp.toFixed(3));
      var show=blurOp>0;
      if(show!==blurShown){blurShown=show;setStyle(blur,'visibility',show?'visible':'hidden')}
    }
    if(blurOp>0&&vel>.02)moving=true;
    if(!moving&&blurOp>0){vel=0;setStyle(blur,'opacity','0');setStyle(blur,'visibility','hidden');blurOp=0;blurShown=false}
    if(moving)raf=requestAnimationFrame(tick);
  }
  function wake(){if(!raf)raf=requestAnimationFrame(tick)}

  layout();
  current=target=targetP();
  apply(current);
  applyCover(coverP());
  lastT=performance.now();

  window.addEventListener('scroll',wake,{passive:true});
  window.addEventListener('resize',function(){layout();wake()},{passive:true});
  if(mobileQ.addEventListener)mobileQ.addEventListener('change',function(){layout();wake()});
})();

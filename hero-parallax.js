(function(){
  'use strict';
  var old=document.getElementById('top');
  if(!old)return;

  var hero=document.createElement('section');
  hero.id='top';
  hero.className='parallax-hero';
  hero.setAttribute('aria-label','Dubai and Dips');
  hero.innerHTML=''
    +'<div class="ph-sticky">'
      +'<div class="ph-bg" data-speed=".10"></div>'
      +'<div class="ph-grain" aria-hidden="true"></div>'
      +'<div class="ph-aurora ph-aurora-a" data-speed=".06"></div>'
      +'<div class="ph-aurora ph-aurora-b" data-speed=".13"></div>'

      +'<div class="ph-copy" data-speed=".05">'
        +'<div class="ph-eyebrow">CLEAR LAKE · HOUSTON</div>'
        +'<h1>Crafted cold.<br><em>Finished loud.</em></h1>'
        +'<p>Matcha, pistachio, espresso and dessert — built one layer at a time.</p>'
        +'<div class="ph-actions">'
          +'<a class="btn btn--gold" href="#known">Explore the menu</a>'
          +'<a class="ph-text-link" href="#craft">See how it’s made <span>↘</span></a>'
        +'</div>'
      +'</div>'

      +'<div class="ph-scene" aria-hidden="true">'
        +'<div class="ph-photo ph-photo--pistachio" data-speed=".24" data-rot="-5"><img src="assets/known-pistachio.webp" alt=""></div>'
        +'<div class="ph-photo ph-photo--coffee" data-speed=".15" data-rot="4"><img src="assets/known-biscoff.webp" alt=""></div>'
        +'<div class="ph-photo ph-photo--gelato" data-speed=".20" data-rot="2"><img src="assets/craft-gelato.webp" alt=""></div>'

        +'<div class="ph-machine" data-speed=".08">'
          +'<div class="ph-machine-top"><span></span><i></i><b></b></div>'
          +'<div class="ph-group-head"><div class="ph-portafilter"></div><div class="ph-spout"></div></div>'
          +'<div class="ph-espresso-stream"></div>'
          +'<div class="ph-cup"><div class="ph-coffee"></div><div class="ph-crema"></div></div>'
          +'<div class="ph-cup-shadow"></div>'
        +'</div>'

        +'<div class="ph-matcha" data-speed=".31">'
          +'<div class="ph-matcha-spoon"></div>'
          +'<div class="ph-matcha-pour"></div>'
          +'<div class="ph-matcha-pile"></div>'
        +'</div>'

        +'<div class="ph-nut ph-nut-a" data-speed=".34"></div>'
        +'<div class="ph-nut ph-nut-b" data-speed=".26"></div>'
        +'<div class="ph-nut ph-nut-c" data-speed=".39"></div>'
        +'<div class="ph-nut ph-nut-d" data-speed=".18"></div>'
        +'<div class="ph-nut ph-nut-e" data-speed=".29"></div>'
      +'</div>'

      +'<div class="ph-index" data-speed=".03"><span>01</span><i></i><b>THE CRAFT</b></div>'
      +'<div class="ph-scroll">SCROLL TO TRANSFORM <span>↓</span></div>'
      +'<div class="ph-transition" aria-hidden="true"></div>'
    +'</div>';

  old.parentNode.insertBefore(hero,old);
  old.remove();

  var style=document.createElement('style');
  style.textContent='\
.parallax-hero{position:relative;height:240vh;background:#07100b;color:#f0e9dd;isolation:isolate}\
.ph-sticky{position:sticky;top:0;height:100svh;overflow:hidden;background:#07100b}\
.ph-bg{position:absolute;inset:-10%;background:radial-gradient(70% 70% at 67% 48%,rgba(64,92,49,.23),transparent 62%),radial-gradient(54% 60% at 20% 15%,rgba(161,125,61,.16),transparent 70%),linear-gradient(135deg,#07100b 0%,#0c1810 46%,#06100a 100%);transform:scale(1.08);will-change:transform}\
.ph-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,9,6,.88) 0%,rgba(4,9,6,.45) 40%,rgba(4,9,6,.10) 64%,rgba(4,9,6,.55) 100%)}\
.ph-grain{position:absolute;inset:0;opacity:.07;pointer-events:none;background-image:radial-gradient(circle,#fff 0 .6px,transparent .8px);background-size:4px 4px;mix-blend-mode:soft-light;z-index:20}\
.ph-aurora{position:absolute;border-radius:50%;filter:blur(90px);opacity:.22;will-change:transform}.ph-aurora-a{width:42vw;height:42vw;background:#5a773c;right:-8vw;top:5vh}.ph-aurora-b{width:34vw;height:34vw;background:#8c6a35;left:18vw;bottom:-18vw}\
.ph-copy{position:absolute;z-index:9;left:max(5vw,36px);top:50%;transform:translateY(-51%);width:min(560px,42vw);will-change:transform,opacity}.ph-eyebrow{font:300 .72rem/1 var(--mono);letter-spacing:.28em;color:#c9b27f;margin-bottom:1.1rem}.ph-copy h1{font:500 clamp(3.2rem,6.2vw,7.7rem)/.86 var(--display);letter-spacing:-.055em;color:#f3ecdf;text-wrap:balance}.ph-copy h1 em{font-weight:400;color:#c9b27f}.ph-copy p{max-width:42ch;margin-top:1.5rem;color:rgba(240,233,221,.68);font-size:clamp(1rem,1.2vw,1.2rem);line-height:1.55}.ph-actions{display:flex;gap:1.35rem;align-items:center;margin-top:2rem;flex-wrap:wrap}.ph-text-link{font-size:.92rem;text-decoration:none;border-bottom:1px solid rgba(201,178,127,.44);padding:.6rem .1rem;color:#eee5d8}.ph-text-link span{color:#c9b27f;margin-left:.3rem}\
.ph-scene{position:absolute;inset:0;z-index:4;perspective:1200px}.ph-photo{position:absolute;border:1px solid rgba(218,194,140,.32);border-radius:26px;overflow:hidden;box-shadow:0 36px 100px rgba(0,0,0,.45);background:#111a12;will-change:transform,opacity;transform-style:preserve-3d}.ph-photo img{width:100%;height:100%;object-fit:cover;filter:saturate(.85) contrast(1.06) brightness(.78)}.ph-photo:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 52%,rgba(2,8,4,.46))}.ph-photo--pistachio{width:19vw;height:28vw;min-width:220px;min-height:330px;right:5vw;top:11vh;transform:rotate(-5deg)}.ph-photo--coffee{width:17vw;height:24vw;min-width:195px;min-height:290px;right:29vw;top:9vh;transform:rotate(4deg)}.ph-photo--gelato{width:16vw;height:21vw;min-width:190px;min-height:260px;right:10vw;bottom:4vh;transform:rotate(2deg)}\
.ph-machine{position:absolute;z-index:8;right:27vw;bottom:7vh;width:280px;height:330px;filter:drop-shadow(0 35px 48px rgba(0,0,0,.45));will-change:transform}.ph-machine-top{position:absolute;left:12px;right:12px;top:0;height:118px;border-radius:22px 22px 12px 12px;background:linear-gradient(145deg,#2c302e,#111513 55%,#252a27);border:1px solid rgba(212,187,132,.24);box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}.ph-machine-top:before{content:"";position:absolute;left:20px;right:20px;bottom:18px;height:18px;border-radius:4px;background:linear-gradient(#6f6450,#2b2820);opacity:.55}.ph-machine-top span,.ph-machine-top i,.ph-machine-top b{position:absolute;top:22px;width:13px;height:13px;border-radius:50%;background:#c1a667;box-shadow:0 0 16px rgba(193,166,103,.28)}.ph-machine-top span{left:26px}.ph-machine-top i{left:49px;background:#384b37}.ph-machine-top b{right:26px;background:#806b42}.ph-group-head{position:absolute;left:67px;top:104px;width:148px;height:48px;border-radius:0 0 18px 18px;background:linear-gradient(#65665f,#242724 48%,#0c0f0d);border:1px solid rgba(255,255,255,.08)}.ph-portafilter{position:absolute;right:115px;top:12px;width:130px;height:14px;border-radius:12px;background:linear-gradient(90deg,#1b1d1c,#575b57 55%,#171918);transform:rotate(-3deg);transform-origin:right center}.ph-spout{position:absolute;left:67px;top:43px;width:14px;height:30px;background:linear-gradient(90deg,#4c504d,#111);border-radius:0 0 8px 8px}.ph-espresso-stream{position:absolute;z-index:2;left:137px;top:169px;width:5px;height:92px;border-radius:50%;background:linear-gradient(#e5b05c,#75401e 38%,#2e160a);box-shadow:0 0 12px rgba(207,133,64,.22);transform-origin:top;animation:espressoPulse 1.8s ease-in-out infinite}.ph-cup{position:absolute;left:83px;bottom:22px;width:116px;height:82px;border-radius:9px 9px 34px 34px;background:linear-gradient(90deg,#e4ded1,#fff9ec 43%,#c4bbaa);box-shadow:inset -8px -12px 16px rgba(0,0,0,.08);overflow:hidden}.ph-cup:after{content:"";position:absolute;right:-31px;top:15px;width:44px;height:42px;border:8px solid #d9d1c5;border-left:0;border-radius:0 28px 28px 0}.ph-coffee{position:absolute;left:7px;right:7px;top:11px;height:21px;border-radius:50%;background:radial-gradient(ellipse at 45% 42%,#bb7636,#42200f 62%,#1a0b06 100%)}.ph-crema{position:absolute;left:20px;top:14px;width:52px;height:7px;border-radius:50%;background:#d6a05c;filter:blur(.2px);animation:cremaDrift 2.6s ease-in-out infinite alternate}.ph-cup-shadow{position:absolute;left:58px;bottom:4px;width:166px;height:24px;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(12px)}\
.ph-matcha{position:absolute;z-index:7;right:46vw;top:15vh;width:220px;height:220px;will-change:transform}.ph-matcha-spoon{position:absolute;width:150px;height:38px;border-radius:40px;background:linear-gradient(180deg,#5b351f,#2b160d);transform:rotate(18deg);right:-35px;top:8px;box-shadow:inset 0 2px 5px rgba(255,255,255,.12),0 15px 32px rgba(0,0,0,.35)}.ph-matcha-spoon:before{content:"";position:absolute;left:-32px;top:-18px;width:66px;height:72px;border-radius:50%;background:radial-gradient(ellipse at 55% 40%,#456620 0 42%,#2d4315 43% 58%,#4b2d1b 60% 100%)}.ph-matcha-pour{position:absolute;left:31px;top:44px;width:34px;height:112px;background:linear-gradient(180deg,rgba(103,143,46,.95),rgba(85,120,39,.45) 58%,transparent);clip-path:polygon(35% 0,72% 0,100% 100%,0 100%);filter:drop-shadow(0 0 9px rgba(109,155,54,.22));animation:matchaFall 1.5s ease-in-out infinite}.ph-matcha-pile{position:absolute;left:-4px;top:145px;width:110px;height:38px;border-radius:50%;background:radial-gradient(ellipse at 50% 32%,#7ca94a,#3d6422 65%,#2d481c);box-shadow:0 8px 24px rgba(0,0,0,.28)}\
.ph-nut{position:absolute;z-index:10;width:54px;height:34px;border-radius:56% 44% 52% 48%;background:radial-gradient(ellipse at 62% 42%,#98be4b 0 38%,#5b7b2c 39% 66%,#cdbd86 68% 75%,#8e7954 77% 100%);box-shadow:0 12px 26px rgba(0,0,0,.38);will-change:transform}.ph-nut-a{right:19vw;top:18vh;transform:rotate(18deg)}.ph-nut-b{right:39vw;top:36vh;width:40px;height:28px;transform:rotate(-24deg)}.ph-nut-c{right:8vw;top:46vh;width:62px;height:40px;transform:rotate(32deg)}.ph-nut-d{right:34vw;bottom:14vh;width:46px;height:30px;transform:rotate(5deg)}.ph-nut-e{right:3vw;bottom:20vh;width:36px;height:25px;transform:rotate(-18deg)}\
.ph-index{position:absolute;left:max(5vw,36px);bottom:2.3rem;z-index:12;display:flex;align-items:center;gap:.8rem;font:300 .69rem/1 var(--mono);letter-spacing:.18em;color:rgba(201,178,127,.72)}.ph-index i{display:block;width:70px;height:1px;background:rgba(201,178,127,.55)}.ph-index b{font-weight:300;color:rgba(232,225,215,.5)}.ph-scroll{position:absolute;right:max(4vw,28px);bottom:2.3rem;z-index:12;font:300 .65rem/1 var(--mono);letter-spacing:.18em;color:rgba(232,225,215,.55)}.ph-scroll span{color:#c9b27f;margin-left:.5rem}.ph-transition{position:absolute;z-index:30;left:-5%;right:-5%;bottom:-9%;height:20%;background:var(--green-800);clip-path:polygon(0 61%,7% 57%,13% 64%,21% 54%,29% 62%,37% 50%,45% 58%,54% 48%,61% 59%,70% 51%,79% 60%,87% 53%,94% 61%,100% 56%,100% 100%,0 100%);transform:translateY(100%);will-change:transform}\
@keyframes espressoPulse{0%,100%{transform:scaleY(.88);opacity:.82}50%{transform:scaleY(1.06);opacity:1}}@keyframes cremaDrift{from{transform:translateX(-4px) scaleX(.92)}to{transform:translateX(10px) scaleX(1.05)}}@keyframes matchaFall{0%,100%{opacity:.72;transform:translateY(-3px) scaleX(.9)}50%{opacity:1;transform:translateY(4px) scaleX(1.07)}}\
@media(max-width:1100px){.ph-copy{width:min(560px,50vw)}.ph-photo--coffee{right:24vw}.ph-machine{right:18vw;transform:scale(.9);transform-origin:bottom center}.ph-matcha{right:38vw}}\
@media(max-width:820px){.parallax-hero{height:180vh}.ph-copy{left:7vw;top:34%;width:84vw}.ph-copy h1{font-size:clamp(3.1rem,14vw,6.2rem)}.ph-copy p{max-width:34ch}.ph-photo--coffee,.ph-photo--gelato,.ph-matcha{display:none}.ph-photo--pistachio{right:-11vw;top:52vh;width:54vw;height:66vw;min-width:0;min-height:0;opacity:.68}.ph-machine{right:4vw;bottom:4vh;transform:scale(.72);transform-origin:bottom right}.ph-nut-b,.ph-nut-d{display:none}.ph-index{bottom:1.4rem}.ph-scroll{display:none}}\
@media(prefers-reduced-motion:reduce){.parallax-hero{height:100svh}.ph-sticky{position:relative}.ph-espresso-stream,.ph-crema,.ph-matcha-pour{animation:none!important}.ph-transition{transform:none!important}}';
  document.head.appendChild(style);

  var sticky=hero.querySelector('.ph-sticky');
  var motion=[].slice.call(hero.querySelectorAll('[data-speed]'));
  var transition=hero.querySelector('.ph-transition');
  var copy=hero.querySelector('.ph-copy');
  var scrollCue=hero.querySelector('.ph-scroll');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf=0;

  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function render(){
    raf=0;
    if(reduce)return;
    var r=hero.getBoundingClientRect();
    var span=Math.max(1,hero.offsetHeight-window.innerHeight);
    var raw=-r.top/span;
    var p=clamp(raw,0,1);
    var motionP=clamp(p/0.72,0,1); // all parallax motion is finished by 72%
    var ease=1-Math.pow(1-motionP,3);
    motion.forEach(function(el,i){
      var speed=parseFloat(el.getAttribute('data-speed'))||0;
      var y=(ease-.5)*window.innerHeight*speed*2;
      var x=Math.sin((ease+i*.17)*Math.PI)*speed*28;
      var rot=parseFloat(el.getAttribute('data-rot')||0);
      var spin=(i%2?1:-1)*ease*speed*38;
      var base='translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0) rotate('+(rot+spin).toFixed(2)+'deg)';
      if(el.classList.contains('ph-copy')) base='translate3d(0,calc(-51% + '+y.toFixed(2)+'px),0)';
      el.style.transform=base;
    });
    if(copy){
      var fade=1-clamp((p-.52)/.18,0,1);
      copy.style.opacity=fade.toFixed(3);
    }
    if(scrollCue) scrollCue.style.opacity=(1-clamp(p/.16,0,1)).toFixed(3);
    var t=clamp((p-.68)/.32,0,1);
    transition.style.transform='translateY('+(100-(t*100)).toFixed(2)+'%)';
    sticky.style.setProperty('--progress',p.toFixed(4));
  }
  function wake(){if(!raf)raf=requestAnimationFrame(render)}
  window.addEventListener('scroll',wake,{passive:true});
  window.addEventListener('resize',wake,{passive:true});
  render();
})();

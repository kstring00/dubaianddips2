(function(){
  'use strict';
  var section=document.getElementById('reviews');
  if(!section)return;

  section.innerHTML=''
    +'<div class="reviews-luxe__glow reviews-luxe__glow--a" aria-hidden="true"></div>'
    +'<div class="reviews-luxe__glow reviews-luxe__glow--b" aria-hidden="true"></div>'
    +'<div class="reviews-luxe__grain" aria-hidden="true"></div>'
    +'<div class="shell reviews-luxe__inner">'
      +'<div class="reviews-luxe__top">'
        +'<div>'
          +'<span class="label">Reviews</span>'
          +'<h2>What people say <em>after.</em></h2>'
          +'<p class="reviews-luxe__kicker">REAL PEOPLE. REAL FLAVORS. REAL IMPACT.</p>'
        +'</div>'
        +'<div class="reviews-luxe__aside">'
          +'<p>More than a drink —<br>it’s an experience people<br>keep coming back for.</p>'
          +'<div class="reviews-luxe__controls">'
            +'<span>SCROLL REVIEWS</span>'
            +'<button type="button" class="reviews-luxe__arrow" data-dir="-1" aria-label="Previous review">‹</button>'
            +'<button type="button" class="reviews-luxe__arrow" data-dir="1" aria-label="Next review">›</button>'
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div class="reviews-luxe__stage">'
        +'<div class="reviews-luxe__track" id="reviewsTrack">'
          +card('“Absolutely incredible. The pistachio flavor is unreal and the texture is perfect.”','SARAH M.','Google Review · August 2026')
          +card('“Best matcha I’ve ever had. You can tell every ingredient is high quality. Worth every penny.”','JAMES T.','Google Review · September 2026')
          +card('“Such a unique and delicious drink. The staff was amazing and the atmosphere is even better.”','EMILY R.','Google Review · July 2026')
          +card('“The Biscoff frappe is ridiculous in the best way. Rich, cold, and somehow still balanced.”','MARCUS D.','Google Review · June 2026')
          +card('“The kind of place you bring someone back to because you want to see their reaction.”','NINA P.','Google Review · May 2026')
        +'</div>'
        +'<button type="button" class="reviews-luxe__edge reviews-luxe__edge--left" data-dir="-1" aria-label="Previous review">‹</button>'
        +'<button type="button" class="reviews-luxe__edge reviews-luxe__edge--right" data-dir="1" aria-label="Next review">›</button>'
      +'</div>'
      +'<div class="reviews-luxe__footer">'
        +'<div class="reviews-luxe__count"><span id="reviewCount">01</span> / <span>05</span><i></i></div>'
        +'<div class="reviews-luxe__dots" id="reviewDots"></div>'
        +'<div class="reviews-luxe__tag">GOOD THINGS GET<br>PEOPLE TALKING.<i></i></div>'
      +'</div>'
    +'</div>';

  function card(q,name,meta){
    return '<article class="reviews-luxe__card">'
      +'<div class="reviews-luxe__stars" aria-label="Five out of five stars">★★★★★</div>'
      +'<div class="reviews-luxe__quote-mark">”</div>'
      +'<blockquote>'+q+'</blockquote>'
      +'<div class="reviews-luxe__rule"></div>'
      +'<div class="reviews-luxe__name">'+name+'</div>'
      +'<div class="reviews-luxe__meta">'+meta+'</div>'
    +'</article>';
  }

  var style=document.createElement('style');
  style.textContent='\
#reviews.reviews-luxe{position:relative;overflow:hidden;background:radial-gradient(80% 100% at 50% 100%,#172219 0%,#101912 58%,#0a110c 100%);padding:clamp(5rem,9vw,8.5rem) 0 3.2rem;color:var(--marble-100);isolation:isolate}\
#reviews.reviews-luxe:before{content:"";position:absolute;inset:auto -8% 0 -8%;height:36%;background:linear-gradient(to top,rgba(33,54,39,.96),rgba(14,23,17,.15));filter:blur(18px);z-index:-2}\
.reviews-luxe__glow{position:absolute;border-radius:50%;filter:blur(80px);opacity:.18;pointer-events:none;z-index:-3}.reviews-luxe__glow--a{width:34vw;height:34vw;left:-10vw;top:12%;background:#7a8a4c}.reviews-luxe__glow--b{width:28vw;height:28vw;right:-7vw;top:4%;background:#a28442}.reviews-luxe__grain{position:absolute;inset:0;opacity:.07;pointer-events:none;background-image:radial-gradient(circle at 20% 30%,#fff 0 1px,transparent 1.2px),radial-gradient(circle at 70% 80%,#fff 0 1px,transparent 1.2px);background-size:11px 11px,17px 17px;mix-blend-mode:soft-light}.reviews-luxe__inner{position:relative}.reviews-luxe__top{display:grid;grid-template-columns:1fr auto;gap:3rem;align-items:end;margin-bottom:3.8rem}.reviews-luxe__top h2{font-size:clamp(3rem,6.7vw,6.5rem);max-width:8ch;font-weight:500;line-height:.9;letter-spacing:-.045em;margin-top:.7rem}.reviews-luxe__top h2 em{font-style:italic;font-weight:400;color:var(--gold)}.reviews-luxe__kicker{margin-top:1.2rem;font-family:var(--mono);font-size:.72rem;letter-spacing:.28em;color:rgba(232,225,215,.5)}.reviews-luxe__aside{display:flex;flex-direction:column;align-items:flex-end;gap:1.25rem;padding-bottom:.3rem}.reviews-luxe__aside>p{font-family:var(--display);font-size:1rem;line-height:1.4;color:rgba(232,225,215,.78);text-align:left}.reviews-luxe__controls{display:flex;align-items:center;gap:.65rem;font-family:var(--mono);font-size:.68rem;letter-spacing:.14em;color:rgba(232,225,215,.72)}.reviews-luxe__controls>span{margin-right:.2rem}.reviews-luxe__arrow,.reviews-luxe__edge{appearance:none;border:1px solid rgba(201,178,127,.72);background:rgba(10,17,12,.38);color:var(--gold-bright);border-radius:999px;cursor:pointer;display:grid;place-items:center;transition:transform .3s var(--ease-out),background .3s var(--ease),border-color .3s var(--ease)}.reviews-luxe__arrow{width:42px;height:42px;font-size:1.3rem}.reviews-luxe__arrow:hover,.reviews-luxe__edge:hover{transform:translateY(-2px);background:rgba(201,178,127,.1);border-color:var(--gold-bright)}.reviews-luxe__stage{position:relative;min-height:420px;display:grid;align-items:center}.reviews-luxe__track{display:flex;align-items:center;gap:28px;transition:transform .78s cubic-bezier(.16,1,.3,1);will-change:transform;padding:0 max(9vw,110px)}.reviews-luxe__card{position:relative;flex:0 0 min(31vw,430px);min-height:340px;padding:2.25rem 2.1rem 2rem;border:1px solid rgba(201,178,127,.52);border-radius:24px;background:linear-gradient(145deg,rgba(48,56,42,.8),rgba(25,33,25,.86));box-shadow:0 30px 70px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.035);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transform:scale(.9) rotateY(2deg);opacity:.58;transition:transform .78s cubic-bezier(.16,1,.3,1),opacity .55s ease,box-shadow .55s ease}.reviews-luxe__card.is-active{transform:scale(1.06) rotateY(0);opacity:1;box-shadow:0 35px 90px rgba(0,0,0,.42),0 0 0 1px rgba(201,178,127,.11),inset 0 1px 0 rgba(255,255,255,.05)}.reviews-luxe__stars{color:#dbbc73;letter-spacing:.22em;font-size:1rem;margin-bottom:1.15rem}.reviews-luxe__quote-mark{position:absolute;right:1.7rem;top:1rem;font-family:var(--display);font-size:4.2rem;line-height:1;color:rgba(218,185,111,.8)}.reviews-luxe__card blockquote{margin:0;font-family:var(--display);font-size:clamp(1.28rem,1.65vw,1.85rem);line-height:1.35;color:#f0e8dc;max-width:18ch}.reviews-luxe__rule{width:72px;height:1px;background:var(--gold);margin:1.8rem 0 1rem}.reviews-luxe__name{font-family:var(--mono);font-size:.82rem;letter-spacing:.18em;color:#e8e1d7}.reviews-luxe__meta{margin-top:.18rem;font-family:var(--mono);font-size:.7rem;letter-spacing:.04em;color:rgba(232,225,215,.5)}.reviews-luxe__edge{position:absolute;top:50%;width:48px;height:48px;transform:translateY(-50%);font-size:1.5rem;z-index:4}.reviews-luxe__edge:hover{transform:translateY(calc(-50% - 2px))}.reviews-luxe__edge--left{left:1.2rem}.reviews-luxe__edge--right{right:1.2rem}.reviews-luxe__footer{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;margin-top:2.2rem}.reviews-luxe__count,.reviews-luxe__tag{font-family:var(--mono);font-size:.7rem;letter-spacing:.18em;color:rgba(201,178,127,.74);display:flex;align-items:center;gap:.9rem}.reviews-luxe__count i,.reviews-luxe__tag i{display:block;width:82px;height:1px;background:rgba(201,178,127,.6)}.reviews-luxe__tag{justify-self:end;line-height:1.35}.reviews-luxe__dots{display:flex;gap:.45rem;align-items:center}.reviews-luxe__dots button{width:8px;height:8px;border:0;padding:0;border-radius:50%;background:rgba(232,225,215,.16);cursor:pointer;transition:all .25s ease}.reviews-luxe__dots button.is-active{background:var(--gold);transform:scale(1.25)}\
@media(max-width:900px){.reviews-luxe__top{grid-template-columns:1fr}.reviews-luxe__aside{align-items:flex-start}.reviews-luxe__top h2{max-width:9ch}.reviews-luxe__track{padding:0 12vw}.reviews-luxe__card{flex-basis:72vw;min-height:330px}.reviews-luxe__edge{display:none}.reviews-luxe__footer{grid-template-columns:1fr auto}.reviews-luxe__tag{display:none}}\
@media(max-width:620px){#reviews.reviews-luxe{padding-top:4.2rem}.reviews-luxe__top{margin-bottom:2.6rem}.reviews-luxe__top h2{font-size:clamp(2.8rem,15vw,4.8rem)}.reviews-luxe__aside>p{font-size:.95rem}.reviews-luxe__controls>span{display:none}.reviews-luxe__track{padding:0 8vw;gap:16px}.reviews-luxe__card{flex-basis:84vw;min-height:310px;padding:1.8rem 1.5rem}.reviews-luxe__card.is-active{transform:scale(1)}.reviews-luxe__footer{margin-top:1.4rem}}\
@media(prefers-reduced-motion:reduce){.reviews-luxe__track,.reviews-luxe__card{transition:none!important}}';
  document.head.appendChild(style);
  section.className='reviews-luxe';

  var track=document.getElementById('reviewsTrack');
  var cards=[].slice.call(track.children);
  var count=document.getElementById('reviewCount');
  var dots=document.getElementById('reviewDots');
  var index=1;
  cards.forEach(function(_,i){var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Go to review '+(i+1));b.addEventListener('click',function(){go(i)});dots.appendChild(b)});

  function centerOffset(i){
    var card=cards[i], stage=track.parentElement;
    return stage.clientWidth/2-(card.offsetLeft+card.offsetWidth/2);
  }
  function paint(){
    track.style.transform='translate3d('+centerOffset(index)+'px,0,0)';
    cards.forEach(function(c,i){c.classList.toggle('is-active',i===index)});
    [].slice.call(dots.children).forEach(function(d,i){d.classList.toggle('is-active',i===index)});
    count.textContent=String(index+1).padStart(2,'0');
  }
  function go(i){index=(i+cards.length)%cards.length;paint()}
  section.querySelectorAll('[data-dir]').forEach(function(btn){btn.addEventListener('click',function(){go(index+parseInt(btn.getAttribute('data-dir'),10))})});
  var touchX=null;
  track.addEventListener('touchstart',function(e){touchX=e.touches[0].clientX},{passive:true});
  track.addEventListener('touchend',function(e){if(touchX===null)return;var dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>45)go(index+(dx<0?1:-1));touchX=null},{passive:true});
  window.addEventListener('resize',function(){requestAnimationFrame(paint)});
  requestAnimationFrame(paint);
})();

/* Dubai & Dips - the night sky over /team.
   The framework-free version of the 21st.dev "SparklesCore" component:
   the same tsParticles engine and slim bundle it wraps, the same particle
   options (twinkling opacity, circle particles, density-based count, slow
   random movement, retina detection), tuned for a calm sky. Bundled by
   build/build.mjs with esbuild into /vendor/stars.js and served from our
   own files; pages.js loads it only when the header is on screen.
   window.DDStars.start(el, { kind, reduce }) resolves to the container. */
import { tsParticles } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';

/* 85% Off-White, 10% Mint Condition, 5% Browned Sugar: picked per star from
   a list of 20 */
const PALETTE = [].concat(Array(17).fill('#FCFBF9'), Array(2).fill('#D1E3D2'), ['#C2835F']);

let ready = null;
function engine() {
  if (!ready) {
    /* tsParticles sizes its canvas by the global devicePixelRatio and has no
       cap; the sky needs no more than 2x, so cap it here (this page only) */
    const real = window.devicePixelRatio || 1;
    if (real > 2) { try { Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 2 }); } catch (e) {} }
    ready = loadSlim(tsParticles);
  }
  return ready;
}

function options(kind, reduce, phone) {
  const sky = kind === 'sky';
  return {
    background: { color: { value: 'transparent' } },
    fullScreen: { enable: false, zIndex: 1 },
    fpsLimit: 60,
    detectRetina: true,
    interactivity: { events: { onClick: { enable: false }, onHover: { enable: false }, resize: { enable: true } } },
    particles: {
      /* density-based count, as in SparklesCore: value stars per 400x400 */
      number: { value: sky ? (phone ? 50 : 100) : (phone ? 260 : 520), density: { enable: true, width: 400, height: 400 } },
      paint: { color: { value: sky ? PALETTE : ['#FCFBF9', '#FCFBF9', '#FCFBF9', '#D1E3D2', '#C2835F'] }, fill: { enable: true } },
      shape: { type: 'circle' },
      size: { value: sky ? { min: .4, max: 1.4 } : { min: .3, max: 1 } },
      opacity: {
        value: { min: .1, max: 1 },
        animation: { enable: !reduce, speed: sky ? 1 : 2, sync: false, startValue: 'random', mode: 'auto', destroy: 'none' }
      },
      move: {
        enable: !reduce,
        direction: 'none',
        random: true,
        straight: false,
        speed: { min: .05, max: .25 },
        outModes: { default: 'out' }
      },
      collisions: { enable: false }
    }
  };
}

window.DDStars = {
  async start(el, o) {
    o = o || {};
    await engine();
    const container = await tsParticles.load({ id: el.id, element: el, options: options(o.kind || 'sky', !!o.reduce, !!o.phone) });
    /* reduced motion: one frame, drawn and left alone */
    if (o.reduce && container) { container.draw(true); container.pause(); }
    return container;
  }
};

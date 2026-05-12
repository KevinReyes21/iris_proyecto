/* ── CURSOR ── */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursor-ring');

let mx = 0, my = 0;
let rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;

  cursor.style.transform =
    `translate(${mx - 4}px, ${my - 4}px)`;
});

function animateRing() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;

  ring.style.transform =
    `translate(${rx - 18}px, ${ry - 18}px)`;

  requestAnimationFrame(animateRing);
}

animateRing();

/* Hover cursor */
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => {
    ring.classList.add('hover');
  });

  el.addEventListener('mouseleave', () => {
    ring.classList.remove('hover');
  });
});


/* ── PARTÍCULAS ── */
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');

let W, H;
let particles = [];

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

resize();

window.addEventListener('resize', resize);

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;

    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;

    this.r = Math.random() * 1.2 + 0.3;
    this.a = Math.random() * 0.4 + 0.1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (
      this.x < 0 || this.x > W ||
      this.y < 0 || this.y > H
    ) {
      this.reset();
    }
  }

  draw() {
    ctx.beginPath();

    ctx.arc(
      this.x,
      this.y,
      this.r,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      `rgba(0,200,150,${this.a})`;

    ctx.fill();
  }
}

for (let i = 0; i < 80; i++) {
  particles.push(new Particle());
}

function connectParticles() {
  for (let i = 0; i < particles.length; i++) {

    for (let j = i + 1; j < particles.length; j++) {

      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;

      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < 120) {

        ctx.beginPath();

        ctx.moveTo(
          particles[i].x,
          particles[i].y
        );

        ctx.lineTo(
          particles[j].x,
          particles[j].y
        );

        ctx.strokeStyle =
          `rgba(0,200,150,${0.08 * (1 - d / 120)})`;

        ctx.lineWidth = 0.5;

        ctx.stroke();
      }
    }
  }
}

function animateParticles() {

  ctx.clearRect(0, 0, W, H);

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  connectParticles();

  requestAnimationFrame(animateParticles);
}

animateParticles();


/* ── HEADER SCROLL ── */
window.addEventListener('scroll', () => {

  document
    .getElementById('header')
    .classList.toggle(
      'scrolled',
      window.scrollY > 60
    );

});


/* ── SCROLL REVEAL ── */
const observer = new IntersectionObserver(entries => {

  entries.forEach(entry => {

    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }

  });

}, {
  threshold: 0.12
});

document
  .querySelectorAll('.reveal')
  .forEach(el => observer.observe(el));


/* ── HERO VISIBLE AL CARGAR ── */
window.addEventListener('load', () => {

  setTimeout(() => {

    document
      .querySelectorAll('.hero .reveal')
      .forEach((el, i) => {

        setTimeout(() => {
          el.classList.add('visible');
        }, i * 150);

      });

  }, 200);

});
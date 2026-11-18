'use strict';

const deck = document.querySelector('[data-hero-deck]');
const slides = [...deck.querySelectorAll('[data-hero-slide]')];
const buttons = [...deck.querySelectorAll('[data-slide-target]')];
const controls = deck.querySelector('.hero-slide-controls');
const playback = deck.querySelector('#hero-playback');
const photos = [...deck.querySelectorAll('[data-hero-photo]')];
const winter = slides[1];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const frameDelay = 4000;

let current = 0;
let currentPhoto = 0;
let slideshowPaused = reduced.matches;
let snowPaused = reduced.matches;
let inView = !('IntersectionObserver' in window);
let firstReady = photos[0].complete;
let timer;
let generation = 0;

function updatePlaybackButton() {
  const showPool = current === 0;
  const paused = showPool ? slideshowPaused : snowPaused;
  const label = (paused ? 'Включить' : 'Приостановить') + (showPool ? ' слайд-шоу' : ' снег');
  playback.hidden = !showPool && reduced.matches;
  playback.setAttribute('aria-label', label);
  playback.title = label;
  playback.textContent = paused ? '▶' : 'Ⅱ';
}

function syncPlayback() {
  clearTimeout(timer);
  generation++;
  const sceneVisible = !document.hidden && inView;
  winter.classList.toggle('snow-paused', current !== 1 || !sceneVisible || snowPaused);
  if (sceneVisible && current === 0 && !slideshowPaused && firstReady) {
    timer = setTimeout(changePhoto, frameDelay);
  }
  updatePlaybackButton();
}

function showPhoto(index) {
  currentPhoto = index;
  photos.forEach((photo, photoIndex) => {
    const active = photoIndex === index;
    photo.classList.toggle('is-active', active);
    photo.setAttribute('aria-hidden', String(!active));
  });
}

async function changePhoto() {
  const request = ++generation;
  for (let offset = 1; offset < photos.length; offset++) {
    const index = (currentPhoto + offset) % photos.length;
    try {
      await photos[index].decode();
    } catch {
      if (request !== generation) return;
      continue;
    }
    if (request !== generation) return;
    showPhoto(index);
    break;
  }
  syncPlayback();
}

function showSlide(index) {
  current = index;
  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === index;
    slide.classList.toggle('is-current', active);
    slide.inert = !active;
    slide.setAttribute('aria-hidden', String(!active));
    buttons[slideIndex].setAttribute('aria-pressed', String(active));
  });
  syncPlayback();
}

buttons.forEach((button, index) => button.addEventListener('click', () => showSlide(index)));
playback.addEventListener('click', () => {
  if (current === 0) slideshowPaused = !slideshowPaused;
  else snowPaused = !snowPaused;
  syncPlayback();
});

function startWhenReady() {
  firstReady = true;
  syncPlayback();
}
photos[0].addEventListener('load', startWhenReady, {once: true});
photos[0].addEventListener('error', startWhenReady, {once: true});
reduced.addEventListener('change', event => {
  if (event.matches) slideshowPaused = true;
  snowPaused = event.matches;
  syncPlayback();
});
document.addEventListener('visibilitychange', syncPlayback);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncPlayback();
  }, {threshold: 0.08}).observe(deck);
}

const snow = winter.querySelector('.winter-snow');
const flakes = document.createDocumentFragment();
for (let index = 0; index < 34; index++) {
  const flake = document.createElement('i');
  const size = index % 7 === 0 ? 9 : 2 + index % 5;
  flake.style.setProperty('--flake-x', (index * 47 % 104) + '%');
  flake.style.setProperty('--flake-size', size + 'px');
  flake.style.setProperty('--flake-drift', (index * 29 % 124 - 62) + 'px');
  flake.style.setProperty('--flake-duration', (9 + index % 10) + 's');
  flake.style.setProperty('--flake-phase', '-' + (index * 13 % 29) + 's');
  flakes.append(flake);
}
snow.append(flakes);
controls.hidden = false;
showSlide(0);

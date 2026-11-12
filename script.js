const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Открыть меню' : 'Закрыть меню');
  mobileNav.hidden = isOpen;
});

mobileNav.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
  }
});

document.querySelector('#year').textContent = new Date().getFullYear();

const filters = document.querySelectorAll('.catalog-filter');
const productCards = document.querySelectorAll('.product[data-category]');
filters.forEach((button) => button.addEventListener('click', () => {
  const category = button.dataset.category;
  filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  productCards.forEach((card) => { card.hidden = category !== 'Все' && card.dataset.category !== category; });
}));

const photoDialog = document.querySelector('#photo-dialog');
const photoLarge = document.querySelector('#photo-large');
const photoCaption = document.querySelector('#photo-caption');
document.querySelectorAll('[data-zoom]').forEach((link) => link.addEventListener('click', (event) => {
  if (typeof photoDialog.showModal !== 'function') return;
  event.preventDefault();
  photoLarge.src = link.href;
  photoLarge.alt = link.querySelector('img').alt;
  photoCaption.textContent = photoLarge.alt;
  photoDialog.showModal();
}));
photoDialog.querySelector('.photo-close').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', (event) => { if (event.target === photoDialog) photoDialog.close(); });

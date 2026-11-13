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

const grid = document.querySelector('#product-grid');
const filterGroup = document.querySelector('.catalog-filters');
const search = document.querySelector('#catalog-search');
const subcategory = document.querySelector('#catalog-subcategory');
const status = document.querySelector('#catalog-status');
const more = document.querySelector('#show-more');
const photoDialog = document.querySelector('#photo-dialog');
const photoLarge = document.querySelector('#photo-large');
const photoCaption = document.querySelector('#photo-caption');
const photoQuality = document.querySelector('#photo-quality');
const photoError = document.querySelector('#photo-error');
const photoNavigation = document.querySelector('#photo-navigation');
const photoCount = document.querySelector('#photo-count');
let gallery = [];
let galleryIndex = 0;

function showGalleryPhoto() {
  photoError.hidden = true;
  photoLarge.hidden = false;
  photoQuality.hidden = true;
  photoLarge.src = gallery[galleryIndex];
  photoCount.textContent = `${galleryIndex + 1} / ${gallery.length}`;
  photoNavigation.hidden = gallery.length < 2;
}
photoLarge.addEventListener('load', () => {
  photoQuality.hidden = photoLarge.naturalWidth > 400 && photoLarge.naturalHeight > 400;
});
photoLarge.addEventListener('error', () => {
  photoLarge.hidden = true;
  photoQuality.hidden = true;
  photoError.hidden = false;
});
document.querySelector('#photo-prev').addEventListener('click', () => { galleryIndex = (galleryIndex + gallery.length - 1) % gallery.length; showGalleryPhoto(); });
document.querySelector('#photo-next').addEventListener('click', () => { galleryIndex = (galleryIndex + 1) % gallery.length; showGalleryPhoto(); });
const products = [...(Array.isArray(window.VK_PRODUCTS) ? window.VK_PRODUCTS : []), ...(Array.isArray(window.CATALOG) ? window.CATALOG : [])];
const categories = ['Все', 'Диваны', 'Кухни', 'Шкафы', 'Спальня', 'Гостиная', 'Детская', 'Прихожая', 'Комоды'];
const pageSize = 24;
let category = 'Все';
let visibleCount = pageSize;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function updateSubcategories() {
  const values = [...new Set(products.filter((p) => category === 'Все' || p.category === category).map((p) => p.subcategory).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
  subcategory.replaceChildren(new Option('Все подразделы', ''), ...values.map((value) => new Option(value, value)));
}

categories.forEach((name) => {
  const button = element('button', 'catalog-filter', name);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(name === category));
  button.addEventListener('click', () => {
    category = name;
    filterGroup.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    updateSubcategories();
    visibleCount = pageSize;
    render();
  });
  filterGroup.append(button);
});

function makeCard(product) {
  const card = element('article', 'product');
  const placeholder = () => element('div', 'product-photo product-placeholder', 'Фото пока нет');
  const imageUrl = product.image || (product.images && product.images[0]);
  if (imageUrl) {
    const photo = element('a', 'product-photo');
    photo.href = imageUrl;
    photo.setAttribute('aria-label', 'Увеличить фото: ' + product.name);
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = product.name;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      if (product.thumbnail && img.getAttribute('src') !== product.thumbnail) {
        img.src = product.thumbnail;
        photo.href = product.thumbnail;
      } else if (product.images && product.images.length > 1) {
        img.hidden = true;
        photo.append(element('span', 'photo-unavailable', 'Фото временно недоступно · открыть галерею'));
      } else {
        photo.replaceWith(placeholder());
      }
    });
    photo.append(img, element('span', 'zoom-hint', '⤢'));
    photo.addEventListener('click', (event) => {
      if (typeof photoDialog.showModal !== 'function') return;
      event.preventDefault();
      gallery = product.images && product.images.length ? product.images : [photo.href];
      galleryIndex = 0;
      photoLarge.alt = product.name;
      photoCaption.textContent = product.name;
      showGalleryPhoto();
      photoDialog.showModal();
    });
    card.append(photo);
  } else card.append(placeholder());
  const body = element('div', 'product-body');
  body.append(element('span', 'product-type', product.category + (product.sku ? ' · АРТ. ' + product.sku : '')));
  body.append(element('h3', '', product.name));
  if (product.variant) body.append(element('p', '', 'Вариант: ' + product.variant));
  if (product.order) body.append(element('span', 'product-order', product.order));
  if (Array.isArray(product.description) && product.description.length) {
    const details = element('details', 'product-details');
    details.open = true;
    details.append(element('summary', '', 'Описание и характеристики'));
    const list = element('ul', '');
    product.description.forEach((line) => list.append(element('li', '', line)));
    details.append(list);
    body.append(details);
  }
  if (product.source) {
    const source = element('a', 'product-source', 'Публикация магазина ↗');
    source.href = product.source;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    body.append(source);
  }
  const footer = element('div', 'product-footer');
  const price = element('div', 'product-price-wrap');
  price.append(element('span', 'price-label', 'СТОИМОСТЬ'), element('strong', 'product-price', product.price === null ? 'Цена по запросу' : new Intl.NumberFormat('ru-RU').format(product.price) + ' ₽'));
  footer.append(price);
  const contact = element('a', '', 'УЗНАТЬ О ТОВАРЕ ↗');
  contact.href = 'tel:+79649513591';
  contact.setAttribute('aria-label', 'Узнать о товаре: ' + product.name);
  footer.append(contact);
  body.append(footer);
  card.append(body);
  return card;
}

function render() {
  const query = search.value.trim().toLocaleLowerCase('ru');
  const filtered = products.filter((p) => (category === 'Все' || p.category === category) && (!subcategory.value || p.subcategory === subcategory.value) && [p.name, p.variant, p.sku, p.subcategory].join(' ').toLocaleLowerCase('ru').includes(query));
  grid.replaceChildren(...filtered.slice(0, visibleCount).map(makeCard));
  status.textContent = products.length ? `Найдено: ${filtered.length} · Показано: ${Math.min(visibleCount, filtered.length)}` : 'Не удалось загрузить каталог. Пожалуйста, позвоните нам.';
  more.hidden = visibleCount >= filtered.length;
}
search.addEventListener('input', () => { visibleCount = pageSize; render(); });
subcategory.addEventListener('change', () => { visibleCount = pageSize; render(); });
more.addEventListener('click', () => { visibleCount += pageSize; render(); });
photoDialog.querySelector('.photo-close').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', (event) => { if (event.target === photoDialog) photoDialog.close(); });
updateSubcategories();
render();

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
const products = Array.isArray(window.CATALOG) ? window.CATALOG : [];
const categories = ['Все', 'Кухни', 'Диваны и кресла', 'Шкафы', 'Спальня', 'Гостиная', 'Детская', 'Прихожая', 'Комоды'];
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
  if (product.image) {
    const photo = element('a', 'product-photo');
    photo.href = product.image;
    photo.setAttribute('aria-label', 'Увеличить фото: ' + product.name);
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      if (product.thumbnail && img.getAttribute('src') !== product.thumbnail) {
        img.src = product.thumbnail;
        photo.href = product.thumbnail;
      } else {
        photo.replaceWith(placeholder());
      }
    });
    photo.append(img, element('span', 'zoom-hint', '⤢'));
    photo.addEventListener('click', (event) => {
      if (typeof photoDialog.showModal !== 'function') return;
      event.preventDefault();
      photoLarge.src = photo.href;
      photoLarge.alt = product.name;
      photoCaption.textContent = product.name;
      photoQuality.hidden = !img.naturalWidth || (img.naturalWidth > 400 && img.naturalHeight > 400);
      photoDialog.showModal();
    });
    card.append(photo);
  } else card.append(placeholder());
  const body = element('div', 'product-body');
  body.append(element('span', 'product-type', product.category + (product.sku ? ' · АРТ. ' + product.sku : '')));
  body.append(element('h3', '', product.name));
  if (product.variant) body.append(element('p', '', 'Вариант: ' + product.variant));
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

#!/usr/bin/env python3
"""Build catalog.js and thumbnails from the supplied CSV and PDF.

Requires PyMuPDF. Example: python tools/import_catalog.py input.csv input.pdf
The optional high-resolution URL map preserves previously curated images by article.
"""
import collections
import csv
import hashlib
import json
from pathlib import Path
import re
import sys

import pymupdf

ROOT = Path(__file__).resolve().parent.parent

def normalize(value):
    return re.sub(r'\s+', '', value).casefold().replace('ё', 'е')

def main(csv_path, pdf_path):
    with open(csv_path, encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f, delimiter=';'))
    lookup = collections.defaultdict(list)
    for i, row in enumerate(rows):
        lookup[row['Ссылка'].split('?')[0]].append(i)
    photos = {}
    matched = set()
    ambiguous = 0
    pdf = pymupdf.open(pdf_path)
    output = ROOT / 'assets/catalog'
    output.mkdir(parents=True, exist_ok=True)
    for page in pdf:
        links = sorted((link for link in page.get_links() if '/katalog/' in link.get('uri', '')), key=lambda link: link['from'].y0)
        blocks = page.get_text('dict')['blocks']
        for j, link in enumerate(links):
            y = link['from'].y0
            low = (links[j-1]['from'].y0 + y) / 2 if j else y - 17
            high = (links[j+1]['from'].y0 + y) / 2 if j + 1 < len(links) else y + 17
            title = page.get_text('text', clip=pymupdf.Rect(106, low, 680, high)).split('/katalog/')[0]
            candidates = [i for i in lookup[link['uri'].split('?')[0]] if normalize(title).endswith(normalize(rows[i]['Наименование']))]
            if len(candidates) > 1:
                right = page.get_text('text', clip=pymupdf.Rect(680, low, page.rect.width, high))
                by_sku = [i for i in candidates if rows[i]['Артикул'] and re.search(r'(?<!\d)' + re.escape(rows[i]['Артикул']) + r'(?!\d)', right)]
                if by_sku:
                    candidates = by_sku
            if len(candidates) != 1 or candidates[0] in matched:
                ambiguous += 1
                continue
            i = candidates[0]
            matched.add(i)
            images = [block for block in blocks if block['type'] == 1 and 50 <= block['bbox'][0] < 106 and low < (block['bbox'][1] + block['bbox'][3]) / 2 < high]
            if len(images) != 1:
                continue
            image = images[0]
            if image['ext'] not in ('jpeg', 'jpg', 'png'):
                continue
            digest = hashlib.sha256(image['image']).hexdigest()[:20]
            ext = 'jpg' if image['ext'] == 'jpeg' else image['ext']
            name = f'{digest}.{ext}'
            (output / name).write_bytes(image['image'])
            photos[i] = f'assets/catalog/{name}'
    highres = json.loads((ROOT / 'tools/highres_images.json').read_text(encoding='utf-8'))
    products = []
    for i, row in enumerate(rows):
        if (re.search(r'\bадель\b', row['Наименование'], re.I) and row['Раздел'] == 'Кухни') or re.search(r'диван', row['Наименование'], re.I):
            continue
        thumbnail = photos.get(i, '')
        products.append({'category': row['Раздел'], 'subcategory': row['Подраздел'], 'name': row['Наименование'], 'sku': row['Артикул'], 'variant': row['Вариант'], 'price': int(row['Цена, руб']) if row['Цена, руб'] else None, 'image': highres.get(row['Артикул'], thumbnail), 'thumbnail': thumbnail})
    # Data is JavaScript rather than fetched JSON so the catalog also works when opened as a local file.
    (ROOT / 'data/catalog.js').write_text('window.CATALOG = ' + json.dumps(products, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'CSV rows: {len(rows)}, catalog: {len(products)}, PDF rows matched: {len(matched)}, unresolved: {ambiguous}, with images: {sum(bool(p["image"]) for p in products)}, missing prices: {sum(p["price"] is None for p in products)}')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: import_catalog.py input.csv input.pdf')
    main(*sys.argv[1:])

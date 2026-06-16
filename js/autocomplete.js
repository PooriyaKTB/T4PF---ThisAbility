/* Nominatim address autocomplete — debounced, keyboard-navigable, ARIA-compliant.
   TOU: max 1 req/s; 400 ms debounce keeps us well inside the limit. */

const NOM = 'https://nominatim.openstreetmap.org/search';

const _query = async (q) => {
  const p = new URLSearchParams({
    q, format: 'json', limit: '5', countrycodes: 'gb', addressdetails: '1',
  });
  const res = await fetch(`${NOM}?${p}`, {
    headers: { 'Accept-Language': 'en-GB' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(res.status);
  return res.json();
};

const _label = (item) => {
  const a = item.address || {};
  const primary = a.road || a.pedestrian || a.footway || a.amenity || a.tourism || a.leisure;
  const area    = a.suburb || a.neighbourhood || a.city_district || a.quarter;
  const city    = a.city || a.town || a.village;
  const parts   = [primary, area, city].filter(Boolean);
  return parts.length
    ? parts.join(', ')
    : item.display_name.split(',').slice(0, 2).join(',').trim();
};

const _sub = (item) => {
  const a = item.address || {};
  return [a.postcode].filter(Boolean).join(' · ');
};

/* Creates a Nominatim autocomplete on `inputEl`.
   `onSelect(label, lat, lng)` is called when the user confirms a result.
   Returns a teardown function. */
export const createAutocomplete = (inputEl, onSelect) => {
  let _timer = null;
  let _idx   = -1;
  let _items = [];
  let _ul    = null;

  const close = () => {
    _ul?.remove();
    _ul = null; _idx = -1; _items = [];
  };

  const pick = (i) => {
    const it = _items[i];
    if (!it) return;
    const lbl = _label(it);
    inputEl.value = lbl;
    onSelect(lbl, parseFloat(it.lat), parseFloat(it.lon));
    close();
  };

  const highlight = (i) => {
    _ul?.querySelectorAll('.ac-item').forEach((li, j) => {
      li.classList.toggle('active', j === i);
      li.setAttribute('aria-selected', String(j === i));
    });
  };

  const render = (items) => {
    close();
    if (!items.length) return;
    _items = items;
    const id = `ac-list-${Math.random().toString(36).slice(2)}`;
    _ul = document.createElement('ul');
    _ul.className = 'ac-list';
    _ul.id = id;
    _ul.setAttribute('role', 'listbox');
    inputEl.setAttribute('aria-autocomplete', 'list');
    inputEl.setAttribute('aria-controls', id);

    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'ac-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      const sub = _sub(it);
      li.innerHTML = `<i class="fas fa-location-dot" aria-hidden="true"></i><span class="ac-primary">${_label(it)}</span>${sub ? `<span class="ac-secondary">${sub}</span>` : ''}`;
      li.addEventListener('mousedown', (e) => { e.preventDefault(); pick(i); });
      _ul.appendChild(li);
    });

    inputEl.closest('.routing-input').appendChild(_ul);
  };

  const doFetch = (q) => _query(q).then(render).catch(() => {});

  inputEl.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    clearTimeout(_timer);
    if (q.length < 3) { close(); return; }
    _timer = setTimeout(() => doFetch(q), 400);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (!_ul) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _idx = Math.min(_idx + 1, _items.length - 1);
      highlight(_idx);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _idx = Math.max(_idx - 1, 0);
      highlight(_idx);
    } else if (e.key === 'Enter' && _idx >= 0) {
      e.preventDefault();
      pick(_idx);
    } else if (e.key === 'Escape') {
      close();
    }
  });

  inputEl.addEventListener('blur', () => setTimeout(close, 160));

  return close;
};

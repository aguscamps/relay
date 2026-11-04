const demo = document.getElementById('demo');
const form = demo.querySelector('form');
const formView = demo.querySelector('[data-view="form"]');
const doneView = demo.querySelector('[data-view="done"]');
const submit = form.querySelector('[type="submit"]');

const messages = {
  email: {
    empty: 'Enter your work email.',
    invalid: 'Enter an email like name@company.com.',
    personal: 'Use your work email. Personal addresses like Gmail or Outlook aren\'t accepted.',
  },
  name: { empty: 'Enter your full name.', invalid: 'Your name shouldn\'t include numbers.' },
  'industry-other': { empty: 'Tell us your industry.' },
  phone: { empty: '', invalid: 'Enter a valid phone number, including the area code.', country: 'Select your country code.' },
  company: { empty: 'Enter your company name.' },
  industry: { empty: 'Select your industry.' },
  size: { empty: 'Select the number of employees.' },
};

// Dominios de correo personal: la demo es para empresas, así que se pide el correo laboral.
const personalDomains = ['gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com', 'yahoo.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'yandex.com', 'mail.com'];

function errorFor(field) {
  const value = field.value.trim();
  if (!value) return field.required ? messages[field.name].empty : '';
  if (field.name === 'email') {
    if (field.validity.typeMismatch || !/@[^@\s]+\.[^@\s]+$/.test(value)) return messages.email.invalid;
    const domain = value.split('@').pop().toLowerCase();
    // También las variantes por país del mismo proveedor (hotmail.com.ar, yahoo.co.uk), pero no
    // subdominios de empresas como mail.acme.com: después del nombre solo puede venir el sufijo del país.
    const isPersonal = personalDomains.some((d) => domain === d
      || new RegExp(`^${d.split('.')[0]}\\.(com?\\.)?[a-z]{2,3}$`).test(domain));
    if (isPersonal) return messages.email.personal;
  }
  if (field.name === 'name' && /\d/.test(value)) return messages.name.invalid;
  if (field.name === 'phone') {
    const digits = value.replace(/\D/g, '');
    if (!/^[\d\s().-]+$/.test(value) || digits.length < 6 || digits.length > 14) return messages.phone.invalid;
    if (!phoneCountry.value) return messages.phone.country;
  }
  return '';
}

// «Other» en el rubro abre un campo opcional para escribirlo.
const industryField = form.querySelector('#industry');
const industryOther = document.getElementById('industry-other-field');
industryField.addEventListener('change', () => {
  const isOther = industryField.value === 'Other';
  industryOther.hidden = !isOther;
  const input = document.getElementById('industry-other');
  input.required = isOther;
  if (!isOther) {
    input.removeAttribute('aria-invalid');
    document.getElementById('industry-other-error').hidden = true;
  }
});

// Código de país: se elige por nombre del país (reconocer, no recordar). Se ordena por nombre
// y arranca con el país del navegador, si se puede deducir.
const phoneCountry = document.getElementById('phone-country');
const regionNames = 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
Object.entries(COUNTRY_CODES)
  .map(([region, code]) => ({ region, code, name: (regionNames && regionNames.of(region)) || region }))
  .sort((a, b) => a.name.localeCompare(b.name))
  .forEach(({ region, code, name }) => phoneCountry.add(new Option(`${name} +${code}`, region)));
const browserRegion = (navigator.language.split('-')[1] || '').toUpperCase();
if (COUNTRY_CODES[browserRegion]) phoneCountry.value = browserRegion;
// En la lista se ve «Argentina +54»; una vez elegido, el campo muestra solo «+54» para ocupar poco.
// El valor accesible sigue siendo el nombre completo; lo corto es solo visual.
const phoneCountryValue = document.querySelector('.phone-country__value');
const showPhoneCode = () => {
  const code = COUNTRY_CODES[phoneCountry.value];
  phoneCountryValue.textContent = code ? `+${code}` : 'Code';
  // El ejemplo cambia con el país: un número argentino no le sirve a quien eligió +49.
  const example = PHONE_EXAMPLES[phoneCountry.value];
  document.getElementById('phone').placeholder = example ? `e.g. ${example}` : '';
};
showPhoneCode();
phoneCountry.addEventListener('change', () => {
  showPhoneCode();
  const phone = document.getElementById('phone');
  if (phone.hasAttribute('aria-invalid')) validate(phone);
});

// Empresas de menos de 1000 empleados: no es un error, pero se avisa para qué tamaño está pensado Relay.
const sizeField = form.querySelector('#size');
const sizeNote = document.getElementById('size-note');
sizeField.addEventListener('change', () => {
  sizeNote.textContent = sizeField.value === 'Under 1,000'
    ? 'Relay is built for organizations with 1,000+ employees, but you can still send your request.'
    : '';
});

function validate(field) {
  const text = errorFor(field);
  const error = document.getElementById(`${field.id}-error`);
  field.toggleAttribute('aria-invalid', Boolean(text));
  if (text) field.setAttribute('aria-invalid', 'true');
  error.textContent = text;
  error.hidden = !text;
  return !text;
}

// Los obligatorios se leen en cada uso: «Your industry» solo lo es cuando se elige «Other».
const requiredFields = () => [...form.querySelectorAll('[required]')];

form.querySelectorAll('input, select').forEach((field) => {
  if (!document.getElementById(`${field.id}-error`)) return;
  field.addEventListener('blur', () => { if (field.value) validate(field); });
  ['input', 'change'].forEach((type) => {
    field.addEventListener(type, () => { if (field.hasAttribute('aria-invalid')) validate(field); });
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  // El teléfono es opcional: solo se valida si se completó.
  const phone = document.getElementById('phone');
  const toCheck = [...requiredFields(), ...(phone.value.trim() ? [phone] : [])];
  const invalid = toCheck.filter((field) => !validate(field));
  if (invalid.length) {
    invalid[0].focus();
    return;
  }
  submit.setAttribute('aria-busy', 'true');
  submit.disabled = true;
  submit.textContent = 'Sending…';
  document.getElementById('demo-status').textContent = 'Sending your request…';
  // La confirmación muestra el correo escrito: si hay un error de tipeo, se ve acá.
  doneView.querySelector('[data-sent-email]').textContent = form.elements.email.value.trim();
  setTimeout(() => {
    formView.hidden = true;
    doneView.hidden = false;
    demo.classList.add('is-done');
    demo.querySelector('.demo__steps li').classList.add('is-current');
    doneView.querySelector('h2').focus();
  }, 900);
});

function reset() {
  form.reset();
  // form.reset() vuelve el código de país a vacío: se repone el del navegador y su ejemplo.
  if (COUNTRY_CODES[browserRegion]) phoneCountry.value = browserRegion;
  showPhoneCode();
  form.querySelectorAll('[aria-invalid]').forEach((field) => {
    field.removeAttribute('aria-invalid');
    document.getElementById(`${field.id}-error`).hidden = true;
  });
  submit.removeAttribute('aria-busy');
  submit.disabled = false;
  submit.textContent = 'Request a demo';
  document.getElementById('demo-status').textContent = '';
  sizeNote.textContent = '';
  industryOther.hidden = true;
  formView.hidden = false;
  doneView.hidden = true;
  demo.classList.remove('is-done');
  demo.querySelector('.demo__steps li').classList.remove('is-current');
}

// «Edit it»: vuelve al formulario con los datos tal cual y el foco en el correo, sin reiniciar nada.
doneView.querySelector('[data-edit-email]').addEventListener('click', () => {
  submit.removeAttribute('aria-busy');
  submit.disabled = false;
  submit.textContent = 'Request a demo';
  document.getElementById('demo-status').textContent = '';
  doneView.hidden = true;
  formView.hidden = false;
  demo.classList.remove('is-done');
  demo.querySelector('.demo__steps li').classList.remove('is-current');
  form.elements.email.focus();
  form.elements.email.select();
});

// Transformación del contenedor: un fondo blanco sale de la barra (o desde abajo, si la barra
// no está a la vista), crece y se centra; el contenido aparece cuando llega. Al cerrar, el
// recorrido es el inverso. Con «reducir movimiento» se abre y se cierra sin animación.
const bar = document.querySelector('.floating-cta');
// ?static muestra todo en su estado final, sin animaciones: sirve para importar la página a Figma.
const reduceMotion = { matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('static') };
const BAR_RADIUS = '20px 20px 0 0';
let morphing = false;

function hiddenBarRect() {
  const gutter = window.innerWidth <= 760 ? 0 : 32;
  const width = Math.min(860, window.innerWidth - 2 * gutter);
  return { left: (window.innerWidth - width) / 2, top: window.innerHeight, width, height: 76 };
}

function barTarget() {
  if (!bar.classList.contains('is-visible')) return { rect: hiddenBarRect(), radius: BAR_RADIUS };
  const radius = bar.classList.contains('is-docked') ? '999px' : BAR_RADIUS;
  return { rect: bar.getBoundingClientRect(), radius };
}

function frame({ rect, radius }) {
  return { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: radius };
}

function morph(from, to, options) {
  const ghost = document.createElement('div');
  ghost.className = 'demo-ghost';
  demo.append(ghost);
  const animation = ghost.animate([frame(from), frame(to)], { fill: 'both', ...options });
  return animation.finished.then(() => ghost.remove());
}

function openDemo() {
  if (demo.open || morphing) return;
  if (reduceMotion.matches) {
    demo.showModal();
    return;
  }
  morphing = true;
  const from = barTarget();
  demo.classList.add('is-ghosting');
  demo.showModal();
  const to = { rect: demo.getBoundingClientRect(), radius: getComputedStyle(demo).borderRadius };
  // Sin transición: la barra tiene que desaparecer en el acto, no al terminar su propia animación.
  bar.style.transition = 'none';
  bar.style.visibility = 'hidden';
  morph(from, to, { duration: 450, easing: 'cubic-bezier(.2, .8, .2, 1)' }).then(() => {
    demo.classList.remove('is-ghosting');
    morphing = false;
  });
}

function closeDemo() {
  if (!demo.open || morphing) return;
  if (reduceMotion.matches) {
    bar.style.visibility = '';
    demo.close();
    return;
  }
  morphing = true;
  const from = { rect: demo.getBoundingClientRect(), radius: getComputedStyle(demo).borderRadius };
  const to = barTarget();
  demo.classList.add('is-ghosting', 'is-closing');
  morph(from, to, { duration: 380, easing: 'cubic-bezier(.4, 0, .2, 1)', delay: 150 }).then(() => {
    // La barra vuelve a verse antes de cerrar, para que el foco pueda regresar a su botón.
    bar.style.visibility = '';
    demo.close();
    demo.classList.remove('is-ghosting', 'is-closing');
    morphing = false;
  });
}

document.querySelectorAll('[data-open-demo]').forEach((button) => {
  button.addEventListener('click', openDemo);
});
document.querySelectorAll('[data-close-demo]').forEach((button) => {
  button.addEventListener('click', closeDemo);
});
// Un clic en el fondo oscuro (fuera del panel) también cierra. Lo escrito se conserva.
demo.addEventListener('click', (event) => {
  if (event.target !== demo) return;
  const box = demo.getBoundingClientRect();
  const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  if (outside) closeDemo();
});
demo.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeDemo();
});
demo.addEventListener('close', () => {
  bar.style.visibility = '';
  requestAnimationFrame(() => { bar.style.transition = ''; });
});
// Si se cierra sin enviar, se conserva lo escrito; solo se limpia después de enviar.
demo.addEventListener('close', () => { if (!doneView.hidden) reset(); });

const ctaBar = bar;

new IntersectionObserver(([entry]) => {
  ctaBar.classList.toggle('is-visible', !entry.isIntersecting);
}).observe(document.querySelector('[data-cta-watch]'));

new IntersectionObserver(([entry]) => {
  ctaBar.classList.toggle('is-docked', entry.isIntersecting);
}).observe(document.querySelector('.cta-sentinel'));

const toTop = document.querySelector('.to-top');
const showToTop = () => toTop.classList.toggle('is-visible', window.scrollY > window.innerHeight);
showToTop();
window.addEventListener('scroll', showToTop, { passive: true });

const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.getElementById('site-nav');
const setMenu = (open) => {
  menuToggle.setAttribute('aria-expanded', String(open));
  siteNav.classList.toggle('is-open', open);
};
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
siteNav.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && siteNav.classList.contains('is-open')) { setMenu(false); menuToggle.focus(); }
});

// Selector de idioma: combobox de solo selección (patrón de WAI-ARIA), con sigla y nombre.
// Para el ejercicio cambia la etiqueta; en el sitio real llevaría a la versión traducida.
const langButton = document.querySelector('.lang__button');
const langList = document.getElementById('lang-list');
const langOptions = [...langList.querySelectorAll('[role="option"]')];
let langActive = 0;
// La lista vive fuera de la cabecera: si quedara adentro, el navegador no puede desenfocar
// lo que tiene detrás (la cabecera ya tiene su propio desenfoque).
document.body.append(langList);
function placeLang() {
  const box = langButton.getBoundingClientRect();
  langList.style.top = `${box.bottom + 8}px`;
  langList.style.right = `${document.documentElement.clientWidth - box.right}px`;
}
window.addEventListener('resize', () => { if (!langList.hidden) placeLang(); });

function setLangActive(index) {
  langActive = (index + langOptions.length) % langOptions.length;
  langOptions.forEach((option, i) => option.classList.toggle('is-active', i === langActive));
  langButton.setAttribute('aria-activedescendant', langOptions[langActive].id);
}
function openLang() {
  placeLang();
  langList.hidden = false;
  langButton.setAttribute('aria-expanded', 'true');
  setLangActive(langOptions.findIndex((o) => o.getAttribute('aria-selected') === 'true'));
}
function closeLang() {
  langList.hidden = true;
  langButton.setAttribute('aria-expanded', 'false');
  langButton.removeAttribute('aria-activedescendant');
}
function chooseLang(index) {
  langOptions.forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
  document.getElementById('lang-value').textContent = langOptions[index].dataset.code;
  closeLang();
  langButton.focus();
}

langButton.addEventListener('click', () => (langList.hidden ? openLang() : closeLang()));
langButton.addEventListener('keydown', (event) => {
  const open = !langList.hidden;
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    if (!open) openLang();
    else setLangActive(langActive + (event.key === 'ArrowDown' ? 1 : -1));
  } else if (event.key === 'Home' && open) { event.preventDefault(); setLangActive(0); }
  else if (event.key === 'End' && open) { event.preventDefault(); setLangActive(langOptions.length - 1); }
  else if (['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    if (open) chooseLang(langActive); else openLang();
  } else if (event.key === 'Escape' && open) { event.preventDefault(); closeLang(); }
  else if (event.key === 'Tab' && open) closeLang();
});
langOptions.forEach((option, i) => {
  option.addEventListener('click', () => chooseLang(i));
  option.addEventListener('mousemove', () => setLangActive(i));
});
document.addEventListener('click', (event) => {
  if (!langList.hidden && !event.target.closest('.lang') && !langList.contains(event.target)) closeLang();
});

// Enlaces del sitio global (cabecera y migas): son de contexto y en el prototipo no navegan.
document.querySelectorAll('a[href="#"]').forEach((link) => {
  link.addEventListener('click', (event) => event.preventDefault());
});

// Atajos para revisar el diseño (y para llevarlo a Figma): ?preview=form abre el formulario,
// ?preview=errors lo abre con los errores de un envío vacío y ?preview=sent, ya enviado.
const preview = new URLSearchParams(location.search).get('preview');
if (preview === 'form' || preview === 'errors') {
  demo.showModal();
  if (preview === 'errors') form.requestSubmit();
}
if (preview === 'sent') {
  demo.showModal();
  formView.hidden = true;
  doneView.hidden = false;
  demo.classList.add('is-done');
  demo.querySelector('.demo__steps li').classList.add('is-current');
}

// Cifras de pruebas: suben de 0 a su valor una sola vez, al entrar en pantalla.
// El lector de pantalla lee solo el valor final; con «reducir movimiento» no hay animación.
const counters = document.querySelectorAll('.count');
if (counters.length && !reduceMotion.matches) {
  const run = (el) => {
    const target = Number(el.dataset.target);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 1300, 1);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = `${el.dataset.prefix || ''}${Math.round(target * eased)}${el.dataset.suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      run(entry.target);
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => {
    el.textContent = `${el.dataset.prefix || ''}0${el.dataset.suffix}`;
    countObserver.observe(el);
  });
}

// Reseñas: suben escalonadas, de izquierda a derecha (sentido de lectura), una sola vez.
const testimonials = document.querySelector('.testimonials');
if (testimonials && !reduceMotion.matches) {
  testimonials.classList.add('reveal');
  const revealObserver = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    testimonials.classList.add('is-shown');
    revealObserver.disconnect();
  }, { threshold: 0.25 });
  revealObserver.observe(testimonials);
}

// En mobile el dashboard se muestra como captura de escritorio, achicado al ancho disponible.
const dash = document.querySelector('.dash');
const fitDash = () => {
  if (!dash) return;
  const width = dash.parentElement.clientWidth;
  dash.style.setProperty('--dash-zoom', Math.min(1, width / 840).toFixed(3));
};
fitDash();
window.addEventListener('resize', fitDash);

// La tabla del hero, igual: en mobile es una captura de la plataforma de escritorio que entra entera.
const panel = document.querySelector('.hero .panel');
const fitPanel = () => {
  if (!panel) return;
  // Lo más grande posible sin perder la etiqueta de riesgo (termina a 585 px del borde izquierdo de la tabla):
  // el resto se escapa por la derecha, como en desktop.
  const left = panel.parentElement.getBoundingClientRect().left;
  panel.style.setProperty('--panel-zoom', Math.min(1, (window.innerWidth - left - 10) / 585).toFixed(3));
};
fitPanel();
window.addEventListener('resize', fitPanel);


// Puntos del carrusel de reseñas en mobile: el deslizamiento es CSS (scroll-snap); esto solo
// marca la tarjeta visible y permite saltar a otra. En desktop los puntos están ocultos.
const tTrack = document.querySelector('.testimonials');
if (tTrack) {
  const cards = [...tTrack.children];
  const dots = document.createElement('div');
  dots.className = 'tdots';
  cards.forEach((card, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show testimonial ${i + 1} of ${cards.length}`);
    dot.addEventListener('click', () => tTrack.scrollTo({ left: card.offsetLeft - cards[0].offsetLeft, behavior: reduceMotion.matches ? 'auto' : 'smooth' }));
    dots.append(dot);
  });
  tTrack.after(dots);
  const mark = (i) => [...dots.children].forEach((d, j) => d.setAttribute('aria-current', String(i === j)));
  mark(0);
  const tObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) mark(cards.indexOf(e.target)); });
  }, { root: tTrack, threshold: 0.6 });
  cards.forEach((c) => tObserver.observe(c));
}

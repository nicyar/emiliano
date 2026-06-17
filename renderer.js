// ── Estado global ─────────────────────────────────────────────────────────────
let config = {};
let unit   = null;
let tipo   = null;

// ── Inicialización ────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // Cargar precios guardados
  config = await window.api.loadConfig();
  cargarCamposConfig();

  // Fecha de hoy por defecto
  document.getElementById('fecha').valueAsDate = new Date();
});

// ── Navegación entre vistas ───────────────────────────────────────────────────
function showView(view) {
  document.getElementById('view-nuevo').classList.toggle('hidden', view !== 'nuevo');
  document.getElementById('view-config').classList.toggle('hidden', view !== 'config');
  document.getElementById('nav-nuevo').classList.toggle('active', view === 'nuevo');
  document.getElementById('nav-config').classList.toggle('active', view === 'config');
}

// ── Selección de unidad de negocio ────────────────────────────────────────────
function selectUnit(u) {
  unit = u;
  ['pba', 'tad', 'caba'].forEach(x => {
    const btn = document.getElementById('btn-' + x);
    btn.className = 'unit-btn' + (x === u ? ' sel-' + u : '');
  });
  calcTotal();
}

// ── Selección de tipo de presentación ────────────────────────────────────────
function selectTipo(t) {
  tipo = t;
  document.getElementById('opt-mensual').classList.toggle('sel', t === 'mensual');
  document.getElementById('opt-historico').classList.toggle('sel', t === 'historico');
  calcTotal();
}

// ── Mostrar/ocultar campos condicionales ──────────────────────────────────────
function toggle(id) {
  document.getElementById(id).classList.toggle('hidden');
}

// ── Calcular y mostrar el resumen ─────────────────────────────────────────────
function calcTotal() {
  const rows = document.getElementById('total-rows');

  if (!unit || !tipo) {
    rows.innerHTML = '<div class="placeholder-msg">Seleccioná una unidad y tipo de presentación para ver el resumen.</div>';
    return;
  }

  const items = [];
  let total = 0;

  // Precio según unidad y tipo
  if (unit === 'pba') {
    const v = tipo === 'mensual' ? config.pba_mensual : config.pba_historico;
    items.push({ label: 'PBA — ' + capitalized(tipo), value: v });
    total += v;
  } else if (unit === 'tad') {
    const v = tipo === 'mensual' ? config.tad_mensual : config.tad_historico;
    items.push({ label: 'TAD — ' + capitalized(tipo), value: v });
    total += v;
  } else if (unit === 'caba') {
    items.push({ label: 'CABA — base', value: config.caba_base });
    total += config.caba_base;
    const v = tipo === 'mensual' ? config.caba_mensual : config.caba_historico;
    items.push({ label: 'CABA — ' + capitalized(tipo), value: v });
    total += v;
  }

  // Firma digital
  if (document.getElementById('sw-firma').checked) {
    items.push({ label: 'Firma digital', value: config.firma });
    total += config.firma;
  }

  // Puesta en marcha
  const llevaPuesta = document.getElementById('sw-puesta').checked;
  let bonif = 0;

  if (llevaPuesta) {
    items.push({ label: 'Puesta en marcha', value: config.puesta_en_marcha });
    total += config.puesta_en_marcha;

    // Bonificación si tiene más de 12 meses
    if (document.getElementById('sw-12meses').checked) {
      const pct = Math.min(40, Math.max(0, parseFloat(document.getElementById('pctBonif').value) || 0));
      bonif = config.puesta_en_marcha * (pct / 100);
      if (bonif > 0) {
        items.push({ label: `Bonificación puesta en marcha (${pct}%)`, value: -bonif, discount: true });
        total -= bonif;
      }
    }
  }

  // Renderizar filas
  let html = items.map(item => `
    <div class="total-row ${item.discount ? 'discount' : ''}">
      <span>${item.label}</span>
      <span>${item.discount ? '- ' : ''}${fmt(item.value)}</span>
    </div>
  `).join('');

  html += `
    <div class="total-row main-row">
      <span>Total del presupuesto</span>
      <span>${fmt(total)}</span>
    </div>
  `;

  rows.innerHTML = html;
}

// ── Generar PDF ───────────────────────────────────────────────────────────────
async function generarPDF() {
  if (!unit || !tipo) {
    alert('Por favor seleccioná una unidad de negocio y el tipo de presentación.');
    return;
  }

  const razonSocial = document.getElementById('razonSocial').value.trim();
  if (!razonSocial) {
    alert('Por favor ingresá la razón social del destinatario.');
    return;
  }

  // Armar items igual que calcTotal
  const items = [];
  let total = 0;

  if (unit === 'pba') {
    const v = tipo === 'mensual' ? config.pba_mensual : config.pba_historico;
    items.push({ label: 'PBA — ' + capitalized(tipo), value: v });
    total += v;
  } else if (unit === 'tad') {
    const v = tipo === 'mensual' ? config.tad_mensual : config.tad_historico;
    items.push({ label: 'TAD — ' + capitalized(tipo), value: v });
    total += v;
  } else if (unit === 'caba') {
    items.push({ label: 'CABA — base', value: config.caba_base });
    total += config.caba_base;
    const v = tipo === 'mensual' ? config.caba_mensual : config.caba_historico;
    items.push({ label: 'CABA — ' + capitalized(tipo), value: v });
    total += v;
  }

  if (document.getElementById('sw-firma').checked) {
    items.push({ label: 'Firma digital', value: config.firma });
    total += config.firma;
  }

  if (document.getElementById('sw-puesta').checked) {
    items.push({ label: 'Puesta en marcha', value: config.puesta_en_marcha });
    total += config.puesta_en_marcha;

    if (document.getElementById('sw-12meses').checked) {
      const pct = Math.min(40, Math.max(0, parseFloat(document.getElementById('pctBonif').value) || 0));
      const bonif = config.puesta_en_marcha * (pct / 100);
      if (bonif > 0) {
        items.push({ label: `Bonificación puesta en marcha (${pct}%)`, value: -bonif, discount: true });
        total -= bonif;
      }
    }
  }

  // Registro de empleadores
  let registro = null;
  if (document.getElementById('sw-registro').checked) {
    registro = {
      empleados: document.getElementById('numEmpleados').value || '—',
      fechaRealizacion: document.getElementById('fechaRealizacion').value || '—'
    };
  }

  const data = {
    razonSocial,
    fecha:   document.getElementById('fecha').value,
    unidad:  unit.toUpperCase(),
    tipo:    capitalized(tipo),
    items,
    total,
    registro,
    numero:  String(Date.now()).slice(-4) // número simple basado en timestamp
  };

  const result = await window.api.generatePDF(data);
  if (!result.success) {
    if (result.error) alert('Error al generar el PDF: ' + result.error);
  }
}

// ── Configuración ─────────────────────────────────────────────────────────────
function cargarCamposConfig() {
  Object.keys(config).forEach(key => {
    const input = document.getElementById('cfg-' + key);
    if (input) input.value = config[key];
  });
}

async function guardarConfig() {
  const nuevaConfig = {};
  Object.keys(config).forEach(key => {
    const input = document.getElementById('cfg-' + key);
    if (input) nuevaConfig[key] = parseFloat(input.value) || 0;
  });

  await window.api.saveConfig(nuevaConfig);
  config = nuevaConfig;

  // Mostrar mensaje de éxito
  const msg = document.getElementById('save-msg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 3000);

  // Recalcular con nuevos precios
  calcTotal();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function reiniciar() {
  // Limpiar campos de texto
  document.getElementById('razonSocial').value = '';
  document.getElementById('fecha').valueAsDate = new Date();

  // Resetear unidad y tipo
  unit = null;
  tipo = null;
  ['pba', 'tad', 'caba'].forEach(x => {
    document.getElementById('btn-' + x).className = 'unit-btn';
  });
  document.getElementById('opt-mensual').classList.remove('sel');
  document.getElementById('opt-historico').classList.remove('sel');

  // Apagar todos los toggles
  ['sw-registro', 'sw-firma', 'sw-puesta', 'sw-12meses'].forEach(id => {
    document.getElementById(id).checked = false;
  });

  // Ocultar campos condicionales
  document.getElementById('registro-detail').classList.add('hidden');
  document.getElementById('bonif-detail').classList.add('hidden');

  // Limpiar campos de registro
  document.getElementById('numEmpleados').value = '';
  document.getElementById('fechaRealizacion').value = '';
  document.getElementById('pctBonif').value = '';

  // Resetear resumen
  document.getElementById('total-rows').innerHTML =
    '<div class="placeholder-msg">Seleccioná una unidad y tipo de presentación para ver el resumen.</div>';
}


function fmt(n) {
  return '$\u00a0' + Math.abs(Math.round(n)).toLocaleString('es-AR');
}

function capitalized(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
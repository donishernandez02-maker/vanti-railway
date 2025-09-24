// vanti-bot.js
// CommonJS – listo para usar en Railway con proxy opcional por variables de entorno.
const puppeteer = require('puppeteer');

const VANTI_URL = 'https://pagosenlinea.grupovanti.com/';

// ===== Proxy por variables de entorno (opcional) =====
const proxyProto = process.env.PROXY_PROTO || 'http';
const proxyHost  = process.env.PROXY_HOST  || '';
const proxyPort  = process.env.PROXY_PORT  || '';
const proxyUser  = process.env.PROXY_USER  || '';
const proxyPass  = process.env.PROXY_PASS  || '';

function buildLaunchArgs() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ];
  if (proxyHost && proxyPort) {
    args.push(`--proxy-server=${proxyProto}://${proxyHost}:${proxyPort}`);
  }
  return args;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function consultarVanti(cuenta) {
  if (!cuenta) throw new Error('No se proporcionó un número de cuenta.');

  let browser;
  try {
    const launchArgs = buildLaunchArgs();
    if (proxyHost && proxyPort) {
      console.log('[Proxy] usando', `${proxyProto}://${proxyHost}:${proxyPort}`);
    }

    browser = await puppeteer.launch({
      headless: 'new',
      args: launchArgs,
      defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();

    // Autenticación del proxy (si hay user/pass)
    if (proxyUser && proxyPass) {
      await page.authenticate({ username: proxyUser, password: proxyPass });
      console.log('[Proxy] autenticación Basic configurada.');
    }

    // Navegar
    await page.goto(VANTI_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Seleccionar empresa
    await page.waitForSelector('#empresa', { visible: true, timeout: 20000 });
    await page.select('#empresa', '79');

    // Escribir cuenta
    await page.waitForSelector('#cuenta_contrato', { visible: true, timeout: 20000 });
    await page.type('#cuenta_contrato', cuenta, { delay: 0 });

    // Radio
    await page.waitForSelector('#image1', { visible: true, timeout: 20000 });
    await page.click('#image1');

    // Espera a que el botón se habilite y clic
    await page.waitForFunction(
      'document.querySelector(".btn.btn-primary.query-button").disabled === false',
      { timeout: 20000 }
    );
    await page.click('.btn.btn-primary.query-button');

    // Esperar resultado: valor o popup
    const selectorValor = 'label.form.form-control.disabled';
    const selectorPopup = '#swal2-html-container';

    const ganador = await Promise.race([
      page.waitForSelector(selectorValor, { visible: true, timeout: 30000 }).then(el => ({ tipo: 'valor', el })),
      page.waitForSelector(selectorPopup, { visible: true, timeout: 30000 }).then(el => ({ tipo: 'popup', el }))
    ]).catch(() => null);

    if (!ganador) {
      return { ok: false, status: 'TIMEOUT', account: cuenta };
    }

    if (ganador.tipo === 'popup') {
      const text = await page.$eval(
        selectorPopup,
        el => (el.textContent || '').trim().toUpperCase()
      );
      if (text.includes('YA PAGADA'))     return { ok: true, status: 'REFERENCIA YA PAGADA', account: cuenta };
      if (text.includes('NO ENCONTRADA')) return { ok: true, status: 'REFERENCIA NO ENCONTRADA', account: cuenta };
      return { ok: true, status: text || 'POPUP SIN TEXTO', account: cuenta };
    } else {
      // Buscar el primer label con $
      const valor = await page.evaluate((sel) => {
        const labels = document.querySelectorAll(sel);
        for (const label of labels) {
          const t = (label.textContent || '').trim();
          if (t.startsWith('$')) return t;
        }
        return null;
      }, selectorValor);

      if (valor) return { ok: true, status: 'VALOR ENCONTRADO', value: valor, account: cuenta };
      return { ok: false, status: 'SIN_VALOR', account: cuenta };
    }
  } catch (err) {
    return { ok: false, status: 'ERROR', error: err.message, account: cuenta };
  } finally {
    try { await sleep(5000); } catch {}
    try { await browser?.close(); } catch {}
  }
}

module.exports = { consultarVanti };

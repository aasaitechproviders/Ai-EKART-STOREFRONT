/**
 * eKart Theme Utilities
 * Shared across all storefront pages.
 * Usage:  await applyStoreTheme(slug)
 * Returns: { storeConfig, themeSettings, currency, storeUrl }
 */

const EKART_API = 'https://apiv2.aasaitech.in'
const OWN_DOMAINS = ['ai-ekart-storefront.pages.dev','ekarts.aasaitech.in','ekart.aasaitech.in','localhost','127.0.0.1']

/* ── Slug resolution ── */
function resolveSlug() {
  const fromSession = sessionStorage.getItem('ekart_store')
  if (fromSession) return fromSession
  const fromParam = new URLSearchParams(location.search).get('store')
  if (fromParam) return fromParam
  const h = location.hostname
  if (!OWN_DOMAINS.some(d => h.includes(d))) return h
  return null
}

/* ── storeUrl helper ── */
function makeStoreUrl(slug) {
  const isCustomDomain =
    !new URLSearchParams(location.search).get('store') &&
    !sessionStorage.getItem('ekart_store') &&
    slug !== null
  return (page, extra = '') =>
    isCustomDomain
      ? `${page}${extra ? '?' + extra : ''}`
      : `${page}?store=${slug}${extra ? '&' + extra : ''}`
}

/* ── Parse theme settings from raw API response ── */
function parseThemeSettings(raw) {
  if (!raw || typeof raw !== 'object') return {}
  let doc = raw
  if (raw.published && typeof raw.published === 'object') doc = raw.published
  else if (raw.draft && typeof raw.draft === 'object') doc = raw.draft
  const s = doc.settings || doc
  return {
    primaryColor:  s.primary_color || s.primaryColor || null,
    bgColor:       s.secondary_color || s.bgColor || s.bg_color || s.background_color || null,
    textColor:     s.accent_color || s.textColor || s.text_color || null,
    font:          s.font_heading || s.fontHeading || s.font || null,
    radius:        s.radius || s.border_radius || null,
    buttonStyle:   s.button_style || s.buttonStyle || s.btnStyle || null,
    cardBg:        s.card_bg || s.cardBg || s.card_background || null,
    navBg:         s.nav_bg || s.navBg || null,
    navTextColor:  s.nav_text_color || s.navTextColor || null,
    cols:          s.cols || s.columns || null,
    cardStyle:     s.card_style || s.cardStyle || null,
  }
}

/* ── Dark color check ── */
function isColorDark(hex) {
  const c = (hex || '').replace('#', '')
  if (c.length !== 6) return false
  const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16)
  return (r*299 + g*587 + b*114) / 1000 < 145
}

/* ── Apply CSS variables to :root from theme settings ── */
function applyCSSVars(cfg, theme) {
  const R = document.documentElement

  // Primary accent — theme wins, config brand_color as fallback
  const primary = theme.primaryColor || cfg.brand_color || null
  if (primary) {
    R.style.setProperty('--accent', primary)
    R.style.setProperty('--primary', primary)
    R.style.setProperty('--brand', primary)
  }

  // Background
  if (theme.bgColor) {
    R.style.setProperty('--bg', theme.bgColor)
    document.body.style.background = theme.bgColor
  }

  // Text
  if (theme.textColor) {
    R.style.setProperty('--text', theme.textColor)
  }

  // Radius
  if (theme.radius) {
    const r = typeof theme.radius === 'number'
      ? `${theme.radius}px`
      : String(theme.radius).includes('px') ? theme.radius : `${theme.radius}px`
    R.style.setProperty('--radius', r)
    R.style.setProperty('--card-radius', r)

    // Button radius based on buttonStyle or radius
    const btnStyle = theme.buttonStyle || ''
    const btnR = btnStyle === 'pill' ? '999px'
               : btnStyle === 'square' ? '4px'
               : r
    R.style.setProperty('--btn-r', btnR)
  }

  // Font
  if (theme.font && theme.font !== 'DM Sans' && theme.font !== 'system-ui') {
    const fid = 'gf-theme-' + theme.font.replace(/\s+/g, '-')
    if (!document.getElementById(fid)) {
      const l = document.createElement('link')
      l.id = fid; l.rel = 'stylesheet'
      l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.font)}:wght@400;500;600;700;800&display=swap`
      document.head.appendChild(l)
    }
    R.style.setProperty('--font', `'${theme.font}', 'Outfit', system-ui, sans-serif`)
    document.body.style.fontFamily = `'${theme.font}', 'Outfit', system-ui, sans-serif`
  }

  // Nav background
  if (theme.navBg) {
    R.style.setProperty('--navbar-bg', theme.navBg)
    // Apply to any .page-nav or nav elements
    document.querySelectorAll('nav, .page-nav, header').forEach(el => {
      el.style.background = theme.navBg
      el.style.borderBottomColor = isColorDark(theme.navBg)
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(0,0,0,0.07)'
    })
    if (isColorDark(theme.navBg)) {
      document.querySelectorAll('nav *, .page-nav *, header *').forEach(el => {
        el.style.color = el.style.color || ''
      })
      document.querySelectorAll('nav, .page-nav, header').forEach(el => {
        el.style.color = theme.navTextColor || '#ffffff'
      })
    }
  }
}

/* ── Apply branding to nav logo, store name, favicon ── */
function applyBranding(cfg, storeUrlFn) {
  // Store name in <title>
  const baseTitle = document.title.split('—')[0].trim() || document.title
  if (cfg.name) {
    document.title = `${baseTitle} — ${cfg.name}`
  }

  // Nav store name elements
  document.querySelectorAll('[data-store-name]').forEach(el => {
    el.textContent = cfg.name || el.textContent
  })

  // Nav logo links
  document.querySelectorAll('[data-nav-logo]').forEach(el => {
    if (storeUrlFn) el.href = storeUrlFn('index.html')
  })

  // Shop / home links
  document.querySelectorAll('[data-nav-shop]').forEach(el => {
    if (storeUrlFn) el.href = storeUrlFn('index.html')
  })

  // Cart links
  document.querySelectorAll('[data-nav-cart]').forEach(el => {
    if (storeUrlFn) el.href = storeUrlFn('cart.html')
  })
}

/* ── Main exported function ── */
async function applyStoreTheme(slug) {
  if (!slug) return {}
  const storeUrlFn = makeStoreUrl(slug)
  let cfg = {}, theme = {}

  try {
    const [cfgRes, themeRes] = await Promise.allSettled([
      fetch(`${EKART_API}/shop/${slug}/config`).then(r => r.json()),
      fetch(`${EKART_API}/shop/${slug}/theme`).then(r => r.json()),
    ])

    if (cfgRes.status === 'fulfilled' && !cfgRes.value.error) {
      cfg = cfgRes.value
      // Store in session for other pages
      sessionStorage.setItem('ekart_store',      slug)
      sessionStorage.setItem('ekart_store_name', cfg.name || '')
      sessionStorage.setItem('ekart_pay_enabled', cfg.payment_enabled ? '1' : '0')
    }

    if (themeRes.status === 'fulfilled') {
      theme = parseThemeSettings(themeRes.value)
    }

    applyCSSVars(cfg, theme)
    applyBranding(cfg, storeUrlFn)

    // Currency
    let currency = '₹'
    if (cfg.currency === 'USD') currency = '$'
    else if (cfg.currency === 'EUR') currency = '€'
    else if (cfg.currency === 'GBP') currency = '£'
    sessionStorage.setItem('ekart_currency', currency)

    return { storeConfig: cfg, themeSettings: theme, currency, storeUrl: storeUrlFn, isColorDark }
  } catch (e) {
    console.warn('[theme-utils]', e.message)
    return { storeConfig: cfg, themeSettings: theme, currency: '₹', storeUrl: storeUrlFn, isColorDark }
  }
}

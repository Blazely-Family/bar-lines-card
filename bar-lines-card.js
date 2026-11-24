/*
 * bar-lines-card: labelled colour-scale bars for Home Assistant wall panels.
 *
 * Every bar uses the same 38px block: a 20px line (coloured icon, label,
 * warning, value), 4px gap, 14px bar with a white 6px "now" marker. With 8px
 * card padding and 22px between bars, N bars fill exactly N grid rows.
 * A bar can be shaded ahead to a forecast value with a "MAX n" marker under
 * it. See README.md for the config reference.
 */

const VERSION = "0.1.3";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function moreInfo(el, entityId) {
  if (!entityId) return;
  el.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
}

// Colour scales, as [percent of the bar, colour].
const SCALES = {
  fill: [[0, "#43a047"], [60, "#43a047"], [70, "#ffff52"], [80, "#ffa600"], [90, "#db4437"], [100, "#db4437"]],
  level: [[0, "#db4437"], [15, "#db4437"], [25, "#ffa600"], [35, "#ffff52"], [50, "#43a047"], [100, "#43a047"]],
  uv: [[0, "#225024"], [8.33, "#43a047"], [25, "#ffff52"], [50, "#ffa600"], [66.67, "#db4437"], [91.67, "#8353d1"]],
};

function hex(h) {
  return [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16));
}

function colourAt(stops, v) {
  let a = stops[stops.length - 1];
  let b = a;
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i][0] && v <= stops[i + 1][0]) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  if (a === b) return a[1];
  const t = (v - a[0]) / (b[0] - a[0]);
  const A = hex(a[1]);
  const B = hex(b[1]);
  return "rgb(" + A.map((x, i) => Math.round(x + (B[i] - x) * t)).join(",") + ")";
}

function gradient(stops) {
  return "linear-gradient(90deg," + stops.map((x) => x[1] + " " + x[0] + "%").join(",") + ")";
}

// One bar block. `b`: { entity, name, icon, scale, min, max, unit, decimals,
// warn_above, warn_below, forecast, forecast_label, forecast_decimals, detail, after }.
// `forecast` may be a number or an entity id.
function barBlock(hass, b) {
  const st = hass.states[b.entity] || {};
  const v = parseFloat(st.state);
  const ok = !Number.isNaN(v);
  const min = b.min ?? 0;
  const max = b.max ?? 100;
  // Stops are held as 0-100 % of the bar; custom stops are given on the min..max range.
  const stops = Array.isArray(b.scale) ? b.scale.map(([x, c]) => [((x - min) / (max - min)) * 100, c]) : SCALES[b.scale] || SCALES.fill;
  const p = ok ? Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100)) : 0;
  const c = ok ? colourAt(stops, p) : "var(--disabled-color)";
  const warn = ok && ((b.warn_above != null && v >= b.warn_above) || (b.warn_below != null && v <= b.warn_below));
  const unit = b.unit ?? "%";
  const val = ok ? v.toFixed(b.decimals ?? 0) + unit : "\u2013";
  const name = esc(b.name || (st.attributes || {}).friendly_name || b.entity);
  const fRaw = typeof b.forecast === "string" && b.forecast.includes(".") && hass.states[b.forecast] ? hass.states[b.forecast].state : b.forecast;
  const f = fRaw == null || Number.isNaN(parseFloat(fRaw)) ? null : parseFloat(fRaw);
  const pf = f === null ? null : Math.max(0, Math.min(100, ((f - min) / (max - min)) * 100));
  const pm = pf === null ? p : Math.max(pf, p);
  const fc =
    pf === null
      ? ""
      : `<div class="fl" style="left:${pm}%"><span class="tri">\u25b2</span><span>${esc(b.forecast_label || "MAX")} <b style="color:${colourAt(stops, pf)}">${f.toFixed(b.forecast_decimals ?? 0)}</b></span></div>`;
  const wi = warn ? '<ha-icon class="wi" icon="mdi:alert-outline"></ha-icon>' : "";
  // With no detail the value sits on the right; with a detail the value
  // follows the name and the (dimmer) detail sits on the right.
  const line = b.detail
    ? `<span class="lb">${name} <b style="color:${c}">${val}</b>${b.after ? ` <span class="af">${esc(b.after)}</span>` : ""}</span>${wi}<span class="dt">${esc(b.detail)}</span>`
    : `<span class="lb">${name}</span>${wi}<b class="val" style="color:${c}">${val}</b>`;
  const ahead = pm > p ? `<div class="ahead" style="left:${p}%;width:${pm - p}%"></div>` : "";
  const now = ok ? `<div class="now" style="left:${p}%"></div>` : "";
  return `<div class="blk${pf === null ? "" : " fc"}" data-entity="${esc(b.entity)}"><div class="ln"><ha-icon icon="${esc(b.icon || "mdi:gauge")}" style="color:${c}"></ha-icon>${line}</div><div class="bar" style="background:${gradient(stops)};opacity:${ok ? 1 : 0.3}"><div class="dim" style="left:${pm}%"></div>${ahead}${fc}${now}</div></div>`;
}

const BAR_STYLE = `
.bl { display: flex; flex-direction: column; gap: 22px; color: var(--primary-text-color); text-align: left; }
.bl .blk { cursor: pointer; }
.bl .ln { display: flex; align-items: center; gap: 6px; height: 20px; margin-bottom: 4px; font-size: var(--ha-font-size-m, 14px); white-space: nowrap; }
.bl .lb { flex: 1; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.bl .val { flex: none; font-variant-numeric: tabular-nums; }
.bl .af { color: var(--secondary-text-color); font-weight: var(--ha-font-weight-normal, 400); }
.bl .dt { flex: none; color: var(--secondary-text-color); font-weight: var(--ha-font-weight-normal, 400); }
.bl .fc { margin-bottom: 16px; }
.bl .ahead { position: absolute; top: 0; bottom: 0; background: rgba(0, 0, 0, 0.15); }
.bl .fl { position: absolute; top: calc(100% + 2px); transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; line-height: 1; font-size: var(--ha-font-size-s, 12px); font-weight: var(--ha-font-weight-medium, 500); white-space: nowrap; }
.bl .fl .tri { font-size: 8px; margin-bottom: 1px; }
.bl ha-icon { --mdc-icon-size: 20px; width: 20px; height: 20px; margin: 0; flex: none; position: relative; top: -1px; display: flex; }
.bl .wi { color: var(--warning-color); top: 1px; }
.bl .bar { position: relative; height: 14px; border-radius: 7px; }
.bl .dim { position: absolute; top: 0; bottom: 0; right: 0; border-radius: 0 7px 7px 0; background: rgba(0, 0, 0, 0.65); }
.bl .now { position: absolute; top: 50%; width: 6px; height: 22px; transform: translate(-50%, -50%); border-radius: 3px; background: #fff; box-sizing: border-box; box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.55), 0 1px 4px rgba(0, 0, 0, 0.6); }
`;

class BarLinesCard extends HTMLElement {
  setConfig(config) {
    if (!config || !Array.isArray(config.bars)) throw new Error("bar-lines-card: `bars` must be a list");
    this._cfg = config;
    this._config = config; // where card-mod/UIX look for a card's config
    this._sig = null;
    if (!this.shadowRoot) {
      // One ha-card for the card's lifetime, so styles that themes and
      // card-mod/UIX inject into it survive re-renders.
      this.attachShadow({ mode: "open" }).innerHTML = `<style>${STYLE}</style><ha-card><div class="body"></div></ha-card>`;
      this.shadowRoot.addEventListener("click", (ev) => {
        const blk = ev.composedPath().find((n) => n.dataset && n.dataset.entity);
        if (blk) moreInfo(this, blk.dataset.entity);
      });
    }
    if (this._hass) this._render(true);
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return (this._cfg && this._cfg.bars.length) || 1;
  }

  getGridOptions() {
    // 38px per bar plus 22px between bars and 8px padding top and bottom
    // fits exactly one 56px grid row per bar.
    return { columns: 12, rows: (this._cfg && this._cfg.bars.length) || 1 };
  }

  static getStubConfig() {
    return { bars: [{ entity: "", name: "Level", icon: "mdi:gauge", scale: "fill" }] };
  }

  _render(force) {
    const hass = this._hass;
    if (!hass || !this.shadowRoot || !this._cfg) return;
    let html;
    try {
      html = `<div class="bl">${this._cfg.bars.map((b) => barBlock(hass, b)).join("")}</div>`;
    } catch (e) {
      console.warn("bar-lines-card:", e);
      html = "";
    }
    if (!force && html === this._sig) return;
    this._sig = html;
    // `card: false` drops the card chrome and padding, for use inside another card.
    const card = this.shadowRoot.querySelector("ha-card");
    // Toggle only our own class and write inside .body: card-mod/UIX add
    // their own classes and style node to ha-card, which must stay.
    card.classList.toggle("bare", this._cfg.card === false);
    this.shadowRoot.querySelector(".body").innerHTML = html;
  }
}

const STYLE = `
:host { display: block; height: 100%; }
/* The theme's glass tint (Frosted Glass sets --ha-card-glass-tint, which the
   wall panel screensaver deepens), drawn by the card itself so it doesn't depend
   on the theme's card-mod styles reaching this card. Other themes: their card background. */
ha-card { height: 100%; box-sizing: border-box; padding: 8px 12px; overflow: visible; background: var(--ha-card-glass-tint, var(--ha-card-background, var(--card-background-color))); }
ha-card.bare { padding: 0; background: none !important; border: none !important; box-shadow: none !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
ha-card.bare::before, ha-card.bare::after { display: none !important; }
${BAR_STYLE}`;

if (!customElements.get("bar-lines-card")) {
  customElements.define("bar-lines-card", BarLinesCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "bar-lines-card",
    name: "Bar lines",
    description: "Labelled colour-scale bars with a now marker, one grid row per bar.",
  });
  console.info(`%c BAR-LINES-CARD %c ${VERSION} `, "background:#43a047;color:#fff", "");
}

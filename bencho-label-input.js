(() => {
  const TAG = "bencho-label-input";
  if (customElements.get(TAG)) return;

  /*
   * ══ Bencho Label input — Wix Custom Element version ══
   *
   * Based on the supplied Bencho LabelInput component.
   * This version removes the React/lucide dependency and packages
   * the HTML, CSS, SVG icons, state and behavior into one Web Component
   * so Wix Studio can load it from a single HTTPS JavaScript URL.
   *
   * Supported attributes:
   *   field  = "Email" | "Password"
   *   corner = number of px (0..26)
   *   theme  = "dark" | "light" (extra convenience; default: dark)
   *
   * Events:
   *   change            { value, field }
   *   focus             { value, field }
   *   blur              { value, field }
   *   visibility-change { visible, value, field }
   */

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const W = 280;
  const H = 52;
  const S = 0.78;
  const IN = 0.75;

  const CSS = `
    :host {
      --fill-on: #f5f5f5;
      --font-ui: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
      --ink: #f5f5f5;
      --ink-3: rgba(245,245,245,.68);
      --ink-4: rgba(245,245,245,.42);
      --ink-rgb: 245, 245, 245;

      display: inline-block;
      width: ${W}px;
      height: ${H + 10}px;
      box-sizing: border-box;
      contain: layout style;
    }

    :host([theme="light"]) {
      --fill-on: #181818;
      --ink: #181818;
      --ink-3: rgba(24,24,24,.68);
      --ink-4: rgba(24,24,24,.42);
      --ink-rgb: 24, 24, 24;
    }

    * { box-sizing: border-box; }

    .lbi {
      position: relative;
      width: ${W}px;
      height: ${H + 10}px;
      font-family: var(--font-ui);
      display: grid;
      place-items: start center;
      padding-top: 10px;
    }

    .lbi-box {
      position: relative;
      background: transparent;
      cursor: text;
    }

    .lbi-ring {
      position: absolute;
      inset: 0;
      overflow: visible;
      pointer-events: none;
    }

    .lbi-ring path {
      fill: none;
      stroke: rgba(var(--ink-rgb), 0.18);
      stroke-width: 1;
      stroke-linecap: butt;
      transition: stroke 240ms ease, stroke-width 240ms ease;
    }

    .lbi[data-focus="true"] .lbi-ring path {
      stroke: var(--ink);
      stroke-width: 1.5;
    }

    .lbi[data-filled="true"]:not([data-focus="true"]) .lbi-ring path {
      stroke: rgba(var(--ink-rgb), 0.3);
    }

    .lbi-gap {
      stroke-dasharray: 1 2;
      stroke-dashoffset: 0;
      transition: stroke 240ms ease, stroke-width 240ms ease,
        stroke-dashoffset 320ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .lbi[data-up="true"] .lbi-gap {
      stroke-dashoffset: -1;
    }

    .lbi-label {
      position: absolute;
      left: var(--lbi-x);
      top: 50%;
      font-size: 15px;
      line-height: 1;
      letter-spacing: -0.005em;
      white-space: pre;
      color: var(--ink-4);
      transform-origin: left center;
      transform: translateY(-50%);
      transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1), color 200ms ease;
      cursor: text;
      user-select: none;
      z-index: 2;
      pointer-events: none;
    }

    .lbi[data-up="true"] .lbi-label {
      transform: translateY(-50%) translateY(-26px) scale(${S});
      color: var(--ink-3);
    }

    .lbi[data-focus="true"] .lbi-label {
      color: var(--fill-on);
    }

    .lbi-label span {
      display: inline-block;
    }

    .lbi[data-focus="true"] .lbi-label span {
      animation: lbi-hop 460ms cubic-bezier(0.3, 0.7, 0.3, 1) both;
      animation-delay: calc(var(--i) * 24ms);
    }

    .lbi-field {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      padding: 0 0 0 var(--lbi-x);
      border: 0;
      border-radius: inherit;
      background: transparent;
      font: inherit;
      font-size: 15px;
      letter-spacing: -0.005em;
      color: var(--fill-on);
      outline: none;
      z-index: 1;
    }

    .lbi-field[data-flip="1"] { animation: lbi-flip-a 260ms ease-out; }
    .lbi-field[data-flip="0"] { animation: lbi-flip-b 260ms ease-out; }

    .lbi-eye {
      position: absolute;
      right: 10px;
      top: 50%;
      width: 30px;
      height: 30px;
      margin-top: -15px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: var(--ink-4);
      cursor: pointer;
      transition: color 160ms ease, scale 130ms cubic-bezier(0.3, 0.9, 0.4, 1);
      z-index: 3;
    }

    .lbi-eye:hover { color: var(--fill-on); }
    .lbi-eye:active { scale: 0.9; }

    .lbi-eye svg {
      grid-area: 1 / 1;
      transition: opacity 200ms ease, scale 260ms cubic-bezier(0.22, 1, 0.36, 1), filter 200ms ease;
    }

    .lbi-eye svg:last-child {
      opacity: 0;
      scale: 0.7;
      filter: blur(2px);
    }

    .lbi-eye[data-show="true"] svg:first-child {
      opacity: 0;
      scale: 0.7;
      filter: blur(2px);
    }

    .lbi-eye[data-show="true"] svg:last-child {
      opacity: 1;
      scale: 1;
      filter: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .lbi-ring path,
      .lbi-gap,
      .lbi-label { transition-duration: 1ms; }

      .lbi[data-focus="true"] .lbi-label span,
      .lbi-field { animation: none; }
    }

    @keyframes lbi-hop {
      0% { transform: translateY(0); }
      38% { transform: translateY(-3px); }
      100% { transform: translateY(0); }
    }

    @keyframes lbi-flip-a {
      from { filter: blur(3px); opacity: 0.5; }
    }

    @keyframes lbi-flip-b {
      from { filter: blur(3px); opacity: 0.5; }
    }
  `;

  const EYE_OPEN = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <path d="M2.1 12s3.4-6 9.9-6 9.9 6 9.9 6-3.4 6-9.9 6-9.9-6-9.9-6Z"></path>
      <circle cx="12" cy="12" r="2.75"></circle>
    </svg>
  `;

  const EYE_OFF = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <path d="M3 3l18 18"></path>
      <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 9.9 6 9.9 6a18 18 0 0 1-3.2 3.9"></path>
      <path d="M6.7 6.7C4.4 8.2 2.1 12 2.1 12s3.4 6 9.9 6c1.3 0 2.5-.25 3.6-.65"></path>
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path>
    </svg>
  `;

  class LabelInput extends HTMLElement {
    static get observedAttributes() {
      return ["field", "corner", "theme"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._field = "Email";
      this._corner = 14;
      this._theme = "dark";
      this._focused = false;
      this._value = "";
      this._show = false;
      this._flip = 0;
      this._render();
    }

    connectedCallback() {
      this._field = this.getAttribute("field") || "Email";
      const c = Number(this.getAttribute("corner"));
      this._corner = Number.isFinite(c) ? clamp(c, 0, H / 2) : 14;
      this._theme = (this.getAttribute("theme") || "dark").toLowerCase();
      this._resetForFieldChange(false);
      this._applyAll();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue || !this._input) return;

      if (name === "field") {
        this._field = newValue || "Email";
        this._resetForFieldChange(true);
      } else if (name === "corner") {
        const n = Number(newValue);
        this._corner = Number.isFinite(n) ? clamp(n, 0, H / 2) : 14;
        this._applyAll();
      } else if (name === "theme") {
        this._theme = String(newValue || "dark").toLowerCase();
        this._applyAll();
      }
    }

    get field() { return this._field; }
    set field(v) { this.setAttribute("field", v || "Email"); }

    get corner() { return this._corner; }
    set corner(v) { this.setAttribute("corner", String(v)); }

    get theme() { return this._theme; }
    set theme(v) { this.setAttribute("theme", v || "dark"); }

    get value() { return this._value; }
    set value(v) { this._setValue(String(v ?? ""), false); }

    focusInput() { this._input?.focus(); }
    blurInput() { this._input?.blur(); }

    reset() {
      this._setValue("", false);
      this._show = false;
      this._flip = 0;
      this._applyAll();
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>${CSS}</style>
        <div class="lbi" data-up="false" data-focus="false" data-filled="false">
          <div class="lbi-box">
            <svg class="lbi-ring" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
              <path class="lbi-right"></path>
              <path class="lbi-left"></path>
              <path class="lbi-gap lbi-gap-left"></path>
              <path class="lbi-gap lbi-gap-right"></path>
            </svg>
            <label class="lbi-label"></label>
            <input class="lbi-field" type="email" spellcheck="false" autocomplete="off" />
            <button class="lbi-eye" type="button" hidden aria-label="Show password">
              ${EYE_OPEN}
              ${EYE_OFF}
            </button>
          </div>
        </div>
      `;

      const q = (s) => this.shadowRoot.querySelector(s);
      this._root = q(".lbi");
      this._box = q(".lbi-box");
      this._label = q(".lbi-label");
      this._input = q(".lbi-field");
      this._eye = q(".lbi-eye");
      this._right = q(".lbi-right");
      this._left = q(".lbi-left");
      this._gapLeft = q(".lbi-gap-left");
      this._gapRight = q(".lbi-gap-right");

      this._label.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this._input.focus();
      });

      this._box.addEventListener("pointerdown", (e) => {
        if (e.target === this._eye || this._eye.contains(e.target)) return;
        this._input.focus();
      });

      this._input.addEventListener("input", () => {
        this._value = this._input.value;
        this._applyAll();
        this.dispatchEvent(new CustomEvent("change", {
          detail: { value: this._value, field: this._labelText() },
          bubbles: true,
          composed: true
        }));
      });

      this._input.addEventListener("focus", () => {
        this._focused = true;
        this._applyAll();
        this.dispatchEvent(new CustomEvent("focus", {
          detail: { value: this._value, field: this._labelText() },
          bubbles: true,
          composed: true
        }));
      });

      this._input.addEventListener("blur", () => {
        this._focused = false;
        this._applyAll();
        this.dispatchEvent(new CustomEvent("blur", {
          detail: { value: this._value, field: this._labelText() },
          bubbles: true,
          composed: true
        }));
      });

      this._eye.addEventListener("pointerdown", (e) => e.preventDefault());

      this._eye.addEventListener("click", () => {
        this._show = !this._show;
        this._flip = (this._flip + 1) % 2;
        this._input.type = this._show ? "text" : "password";
        this._input.dataset.flip = String(this._flip);
        this._eye.dataset.show = String(this._show);
        this._eye.setAttribute("aria-label", this._show ? "Hide password" : "Show password");
        this._input.focus();

        this.dispatchEvent(new CustomEvent("visibility-change", {
          detail: {
            visible: this._show,
            value: this._value,
            field: this._labelText()
          },
          bubbles: true,
          composed: true
        }));
      });
    }

    _upgradeProperty(prop) {
      if (Object.prototype.hasOwnProperty.call(this, prop)) {
        const value = this[prop];
        delete this[prop];
        this[prop] = value;
      }
    }

    _labelText() {
      return this._isPassword() ? "Password" : "Email";
    }

    _isPassword() {
      return String(this._field).toLowerCase() === "password";
    }

    _resetForFieldChange(emit) {
      this._focused = false;
      this._value = "";
      this._show = false;
      this._flip = 0;

      if (!this._input) return;

      this._input.value = "";
      this._input.type = this._isPassword() ? "password" : "email";
      this._eye.hidden = !this._isPassword();
      this._eye.dataset.show = "false";
      this._eye.setAttribute("aria-label", "Show password");
      this._applyAll();

      if (emit) {
        this.dispatchEvent(new CustomEvent("change", {
          detail: { value: "", field: this._labelText() },
          bubbles: true,
          composed: true
        }));
      }
    }

    _setValue(next, emit) {
      this._value = next;
      if (this._input) this._input.value = next;
      this._applyAll();

      if (emit) {
        this.dispatchEvent(new CustomEvent("change", {
          detail: { value: this._value, field: this._labelText() },
          bubbles: true,
          composed: true
        }));
      }
    }

    _applyAll() {
      if (!this._root || !this._input) return;

      const r = clamp(Number(this._corner) || 0, 0, H / 2);
      const secret = this._isPassword();
      const label = secret ? "Password" : "Email";
      const value = this._value || "";
      const up = this._focused || value.length > 0;

      this._root.dataset.up = String(up);
      this._root.dataset.focus = String(this._focused);
      this._root.dataset.filled = String(value.length > 0);

      this._input.type = secret ? (this._show ? "text" : "password") : "email";
      this._input.style.paddingRight = secret ? "48px" : "";
      this._input.setAttribute("aria-label", label);
      this._eye.hidden = !secret;
      this._eye.dataset.show = String(this._show);

      this._label.textContent = "";
      for (const [i, ch] of [...label].entries()) {
        const span = document.createElement("span");
        span.style.setProperty("--i", String(i));
        span.textContent = ch;
        this._label.appendChild(span);
      }

      const lx = Math.max(14, r + 4);
      this._label.style.setProperty("--lbi-x", `${lx}px`);
      this._input.style.paddingLeft = `${lx}px`;

      const lw = Math.max(40, this._label.getBoundingClientRect().width);
      const x0 = Math.max(r * 0.6, lx - 5);
      const x1 = lx + lw * S + 5;
      const a = Math.max(0, r - IN);
      const R = W - IN;
      const B = H - IN;
      const mid = W / 2;
      const nm = (x0 + x1) / 2;

      const gapL = `M${nm},${IN} L${x0},${IN}`;
      const gapR = `M${nm},${IN} L${x1},${IN}`;

      const right = r > 0
        ? `M${x1},${IN} L${W-r},${IN} A${a},${a} 0 0 1 ${R},${r} L${R},${H-r} A${a},${a} 0 0 1 ${W-r},${B} L${mid},${B}`
        : `M${x1},${IN} L${R},${IN} L${R},${B} L${mid},${B}`;

      const left = r > 0
        ? `M${x0},${IN} L${r},${IN} A${a},${a} 0 0 0 ${IN},${r} L${IN},${H-r} A${a},${a} 0 0 0 ${r},${B} L${mid},${B}`
        : `M${x0},${IN} L${IN},${IN} L${IN},${B} L${mid},${B}`;

      this._right.setAttribute("d", right);
      this._left.setAttribute("d", left);
      this._gapLeft.setAttribute("d", gapL);
      this._gapRight.setAttribute("d", gapR);
    }
  }

  customElements.define(TAG, LabelInput);
})();

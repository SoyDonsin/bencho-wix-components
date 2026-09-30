(() => {
  const TAG = 'bencho-one-time-code';
  if (customElements.get(TAG)) return;

  const STILLNESS = () =>
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const POP_MS = 260;
  const W = 36;
  const H = 44;
  const G = 7;
  const CAP = 128;
  const MERGE = (() => {
    const k = 0.075;
    const zeta = 0.42;
    return { k, d: 1 - 2 * zeta * Math.sqrt(k) };
  })();
  const SHAKE_MS = 620;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => {
    const u = clamp((v - a) / (b - a), 0, 1);
    return u * u * (3 - 2 * u);
  };

  const styleText = `
    :host {
      --bencho-card: #e9e9ec;
      --bencho-fill-on: #121214;
      --bencho-fill-slab: #e9e9ec;
      --bencho-font-ui: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --bencho-ink: #121214;
      display: inline-grid;
      place-items: center;
      contain: layout paint style;
      font-family: var(--bencho-font-ui);
      box-sizing: border-box;
    }
    *, *::before, *::after { box-sizing: border-box; }
    .otp {
      position: relative;
      font-family: var(--bencho-font-ui);
      display: grid;
      place-items: center;
      user-select: none;
    }
    .otp-row {
      position: relative;
    }
    .otp-goo {
      position: absolute;
      inset: 0;
    }
    .liq-defs {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }
    .otp-cell {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--bencho-fill-slab, var(--bencho-card));
    }
    .otp-slot {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      display: grid;
      place-items: center;
      pointer-events: none;
    }
    .otp-digit {
      font-size: 19px;
      font-weight: 500;
      line-height: 1;
      letter-spacing: -0.01em;
      font-variant-numeric: tabular-nums;
      color: var(--bencho-fill-on, var(--bencho-ink));
      animation: otp-in 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
      transition: color 160ms ease;
    }
    .otp[data-phase="no"] .otp-digit { color: #e5484d; }
    .otp-caret {
      position: absolute;
      left: 0;
      top: 50%;
      width: 2px;
      height: 18px;
      margin-top: -9px;
      border-radius: 2px;
      background: var(--bencho-fill-on, var(--bencho-ink));
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease;
    }
    .otp-caret[data-on="true"] {
      opacity: 1;
      animation: otp-breathe 1.1s ease-in-out infinite alternate;
    }
    .otp-ok {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      color: var(--bencho-fill-on, var(--bencho-ink));
      pointer-events: none;
    }
    .otp-ok svg { width: 14px; height: 14px; flex: 0 0 auto; }
    .otp-field {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      border: 0;
      padding: 0;
      font-size: 16px;
      caret-color: transparent;
      cursor: text;
      outline: none;
      background: transparent;
    }
    .otp[data-phase="ok"] .otp-field { cursor: pointer; }
    @media (prefers-reduced-motion: reduce) {
      .otp-digit, .otp-caret[data-on="true"] { animation: none; }
    }
    @keyframes otp-in {
      from { transform: translateY(45%) scale(0.86); opacity: 0; filter: blur(3px); }
      to { transform: none; opacity: 1; filter: none; }
    }
    @keyframes otp-breathe {
      from { opacity: 1; }
      to { opacity: 0.25; }
    }
  `;

  class BenchoOneTimeCode extends HTMLElement {
    static get observedAttributes() {
      return ['length', 'answer', 'corner', 'theme', 'disabled'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._code = '';
      this._phase = 'type';
      this._focus = false;
      this._input = null;
      this._raf = 0;
      this._tick = 0;
      this._timers = [];
      this._popAt = [];
      this._merge = { m: 0, v: 0, to: 0 };
      this._caret = { x: W / 2, v: 0 };
      this._shook = 0;
      this._live = { code: '', n: 6 };
      this._still = STILLNESS();
      this._id = 'goo-' + Math.random().toString(36).slice(2, 11);
    }

    connectedCallback() {
      this._render();
      this._applySize();
      this._wake();
    }

    disconnectedCallback() {
      this._cancelMotion();
      this._timers.forEach((id) => clearTimeout(id));
      this._timers = [];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue || !this.isConnected) return;
      if (name === 'theme') this._applyTheme();
      if (name === 'length') {
        this._resetForLength();
      } else {
        this._render();
        this._applySize();
        this._wake();
      }
    }

    get length() {
      return this._n();
    }

    set length(value) {
      this.setAttribute('length', String(value));
    }

    get answer() {
      return this.getAttribute('answer') || 'Accept';
    }

    set answer(value) {
      this.setAttribute('answer', String(value));
    }

    get corner() {
      const n = Number(this.getAttribute('corner'));
      return Number.isFinite(n) ? n : 12;
    }

    set corner(value) {
      this.setAttribute('corner', String(value));
    }

    get disabled() {
      return this.hasAttribute('disabled') && this.getAttribute('disabled') !== 'false';
    }

    set disabled(value) {
      if (value) this.setAttribute('disabled', '');
      else this.removeAttribute('disabled');
    }

    _n() {
      return Number(this.getAttribute('length')) === 4 ? 4 : 6;
    }

    _r() {
      return clamp(this.corner, 0, H / 2);
    }

    _rowW() {
      const n = this._n();
      return n * W + (n - 1) * G;
    }

    _resetForLength() {
      this._cancelMotion();
      this._timers.forEach((id) => clearTimeout(id));
      this._timers = [];
      this._code = '';
      this._phase = 'type';
      this._merge = { m: 0, v: 0, to: 0 };
      this._popAt = [];
      this._live = { code: '', n: this._n() };
      this._render();
      this._applySize();
      this._dispatch('change', { code: '', length: this._n(), phase: this._phase });
      this._wake();
    }

    _later(fn, ms) {
      const id = setTimeout(() => {
        this._timers = this._timers.filter((x) => x !== id);
        fn();
      }, ms);
      this._timers.push(id);
    }

    _cancelMotion() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
    }

    _wake() {
      if (this._raf) return;
      let prev = 0;
      const tick = (t) => {
        const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
        prev = t;
        let busy = false;
        const { code: c, n: count } = this._live;
        const target = Math.min(c.length, count - 1) * (W + G) + W / 2;
        const k = this._caret;
        if (this._still) {
          k.x = target;
          k.v = 0;
        } else {
          k.v += (target - k.x) * 0.2 * dt;
          k.v *= Math.pow(0.62, dt);
          k.x += k.v * dt;
          if (Math.abs(target - k.x) < 0.05 && Math.abs(k.v) < 0.05) {
            k.x = target;
            k.v = 0;
          } else busy = true;
        }

        const mg = this._merge;
        if (mg.m !== mg.to || mg.v !== 0) {
          if (this._still) {
            mg.m = mg.to;
            mg.v = 0;
          } else {
            mg.v += (mg.to - mg.m) * MERGE.k * dt;
            mg.v *= Math.pow(MERGE.d, dt);
            mg.m += mg.v * dt;
            if (Math.abs(mg.to - mg.m) < 0.0008 && Math.abs(mg.v) < 0.0008) {
              mg.m = mg.to;
              mg.v = 0;
            } else busy = true;
          }
        }
        if (t - this._shook < SHAKE_MS + 200) busy = true;
        if (this._popAt.some((at) => t - at < POP_MS)) busy = true;

        this._tick++;
        this._updateVisuals(t);
        this._raf = busy ? requestAnimationFrame(tick) : 0;
      };
      this._raf = requestAnimationFrame(tick);
    }

    _useGoo() {
      return `<svg class="liq-defs" aria-hidden="true" focusable="false"><defs><filter id="${this._id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="smear"></feGaussianBlur><feColorMatrix in="smear" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12"></feColorMatrix></filter></defs></svg>`;
    }

    _render() {
      const n = this._n();
      const rowW = this._rowW();
      const r = this._r();
      const raw = this._merge.m;
      const m = clamp(raw, 0, 1);
      const home = (i) => i * (W + G);
      const mid = (rowW - W) / 2;

      this.shadowRoot.innerHTML = `
        <style>${styleText}</style>
        <div class="otp" data-phase="${this._phase}">
          <div class="otp-row" style="width:${rowW}px;height:${H}px">
            <div class="otp-goo" aria-hidden="true" style="filter:${this._still ? 'none' : `url(#${this._id})`}">
              ${Array.from({ length: n }, (_, i) => `
                <span class="otp-cell" data-cell="${i}" style="width:${W}px;border-radius:${r}px;transform:translateX(${home(i)}px)"></span>
              `).join('')}
              <span class="otp-cell" data-capsule style="width:0;border-radius:${H / 2}px;transform:translateX(${((rowW - W) / 2).toFixed(2)}px) scaleY(1)"></span>
            </div>
            ${Array.from({ length: n }, (_, i) => `
              <span class="otp-slot" data-slot="${i}" style="width:${W}px;transform:translateX(${home(i)}px);opacity:1">
                ${this._code[i] ? `<span class="otp-digit">${this._escape(this._code[i])}</span>` : ''}
              </span>
            `).join('')}
            <i class="otp-caret" data-on="${this._phase === 'type' && this._focus && this._code.length < n && m < 0.08 ? 'true' : 'false'}"></i>
            <span class="otp-ok" style="opacity:${m};scale:${mix(0.92,1,m)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 9.2 16.5 19 7"></path></svg>
              Verified
            </span>
            <input class="otp-field" inputmode="numeric" autocomplete="one-time-code" maxlength="${n}" aria-label="${this._phase === 'ok' ? 'Verified. Press to enter a new code' : `${n}-digit code`}" spellcheck="false" ${this.disabled ? 'disabled' : ''} value="${this._escape(this._code)}" />
          </div>
          ${this._useGoo()}
        </div>
      `;

      this._input = this.shadowRoot.querySelector('.otp-field');
      this._input.addEventListener('input', (e) => this._onChange(e.target.value));
      this._input.addEventListener('focus', () => { this._focus = true; this._wake(); });
      this._input.addEventListener('blur', () => { this._focus = false; });
      this._input.addEventListener('pointerdown', (e) => {
        if (this._phase === 'ok') {
          e.preventDefault();
          this._reopen();
        }
      });
      this._input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this._phase === 'no') this._reset();
      });
      this._applyTheme();
    }

    _updateVisuals(now) {
      const n = this._n();
      const rowW = this._rowW();
      const raw = this._merge.m;
      const m = clamp(raw, 0, 1);
      const over = raw - 1;
      const home = (i) => i * (W + G);
      const mid = (rowW - W) / 2;
      const since = now - this._shook;
      const shaking = this._phase === 'no' && since < SHAKE_MS && !this._still;
      const shake = (i) => shaking ? 5 * Math.exp(-since / 190) * Math.sin((since / 1000) * Math.PI * 2 * 10 + i * 0.55) : 0;
      const cellX = (i) => mix(home(i), mid, m) + shake(i);
      const pop = (i) => {
        const at = this._popAt[i];
        if (at === undefined) return 1;
        const u = (now - at) / POP_MS;
        return u > 0 && u < 1 ? 1 + 0.04 * Math.sin(Math.PI * u) : 1;
      };
      const breath = (i) => {
        if (this._phase !== 'check' || this._still) return pop(i);
        const u = ((now % 900) / 900) * (n + 2) - i;
        return 1 - 0.07 * (u > 0 && u < 2 ? Math.sin((u / 2) * Math.PI) : 0);
      };
      const capW = CAP * smooth(0.3, 1, m) * (1 + Math.max(-0.12, over) * 0.9);
      const capSy = 1 - Math.max(-0.12, over) * 0.55;
      const cellR = mix(this._r(), H / 2, smooth(0.15, 0.7, m));

      this.shadowRoot.querySelectorAll('.otp-cell[data-cell]').forEach((el, i) => {
        el.style.transform = `translateX(${cellX(i).toFixed(2)}px) scale(${breath(i).toFixed(3)})`;
        el.style.borderRadius = `${cellR}px`;
      });
      const capsule = this.shadowRoot.querySelector('[data-capsule]');
      if (capsule) {
        capsule.style.width = `${Math.max(0, capW).toFixed(2)}px`;
        capsule.style.transform = `translateX(${((rowW - capW) / 2).toFixed(2)}px) scaleY(${capSy.toFixed(3)})`;
      }
      this.shadowRoot.querySelectorAll('.otp-slot').forEach((el, i) => {
        const out = this._phase === 'no' && !this._still ? smooth(0, 1, (since - 300 - (n - 1 - i) * 45) / 220) : 0;
        el.style.transform = `translateX(${cellX(i).toFixed(2)}px)`;
        el.style.opacity = `${1 - smooth(0, 0.45, m)}`;
        const digit = el.querySelector('.otp-digit');
        if (digit) {
          digit.style.translate = `0 ${(out * 8).toFixed(2)}px`;
          digit.style.opacity = `${1 - out}`;
        }
      });
      const caret = this.shadowRoot.querySelector('.otp-caret');
      if (caret) {
        const typing = this._phase === 'type' && this._focus;
        caret.dataset.on = typing && this._code.length < n && m < 0.08 ? 'true' : 'false';
        caret.style.transform = `translateX(${(this._caret.x - 1).toFixed(2)}px) scaleX(${(1 + Math.min(5, Math.abs(this._caret.v) * 0.9)).toFixed(3)})`;
      }
      const ok = this.shadowRoot.querySelector('.otp-ok');
      if (ok) {
        ok.style.opacity = `${smooth(0.72, 1, m)}`;
        ok.style.scale = `${mix(0.92, 1, smooth(0.72, 1, m))}`;
      }
      const otp = this.shadowRoot.querySelector('.otp');
      if (otp) otp.dataset.phase = this._phase;
    }

    _applySize() {
      const w = this._rowW();
      this.style.width = `${w}px`;
      this.style.height = `${H}px`;
      this.style.minWidth = `${w}px`;
      this.style.minHeight = `${H}px`;
    }

    _applyTheme() {
      const theme = (this.getAttribute('theme') || 'dark').toLowerCase();
      if (theme === 'dark') {
        this.style.setProperty('--bencho-card', '#25262b');
        this.style.setProperty('--bencho-fill-slab', '#25262b');
        this.style.setProperty('--bencho-fill-on', '#f6f7f9');
        this.style.setProperty('--bencho-ink', '#f6f7f9');
      } else {
        this.style.setProperty('--bencho-card', '#e9e9ec');
        this.style.setProperty('--bencho-fill-slab', '#e9e9ec');
        this.style.setProperty('--bencho-fill-on', '#121214');
        this.style.setProperty('--bencho-ink', '#121214');
      }
    }

    _onChange(raw) {
      if (this.disabled || this._phase !== 'type') return;
      const n = this._n();
      const next = String(raw ?? '').replace(/\D/g, '').slice(0, n);
      if (!this._still && next.length > this._code.length) {
        const t0 = performance.now();
        for (let i = this._code.length; i < next.length; i++) {
          this._popAt[i] = t0 + (i - this._code.length) * 45;
        }
      }
      this._code = next;
      this._live = { code: this._code, n };
      const wasFocused = this._focus;
      this._render();
      this._applySize();
      if (wasFocused) {
        requestAnimationFrame(() => {
          this._focus = true;
          this._input?.focus();
          try { this._input?.setSelectionRange(this._code.length, this._code.length); } catch (_) {}
        });
      }
      this._dispatch('change', { code: this._code, length: n, phase: this._phase });
      this._wake();
      if (next.length < n) return;

      this._phase = 'check';
      this._render();
      this._dispatch('complete', { code: next, length: n });
      this._later(() => {
        if ((this.answer || 'Accept').toLowerCase() !== 'reject') {
          this._phase = 'ok';
          this._merge.to = 1;
          this._input?.blur();
          this._render();
          this._dispatch('verified', { code: next, length: n });
          this._wake();
        } else {
          this._phase = 'no';
          this._shook = performance.now();
          this._render();
          this._dispatch('rejected', { code: next, length: n });
          this._wake();
          this._later(() => this._reset(), SHAKE_MS + n * 45 + 160);
        }
      }, this._still ? 0 : 420);
    }

    _reopen() {
      if (this._phase !== 'ok') return;
      this._code = '';
      this._phase = 'type';
      this._merge.to = 0;
      this._render();
      this._applySize();
      this._dispatch('reopen', { length: this._n() });
      this._wake();
      requestAnimationFrame(() => this._input?.focus());
    }

    _reset() {
      this._code = '';
      this._phase = 'type';
      this._merge = { m: 0, v: 0, to: 0 };
      this._render();
      this._applySize();
      this._dispatch('reset', { length: this._n() });
      this._wake();
    }

    _dispatch(name, detail) {
      this.dispatchEvent(new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
      }));
    }

    _escape(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }
  }

  customElements.define(TAG, BenchoOneTimeCode);
})();

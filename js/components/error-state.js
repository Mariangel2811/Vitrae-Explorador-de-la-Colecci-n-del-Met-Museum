
class ErrorState extends HTMLElement {
  static get observedAttributes() {
    return ['message'];
  }

  constructor() {
    super();
    this._retryCallback = null;
  }

  connectedCallback() {
    this.classList.add('error-state');
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  onRetry(callback) {
    this._retryCallback = callback;
  }

  _render() {
    while (this.firstChild) this.removeChild(this.firstChild);

    const icon = document.createElement('div');
    icon.className = 'error-icon';
    icon.textContent = '⚠';
    this.appendChild(icon);

    const text = document.createElement('p');
    text.className = 'error-text';
    text.textContent = this.getAttribute('message') || 'Ocurrió un error al cargar los datos.';
    this.appendChild(text);

    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'error-retry-btn';
    retryButton.textContent = 'Reintentar';
    retryButton.addEventListener('click', () => {
      if (typeof this._retryCallback === 'function') {
        this._retryCallback();
      }
    });
    this.appendChild(retryButton);
  }
}

customElements.define('error-state', ErrorState);

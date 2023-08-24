import { LitElement, PropertyValueMap, html } from 'lit';
import { state, property } from 'lit/decorators.js'
import { Client, KcUserManager, type MessageCallback, type MessageType } from "./KcUserManager.js";

class AppFoo extends LitElement {
  @property()
  clientId?: string;

  @property()
  url?: string;

  @property()
  realm?: string;

  client?: Client;

  #init() {
    if (this.clientId && this.url && this.realm) {
      this.client = KcUserManager.getInstance({
        clientId: this.clientId,
        url: this.url,
        realm: this.realm
      });
      this.client?.init().then(() => {
        this.requestUpdate()
      });
    }
  }

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (_changedProperties.has('clientId')) {
      this.#init();
    }
  }

  renderActionButtons() {
    if (!this.client?.keycloak.authenticated) {
      return html`<button @click=${() => this.client?.login()}>login</button>`
    }
    else {
      return html`<button @click=${() => this.client?.keycloak.logout()}>logout</button>`;
    }
  }

  render() {
    return html`
      <h2>ClientId: ${this.clientId}</h2>
      <div>${this.renderActionButtons()}</div>
      <div>${this.client?.keycloak ? html`${JSON.stringify(this.client?.keycloak.tokenParsed, null, 2)}` : ''}</div>
    `
  }
}

customElements.define('app-foo', AppFoo);

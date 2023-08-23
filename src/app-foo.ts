import { LitElement, html } from 'lit';
import { state } from 'lit/decorators.js'
import { KcUserManager, type MessageCallback, type MessageType } from "./KcUserManager.js";

const client = KcUserManager.getInstance('my_client_id');

class AppFoo extends LitElement {
  constructor() {
    super();
    client.init().then(() => {
      this.requestUpdate()
    })
  };

  renderActionButtons() {
    if (!client.keycloak.authenticated) {
      return html`<button @click=${() => client.login()}>login</button>`
    }
    else {
      return html`<button @click=${() => client.keycloak.logout()}>logout</button>`;
    }
  }

  render() {
    return html`
      <div>${this.renderActionButtons()}</div>
      <div>${client.keycloak ? html`${JSON.stringify(client.keycloak.tokenParsed, null, 2)}` : ''}</div>
    `
  }
}

customElements.define('app-foo', AppFoo);

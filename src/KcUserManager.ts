import Keycloak, { type KeycloakInitOptions } from "keycloak-js";
import { keyed } from "lit/directives/keyed.js";

export type MessageType = { type: "login"; requester: Client["clientId"] } | { type: "logout" };
export type MessageCallback = CustomEventInit<MessageType>;

export class KcUserManager {
  static instance: KcUserManager;
  public clients: Map<Client["clientId"], Client> = new Map();

  public static getInstance(clientId: Client["clientId"]): Client {
    if (!KcUserManager.instance) {
      KcUserManager.instance = new KcUserManager();
    }
    return KcUserManager.instance.#createClient(clientId);
  }

  _login(client: Client) {
    // lazy notify all of the clients
    requestAnimationFrame(() => {
      [...KcUserManager.instance.clients].forEach(([_, value]) => {
        value.dispatchEvent(
          new CustomEvent<MessageType>("update", {
            detail: { type: "login", requester: "123" },
          })
        );
      });
    });
  }

  #createClient(clientId: Client["clientId"]): Client {
    if (KcUserManager.instance.clients.has(clientId)) {
      const client = KcUserManager.instance.clients.get(clientId);
      if (client) {
        return client;
      }
    }
    const client = new Client(clientId, KcUserManager.instance);
    KcUserManager.instance.clients.set(clientId, client);
    return client;
  }
}

export class Client extends EventTarget {
  clientId: string;
  manager: KcUserManager;
  keycloak: Keycloak;
  #initializer?: Promise<Boolean>;

  constructor(clientId: Client["clientId"], manager: KcUserManager) {
    super();
    this.clientId = clientId;
    this.manager = manager;

    const kcConfig = {
      url: 'http://sso.my-app.traefik.me/auth',
      realm: 'redhat-external',
      clientId: clientId,
    }
    this.keycloak = new Keycloak(kcConfig);
  }

  public init() {
    if (this.#initializer) {
      return this.#initializer;
    }

    const kcOptions = {
      enableLogging: true,
      pkceMethod: "S256",
      silentCheckSsoRedirectUri: `${window.location.href}/silent-check-sso.html`,
      onLoad: "check-sso",
      silentCheckSsoFallback: false,
      responseMode: 'fragment',
      flow: 'standard',
    } satisfies KeycloakInitOptions;
    console.log(this.#initializer);
    this.#initializer = this.keycloak.init(kcOptions)
      .then(authenticated => {
        if (authenticated) {
          if (this.keycloak.token) {
            // localStorage.setItem('kc-token', this.keycloak.token);
          }
        }
        return authenticated
      })
    return this.#initializer;
  }

  public async login() {
    this.manager._login(this);
    return this.keycloak.login();
  }
}

// @ts-ignore
window.KcUserManager = KcUserManager;

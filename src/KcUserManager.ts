import Keycloak, { type KeycloakInitOptions } from "keycloak-js";

export type MessageType =
  | { type: "login"; requester: Client; }
  | { type: "logout"; requester: Client; }
  | { type: "initialized"; authenticated: boolean; requester: Client; }

export type MessageCallback = CustomEventInit<MessageType>;

export class KcUserManager extends EventTarget {
  static instance: KcUserManager;
  #clients: Map<Client["clientId"], Client> = new Map();

  public static getInstance(clientId: Client["clientId"]): Client {
    if (!KcUserManager.instance) {
      KcUserManager.instance = new KcUserManager();
    }
    return KcUserManager.instance.#createClient(clientId);
  }

  #createClient(clientId: Client["clientId"]): Client {
    if (KcUserManager.instance.#clients.has(clientId)) {
      const client = KcUserManager.instance.#clients.get(clientId);
      if (client) {
        return client;
      }
    }
    const client = new Client(clientId);
    KcUserManager.instance.#clients.set(clientId, client);
    return client;
  }

  protected _update(detail: MessageType) {
    // lazy notify all of the clients
    requestAnimationFrame(() => {
      // send an event to all clients and to all 
      KcUserManager.instance.dispatchEvent(
        new CustomEvent<MessageType>("update", { detail: { ...detail } })
      );
    });
  }
}

export class Client extends KcUserManager {
  clientId: string;
  keycloak: Keycloak;
  #initializer?: Promise<Boolean>;

  constructor(clientId: Client["clientId"]) {
    super();
    this.clientId = clientId;

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

    this.#initializer = this.keycloak.init(kcOptions)
      .then(authenticated => {
        this._update({ type: 'initialized', authenticated, requester: this });
        if (authenticated) {
          if (this.keycloak.token) {
            // localStorage.setItem('kc-token', this.keycloak.token);
          }
        }
        return authenticated;
      });
    return this.#initializer;
  }

  public async login() {
    this._update({ type: 'login', requester: this })
    return this.keycloak.login();
  }

  public async logout() {
    this._update({ type: 'logout', requester: this })
    return this.keycloak.login();
  }
}

// @ts-ignore
window.KcUserManager = KcUserManager;

import Keycloak, { type KeycloakInitOptions, KeycloakConfig } from "keycloak-js";

type OmitPropFromUnion<T, K extends keyof T> = T extends T ? Omit<T, K> : never;

export type MessageType =
  | { type: "login"; requester: Client; }
  | { type: "logout"; requester: Client; }
  | { type: "initialized"; authenticated: boolean; requester: Client; }

export type MessageCallback = CustomEventInit<MessageType>;

const requiredKcConfigParams: Array<keyof KeycloakConfig> = ['clientId', 'url', 'realm'];

export class KcUserManager extends EventTarget {
  static instance: KcUserManager;
  #clients: Map<Client["clientId"], Client> = new Map();

  public static getInstance(kcConfig: KeycloakConfig): Client {
    if (!KcUserManager.instance) {
      KcUserManager.instance = new KcUserManager();
    }
    return KcUserManager.instance.#createClient(kcConfig);
  }

  #createClient(kcConfig: KeycloakConfig): Client {
    if (!requiredKcConfigParams.every(i => kcConfig.hasOwnProperty(i))) {
      throw new Error('Required kcConfig properties missing');
    }
    if (KcUserManager.instance.#clients.has(kcConfig.clientId)) {
      const client = KcUserManager.instance.#clients.get(kcConfig.clientId);
      if (client) {
        return client;
      }
    }
    const client = new Client(kcConfig);
    KcUserManager.instance.#clients.set(kcConfig.clientId, client);
    return client;
  }

  protected _update(client: Client, detail: OmitPropFromUnion<MessageType, 'requester'>) {
    // lazy send notifications to the message bus 
    requestAnimationFrame(() => {
      KcUserManager.instance.dispatchEvent(
        new CustomEvent<MessageType>("update", { detail: { ...detail, requester: client } })
      );
    });
  }
}

export class Client extends KcUserManager {
  clientId: KeycloakConfig['clientId'];
  keycloak: Keycloak;
  #initializer?: Promise<Boolean>;

  constructor(kcConfig: KeycloakConfig) {
    super();
    this.clientId = kcConfig.clientId;

    this.keycloak = new Keycloak(kcConfig);

    KcUserManager.instance.addEventListener('update', (e: MessageCallback) => {
      if (e.detail?.type === 'initialized' && e.detail.requester !== this && this.#initializer !== undefined) {
        console.log({ ...e.detail })
      }
    });
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
        this._update(this, { type: 'initialized', authenticated });
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
    this._update(this, { type: 'login' })
    return this.keycloak.login();
  }

  public async logout() {
    this._update(this, { type: 'logout' })
    return this.keycloak.login();
  }
}

// @ts-ignore
window.KcUserManager = KcUserManager;

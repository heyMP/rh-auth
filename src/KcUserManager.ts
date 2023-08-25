import Keycloak, { type KeycloakInitOptions, KeycloakConfig } from "keycloak-js";

type OmitPropFromUnion<T, K extends keyof T> = T extends T ? Omit<T, K> : never;

export type MessageType =
  | { type: "login"; requester: Client; }
  | { type: "logout"; requester: Client; }
  | { type: "initialized"; authenticated: boolean; requester: Client; }

export type MessageCallback = CustomEventInit<MessageType>;

const requiredKcConfigParams: Array<keyof KeycloakConfig> = ['clientId', 'url', 'realm'];

/**
 * Singleton that creates a new keycloak client instance.
 *
 * Usage: KcUserManager.getInstance(kcConfig: KeycloakConfig, kcOptions?: KeycloakInitOptions)
 */
export class KcUserManager extends EventTarget {
  static instance: KcUserManager;
  private clients: Map<Client["clientId"], Client> = new Map();

  /**
   * Create a new Client instance.
   *
   * Usage: KcUserManager.getInstance(kcConfig: KeycloakConfig, kcOptions?: KeycloakInitOptions)
   */
  public static getInstance(kcConfig: KeycloakConfig, kcOptions?: KeycloakInitOptions): Client {
    if (!KcUserManager.instance) {
      KcUserManager.instance = new KcUserManager();
    }
    return KcUserManager.instance.createClient(kcConfig, kcOptions);
  }
  private createClient(kcConfig: KeycloakConfig, kcOptions?: KeycloakInitOptions): Client {
    if (!requiredKcConfigParams.every(i => kcConfig.hasOwnProperty(i))) {
      throw new Error('Required kcConfig properties missing');
    }
    // if a user has already instanciated a client using the same
    // clientId then we'll return the existing instance.
    if (KcUserManager.instance.clients.has(kcConfig.clientId)) {
      const client = KcUserManager.instance.clients.get(kcConfig.clientId);
      if (client) {
        return client;
      }
    }
    const client = new Client(kcConfig, kcOptions);
    KcUserManager.instance.clients.set(kcConfig.clientId, client);
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
  public clientId: KeycloakConfig['clientId'];
  public keycloak: Keycloak;
  private kcOptions?: KeycloakInitOptions;
  private initializer?: Promise<Boolean>;

  constructor(kcConfig: KeycloakConfig, kcOptions?: KeycloakInitOptions) {
    super();
    this.clientId = kcConfig.clientId;

    this.keycloak = new Keycloak(kcConfig);
    this.kcOptions = kcOptions;
    console.log(kcOptions)

    KcUserManager.instance.addEventListener('update', (e: MessageCallback) => {
      if (e.detail?.type === 'initialized' && e.detail.requester !== this && this.initializer !== undefined) {
        console.log({ ...e.detail })
      }
    });
  }

  public init() {
    if (this.initializer) {
      return this.initializer;
    }

    const kcOptions: KeycloakInitOptions = {
      // default KeycloakInitOptions
      enableLogging: false,
      pkceMethod: "S256",
      /**
       * TODO: change headers on dev server to allow for the following iframe capabilites 'allow-scripts allow-same-origin'
       */
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      onLoad: "check-sso",
      silentCheckSsoFallback: true,
      responseMode: 'fragment',
      flow: 'standard',
      // user specified KeycloakInitOptions overrides
      ...this.kcOptions,
    };

    this.initializer = this.keycloak.init(kcOptions)
      .then(authenticated => {
        this._update(this, { type: 'initialized', authenticated });
        if (authenticated) {
          if (this.keycloak.token) {
            // localStorage.setItem('kc-token', this.keycloak.token);
          }
        }
        return authenticated;
      });
    return this.initializer;
  }

  /**
   * Generates a login url.
   */
  public getLoginUrl(): string | undefined {
    return this.keycloak?.createLoginUrl();
  }

  /**
   * Expose the login method.
   */
  public login() {
    this.keycloak?.login();
  }

  /**
   * Checks if the user is authenticated
   */
  public isLoggedIn(): boolean | undefined {
    return this.keycloak?.authenticated;
  }

  /**
   * Expose the logout method.
   */
  public logOut() {
    this.keycloak?.logout();
  }

  /**
   * Generates logout url
   */
  public getLogoutUrl(): string | undefined {
    return this.keycloak?.createLogoutUrl();
  }

  /**
   * Gets the parsed Identity Token.
   */
  public getIdTokenParsed() {
    return this.keycloak?.idTokenParsed
  }

  /**
   * Gets the Access Token.
   *
   * TODO: Get from shared storage instead.
   */
  public getToken() {
    return this.keycloak?.token;
  }

  /**
   * Wraps console log. Maybe don't need.
   *
   * @param data
   * @private
   *
   * TODO: Remove or fix ts ignore.
   */
  private log(...data: unknown[]): void {
    // @ts-ignore
    console.log(...data);
  }

  private error(...data: unknown[]): void {
    // @ts-ignore
    console.error(...data);
  }
}

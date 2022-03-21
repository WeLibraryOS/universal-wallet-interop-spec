import * as Factory from 'factory.ts';
import { IDX } from '@ceramicstudio/idx';
import CeramicClient from '@ceramicnetwork/http-client';
import type StreamID from '@ceramicnetwork/streamid';

const DEFAULT_CREDENTIAL_ALIAS = 'MyVerifiableCredentials';

const DEFAULT_ALIASES = {};

interface CredentialStreamIdInput {
  id: string;
  title: string;
}

interface CredentialItem {
  id: string;
  title: string;
}

interface CredentialsList {
  credentials: CredentialItem[];
}

interface IdxPlugin {
  idxClient: IDX | null;
  idxAliases: any;
  credentialAlias: string;
  idxClientFromCeramic: (ceramicClient: CeramicClient, options: any) => IDX;
  setIdxClient: (ceramicClient: CeramicClient, options: any) => IDX;
  getCredentialsListFromIndex: (alias?: string) => Promise<CredentialsList>;
  addCredentialStreamIdToIndex: (
    record: CredentialStreamIdInput,
    alias?: string
  ) => Promise<StreamID>;
}

const factoryDefaults = {
  idxClient: null,

  idxAliases: DEFAULT_ALIASES,

  credentialAlias: DEFAULT_CREDENTIAL_ALIAS,

  idxClientFromCeramic: function (
    ceramicClient: CeramicClient,
    options: any = {}
  ): IDX {
    if (!options.aliases) {
      options.aliases = (this as IdxPlugin).idxAliases;
    }
    const client = new IDX({ ceramic: ceramicClient, ...options });
    return client;
  },

  setIdxClient: function (
    ceramicClient: CeramicClient,
    options: any = {}
  ): IDX {
    if (!options.aliases) {
      options.aliases = (this as IdxPlugin).idxAliases;
    }

    const client = (this as IdxPlugin).idxClientFromCeramic(
      ceramicClient,
      options
    );
    (this as IdxPlugin).idxClient = client;
    return client;
  },

  getCredentialsListFromIndex: async function (
    alias?: string
  ): Promise<CredentialsList> {
    if (!alias) {
      alias = (this as IdxPlugin).credentialAlias;
    }

    if (!(this as IdxPlugin).idxClient) {
      throw new Error('No IDX client set');
    }
    return (
      (await (this as IdxPlugin).idxClient!.get(alias)) || { credentials: [] }
    );
  },

  addCredentialStreamIdToIndex: async function (
    record: CredentialStreamIdInput,
    alias?: string
  ): Promise<StreamID> {
    if (!record) {
      throw new Error('record is required');
    }

    if (!record.id) {
      throw Error('No streamId provided');
    }

    // check streamId format
    if (record.id.indexOf('ceramic://') === -1) {
      record.id = 'ceramic://' + record.id;
    }

    const client = (this as IdxPlugin).idxClient;
    if (!client) {
      throw Error('No IDX client available');
    }

    if (!alias) {
      alias = (this as IdxPlugin).credentialAlias;
    }

    const existing = await (this as IdxPlugin).getCredentialsListFromIndex(
      alias
    );

    existing.credentials.push(record);

    if (!(this as IdxPlugin).idxClient) {
      throw new Error('No IDX client set');
    }

    return (this as IdxPlugin).idxClient!.set(alias, existing);
  },
};

const pluginFactory = Factory.Sync.makeFactory<IdxPlugin>(factoryDefaults);

const plugin = pluginFactory.build();

export { IdxPlugin, pluginFactory, factoryDefaults, plugin };

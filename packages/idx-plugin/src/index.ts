import * as Factory from 'factory.ts';
import { IDX } from '@ceramicstudio/idx';
import CeramicClient from '@ceramicnetwork/http-client';

const CREDENTIAL_ALIAS = 'credentials';

const LOCAL_ALIASES = {
  [CREDENTIAL_ALIAS]:
    'kjzl6cwe1jw145srdogldozsvu5600tog0dsuus6q2zguhlv4m5z72z5xe6cv4l',
};

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
  idxClient: any; // TODO: this is really an optional IDX, not any
  idxAliases: any;
  credentialAlias: string;
  idxClientFromCeramic: (ceramicClient: CeramicClient, options: any) => IDX;
  setIdxClient: (ceramicClient: CeramicClient, options: any) => IDX;
  getCredentialsListFromIndex: (alias: string) => Promise<CredentialsList>;
  addCredentialStreamIdToIndex: (
    record: CredentialStreamIdInput,
    alias: string
  ) => Promise<string>;
}

const factoryDefaults = {
  idxClient: null,

  idxAliases: LOCAL_ALIASES,

  credentialAlias: CREDENTIAL_ALIAS,

  idxClientFromCeramic: (
    ceramicClient: CeramicClient,
    options: any = { aliases: LOCAL_ALIASES }
  ): IDX => {
    const client = new IDX({ ceramic: ceramicClient, ...options });
    return client;
  },

  setIdxClient: function(ceramicClient: CeramicClient, options: any = {}): IDX {
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

  getCredentialsListFromIndex: async function(
    alias: string
  ): Promise<CredentialsList> {
    if (!alias) {
      alias = (this as IdxPlugin).credentialAlias;
    }
    return (await (this as IdxPlugin).idxClient.get(alias)) || { credentials: [] };
  },

  addCredentialStreamIdToIndex: async function(
    record: CredentialStreamIdInput,
    alias: string
  ): Promise<string> {
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

    console.log(existing);
    
    return (this as IdxPlugin).idxClient.set(alias, existing);
  },
};

const pluginFactory = Factory.Sync.makeFactory<IdxPlugin>(factoryDefaults);

const plugin = pluginFactory.build();

export { IdxPlugin, pluginFactory, factoryDefaults, plugin };

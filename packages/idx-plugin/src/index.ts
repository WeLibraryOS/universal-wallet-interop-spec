import * as Factory from 'factory.ts';
import { IDX } from '@ceramicstudio/idx';
import CeramicClient from '@ceramicnetwork/http-client';

const CREDENTIAL_ALIAS = 'credentials';

const LOCAL_ALIASES = {
  [CREDENTIAL_ALIAS]:
    'kjzl6cwe1jw147ou54myn46e38l7bhhfj0pwxe3py3yl3cbg39aos1ivc3bhqjz',
};

interface IdxPlugin {
  idxClient: any; // TODO: this is really an optional IDX, not any

  idxAliases: any;

  credentialAlias: String;

  idxClientFromCeramic: (ceramicClient: CeramicClient, options: any) => IDX;
  
  setIdxClient: (ceramicClient: CeramicClient, options: any) => IDX;

  getCredentialStreamIdsFromIndex: (alias: String) => Promise<any[]>;
  
  addCredentialStreamIdToIndex: (streamId: String, alias: String) => Promise<String>;
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

  setIdxClient: function(
    ceramicClient: CeramicClient,
    options: any = {},
  ): IDX {

    if (!options.aliases) {
      options.aliases = (this as IdxPlugin).idxAliases;
    }

    const client = (this as IdxPlugin).idxClientFromCeramic(ceramicClient, options);
    (this as IdxPlugin).idxClient = client;
    return client;
  },

  getCredentialStreamIdsFromIndex: async (alias: String): Promise<any[]> => {
    return (await (this as IdxPlugin).idxClient.get(alias)) || [];
  },

  addCredentialStreamIdToIndex: async (streamId: String, alias: String): Promise<String> => {
    if (!streamId) {
      throw Error('No streamId provided');
    }

    const client = (this as IdxPlugin).idxClient;
    if (!client) {
      throw Error('No IDX client available');
    }
    
    const existing = await (this as IdxPlugin).getCredentialStreamIdsFromIndex(alias);
    return (this as IdxPlugin).idxClient.set(alias, existing.push(streamId));
  }
};

const pluginFactory = Factory.Sync.makeFactory<IdxPlugin>(factoryDefaults);

const plugin = pluginFactory.build();

export { IdxPlugin, pluginFactory, factoryDefaults, plugin };

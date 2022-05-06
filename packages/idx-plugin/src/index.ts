import * as Factory from 'factory.ts';
import { IDX, IDXOptions, Aliases } from '@ceramicstudio/idx';
import CeramicClient from '@ceramicnetwork/http-client';
import StreamID from '@ceramicnetwork/streamid';

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
    idxAliases: Aliases;
    credentialAlias: string;
    idxClientFromCeramic: (ceramicClient: CeramicClient, options?: Partial<IDXOptions>) => IDX;
    setIdxClient: (ceramicClient: CeramicClient, options?: Partial<IDXOptions>) => IDX;
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

    idxClientFromCeramic: function(
        this: IdxPlugin,
        ceramicClient: CeramicClient,
        options: Partial<IDXOptions> = {}
    ): IDX {
        if (!options.aliases) options.aliases = this.idxAliases;

        const client = new IDX({ ceramic: ceramicClient, ...options });

        return client;
    },

    setIdxClient: function(
        this: IdxPlugin,
        ceramicClient: CeramicClient,
        options: Partial<IDXOptions> = {}
    ): IDX {
        if (!options.aliases) options.aliases = this.idxAliases;

        const client = this.idxClientFromCeramic(ceramicClient, options);

        this.idxClient = client;

        return client;
    },

    getCredentialsListFromIndex: async function(
        this: IdxPlugin,
        alias?: string
    ): Promise<CredentialsList> {
        if (!alias) alias = this.credentialAlias;

        if (!this.idxClient) throw new Error('No IDX client set');

        return (await this.idxClient.get(alias)) || { credentials: [] };
    },

    addCredentialStreamIdToIndex: async function(
        this: IdxPlugin,
        record: CredentialStreamIdInput,
        alias?: string
    ): Promise<StreamID> {
        if (!record) throw new Error('record is required');

        if (!record.id) throw Error('No streamId provided');

        // check streamId format
        if (record.id.indexOf('ceramic://') === -1) record.id = 'ceramic://' + record.id;

        const client = this.idxClient;

        if (!client) throw Error('No IDX client available');

        if (!alias) alias = this.credentialAlias;

        const existing = await this.getCredentialsListFromIndex(alias);

        existing.credentials.push(record);

        if (!this.idxClient) throw new Error('No IDX client set');

        return this.idxClient.set(alias, existing);
    },
};

const pluginFactory = Factory.Sync.makeFactory<IdxPlugin>(factoryDefaults);

const plugin = pluginFactory.build();

export { IdxPlugin, pluginFactory, factoryDefaults, plugin };

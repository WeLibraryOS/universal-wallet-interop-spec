import * as Factory from 'factory.ts';
import CeramicClient from '@ceramicnetwork/http-client';
import { TileDocument, TileMetadataArgs } from '@ceramicnetwork/stream-tile';
import { CreateOpts } from '@ceramicnetwork/common';
import KeyDidResolver from 'key-did-resolver';
import { DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { toUint8Array } from 'hex-lite';

const LOCAL_CERAMIC_NODE = 'http://0.0.0.0:7007';
const VC_CREDENTIAL_CONTENT_FAMILY = 'universal-wallet-vc-credential';

interface CeramicPlugin {
  ceramicClient: any; // TODO: this is optional CeramicClient
  defaultContentFamily: string;
  ceramicEndpoint: string;

  ceramicClientFromWalletSuite: (wallet: any) => Promise<CeramicClient>;

  setCeramicClientFromWalletSuite: (wallet: any) => Promise<CeramicClient>;

  publishContentToCeramic: (
    content: any,
    metadata?: TileMetadataArgs,
    options?: CreateOpts
  ) => Promise<string>;

  readContentFromCeramic: (streamId: string) => Promise<any>;
}

const factoryDefaults = {
  ceramicClient: null,

  defaultContentFamily: VC_CREDENTIAL_CONTENT_FAMILY,

  ceramicEndpoint: LOCAL_CERAMIC_NODE,

  ceramicClientFromWalletSuite: async function(
    wallet: any = {}
  ): Promise<CeramicClient> {
    const client = new CeramicClient((this as CeramicPlugin).ceramicEndpoint);

    // only supporting did-key atm. this should be stripped into a config param
    const resolver = { ...KeyDidResolver.getResolver() };
    const did = new DID({ resolver });
    client.did = did;

    // use wallet secret key
    // TODO: this is repeating work already done in the wallet. understand what the Ed25519Provider is doing to determine
    // if we can just pass wallet signing key here instead of creating a duplicate from same seed.
    const contents = JSON.parse(JSON.stringify(wallet.contents));
    const key = contents?.find(
      (c: { name: string }) => c?.name === 'DID Key Secret'
    )?.value;

    const ceramicProvider = new Ed25519Provider(toUint8Array(key));
    client.did.setProvider(ceramicProvider);

    await client.did.authenticate();

    return client;
  },

  setCeramicClientFromWalletSuite: async function(
    wallet: any = {}
  ): Promise<CeramicClient> {
    const client = await (this as CeramicPlugin).ceramicClientFromWalletSuite(
      wallet
    );
    (this as CeramicPlugin).ceramicClient = client;
    return client;
  },

  publishContentToCeramic: async function(
    content: any,
    metadata: TileMetadataArgs = {},
    options: CreateOpts = {}
  ) {
    if (!content) {
      throw new Error('content is required');
    }

    const client = (this as CeramicPlugin).ceramicClient;
    if (!client) {
      throw new Error('ceramicClient not set');
    }

    // default to current authorized
    if (!metadata.controllers) {
      metadata.controllers = [(this as CeramicPlugin).ceramicClient.did.id];
    }

    // use default
    if (!metadata.family) {
      metadata.family = (this as CeramicPlugin).defaultContentFamily;
    }

    // default to pinning
    // TODO: expose
    if (!('pin' in options)) {
      options.pin = true;
    }

    // assuming TileDocument for now
    const doc = await TileDocument.create(client, content, metadata, options);

    return doc.id.toString();
  },

  readContentFromCeramic: async function(streamId: string) {
    const client = (this as CeramicPlugin).ceramicClient;
    if (!client) {
      throw new Error('ceramicClient not set');
    }

    return (await TileDocument.load(client, streamId))?.content;
  },
};

const pluginFactory = Factory.Sync.makeFactory<CeramicPlugin>(factoryDefaults);

const plugin = pluginFactory.build();

export { CeramicPlugin, pluginFactory, factoryDefaults, plugin };

import * as Factory from 'factory.ts';
import CeramicClient from "@ceramicnetwork/http-client";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import KeyDidResolver from "key-did-resolver";
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { toUint8Array } from "hex-lite";

const LOCAL_CERAMIC_NODE = "http://0.0.0.0:7007";

interface CeramicPlugin {
  ceramicClient: any; // TODO: this is optional CeramicClient
  defaultContentFamily: String;
  endpoint: String;

  ceramicClientFromEndpointAndWalletSuite: (
    wallet: any,
  ) => Promise<CeramicClient>;

  setCeramicClientFromEndpointAndWalletSuite: (
    wallet: any,
  ) => Promise<CeramicClient>;

  publishContent: (
    content: any,
    options: any
  ) => Promise<String>;

  readContent: (streamId: String) => Promise<any>;
}

const factoryDefaults = {
  ceramicClient: null,

  defaultContentFamily: "LEF-CREDENTIAL-TEST",

  endpoint: LOCAL_CERAMIC_NODE,

  ceramicClientFromEndpointAndWalletSuite: async function(wallet: any = {},
  ): Promise<CeramicClient> {

    const client = new CeramicClient((this as CeramicPlugin).endpoint);

    // only supporting did-key atm. this should be stripped into a config param
    const resolver = { ...KeyDidResolver.getResolver() };
    const did = new DID({ resolver });
    client.did = did;

    // use wallet secret key
    // TODO: this is repeating work already done in the wallet. understand what the Ed25519Provider is doing to determine
    // if we can just pass wallet signing key here instead of creating a duplicate from same seed.
    const contents = JSON.parse(JSON.stringify(wallet.contents));
    const key = contents?.find(
      (c: { name: String }) => c?.name === 'DID Key Secret'
    )?.value;

    const ceramicProvider = new Ed25519Provider(
        toUint8Array(key)
      );
    client.did.setProvider(ceramicProvider);

    await client.did.authenticate();

    return client;
  },

  setCeramicClientFromEndpointAndWalletSuite: async function(
      wallet: any = {},
  ): Promise<CeramicClient> {

    const client = await (this as CeramicPlugin).ceramicClientFromEndpointAndWalletSuite(wallet);
    (this as CeramicPlugin).ceramicClient = client;
    return client;
  },

  publishContent: async function(content: any, options: any = { controllers: []}) {
    if (!content) {
      throw new Error('content is required');
    }

    const client = (this as CeramicPlugin).ceramicClient;
    if (!client) {
      throw new Error("ceramicClient not set");
    }

    if (!options.family) {
      options.family = (this as CeramicPlugin).defaultContentFamily;
    }
    // assuming TileDocument for now
    const doc = await TileDocument.create(client, content, options);

    console.log(doc); // TODO: remove when done debugging
    
    return doc.id.toString();
  },

  readContent: async function(streamId: String) {
    const client = (this as CeramicPlugin).ceramicClient;
    if (!client) {
      throw new Error("ceramicClient not set");
    }

    return TileDocument.load(client, streamId);
  }
};

const pluginFactory = Factory.Sync.makeFactory<CeramicPlugin>(factoryDefaults);

const plugin = pluginFactory.build();

export { CeramicPlugin, pluginFactory, factoryDefaults, plugin };

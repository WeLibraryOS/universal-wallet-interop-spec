import * as Factory from 'factory.ts';

import CeramicClient from "@ceramicnetwork/http-client";
import KeyDidResolver from "key-did-resolver";
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { toUint8Array } from "hex-lite";

const LOCAL_CERAMIC_NODE = "http://0.0.0.0:7007";

interface CeramicPlugin {
  ceramicClientFromEndpointAndWalletSuite: (
    endpoint: string,
    wallet: any,
  ) => Promise<CeramicClient>;
}

const factoryDefaults = {
    ceramicClientFromEndpointAndWalletSuite: async (
        endpoint: string = LOCAL_CERAMIC_NODE,
        wallet: any = {},
  ): Promise<CeramicClient> => {

    const client = new CeramicClient(endpoint);

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

    const ceramicProvider = new Ed25519Provider(
        toUint8Array(key)
      );
    client.did.setProvider(ceramicProvider);

    await client.did.authenticate();

    return client;
  },
};

const pluginFactory = Factory.Sync.makeFactory<CeramicPlugin>(factoryDefaults);

const plugin = pluginFactory.build();

export { CeramicPlugin, pluginFactory, factoryDefaults, plugin };

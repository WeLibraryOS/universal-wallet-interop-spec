import * as Factory from 'factory.ts';
import { IDX } from "@ceramicstudio/idx";
import CeramicClient from "@ceramicnetwork/http-client";

const LOCAL_ALIASES = {
  credentials:
    "kjzl6cwe1jw147ou54myn46e38l7bhhfj0pwxe3py3yl3cbg39aos1ivc3bhqjz",
};

interface IdxPlugin {
  IdxClientFromCeramic: (
    ceramicClient: CeramicClient,
    options: any,
  ) => IDX;
}

const factoryDefaults = {
  IdxClientFromCeramic: (
      ceramicClient: CeramicClient,
      options: object = { aliases: LOCAL_ALIASES },
  ): IDX => {

    const client = new IDX({ ceramic: ceramicClient, ...options});
    return client;
  },
};

const pluginFactory = Factory.Sync.makeFactory<IdxPlugin>(factoryDefaults);

const plugin = pluginFactory.build();

export { IdxPlugin, pluginFactory, factoryDefaults, plugin };

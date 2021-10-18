import { createExtendIntegrationInCtx, createAddIntegrationToCtx } from './context';
import { getIntegrationConfig, createProxiedApi } from './_proxyUtils';
import { Context as NuxtContext, Plugin as NuxtPlugin } from '@nuxt/types';
import axios from 'axios';

type InjectFn = (key: string, value: any) => void;
export type IntegrationPlugin = (pluginFn: NuxtPlugin) => NuxtPlugin

const parseCookies = (cookieString: string): Record<string, string> =>
  cookieString
    .split(';')
    .reduce((obj, item) => {
      if (item) {
        const [name, value] = item.split('=');

        obj[name.trim()] = value.trim();
      }

      return obj;
    }, {});

const setCookieValues = (cookieValues: Record<string, string>, cookieString = '') => {
  const parsed = parseCookies(cookieString);

  Object.entries(cookieValues).forEach(([name, value]) => parsed[name] = value);

  return Object.entries(parsed).map(([name, value]) => `${name}=${value}`).join('; ');
};

export const integrationPlugin = (pluginFn: NuxtPlugin) => (nuxtCtx: NuxtContext, inject: InjectFn) => {
  const configure = (tag, configuration) => {
    const injectInContext = createAddIntegrationToCtx({ tag, nuxtCtx, inject });
    const config = getIntegrationConfig(nuxtCtx, configuration);
    const { middlewareUrl } = (nuxtCtx as any).$config;

    if (middlewareUrl) {
      config.axios.baseURL = middlewareUrl;
    }

    const client = axios.create(config.axios);
    const api = createProxiedApi({ givenApi: configuration.api || {}, client, tag });

    if (nuxtCtx.app.i18n.cookieValues) {
      client.defaults.headers.cookie = setCookieValues(nuxtCtx.app.i18n.cookieValues, client.defaults.headers.cookie);
    }

    injectInContext({ api, client, config });
  };

  const extend = (tag, integrationProperties) => {
    createExtendIntegrationInCtx({ tag, nuxtCtx, inject })(integrationProperties);
  };

  const integration = { configure, extend };

  pluginFn({ ...nuxtCtx, integration } as NuxtContext, inject);
};

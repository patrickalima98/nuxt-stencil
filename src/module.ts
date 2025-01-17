import path from 'path';
import os from 'os';
import { renderStencil } from './helpers';

interface NuxtStencilOptions {
  lib: string;
  prefix: string;
  renderOptions?: object;
  loaderPath?: string;
  hydratePath?: string;
  ignoredElements?: RegExp[];
}

function stencilModule(_moduleOptions): void {
  const { stencil } = this.options;

  // Combine options
  const moduleOptions: NuxtStencilOptions = {
    lib: null,
    prefix: null,
    renderOptions: {},
    loaderPath: null,
    hydratePath: null,
    ignoredElements: null,
    ...stencil,
    ..._moduleOptions,
  };

  if (!moduleOptions.lib || !moduleOptions.prefix) {
    throw new Error(`[Stencil module] Library name or path & prefix must be provided.`);
  }

  // Assign hydratePath if not defined
  if (!moduleOptions.hydratePath) {
    Object.assign(moduleOptions, { hydratePath: `${moduleOptions.lib}/dist/hydrate` });
  }

  // Assign loaderPath if not defined
  if (!moduleOptions.loaderPath) {
    Object.assign(moduleOptions, { loaderPath: `${moduleOptions.lib}/dist/loader` });
  }

  if (os.platform() === 'win32') {
    const splitLibPath = moduleOptions.lib.split(path.sep);
    const splitLoaderPath = moduleOptions.loaderPath.split(path.sep);
    const splitHydratePath = moduleOptions.hydratePath.split(path.sep);

    moduleOptions.lib = path.posix.normalize(path.posix.join(...splitLibPath));
    moduleOptions.loaderPath = path.posix.normalize(path.posix.join(...splitLoaderPath));
    moduleOptions.hydratePath = path.posix.normalize(path.posix.join(...splitHydratePath));
  }

  // Add CSR plugin for Stencil
  this.addPlugin({
    src: path.resolve(__dirname, 'plugin.js'),
    fileName: 'stencil.js',
    options: moduleOptions,
  });

  const { renderToString } = require(moduleOptions.hydratePath);

  // @Hook: render:route
  this.nuxt.hook('render:route', async (url, page) => {
    const render = await renderStencil({
      renderToString,
      html: page.html,
      options: { url, ...moduleOptions.renderOptions },
    });

    page.html = render.html;
  });

  // @Hook: generate:page
  this.nuxt.hook('generate:page', async page => {
    const render = await renderStencil({
      renderToString,
      html: page.html,
      options: { url: page.path, ...moduleOptions.renderOptions },
    });

    page.html = render.html;
  });
}

module.exports = stencilModule;
module.exports.meta = require('../package.json');

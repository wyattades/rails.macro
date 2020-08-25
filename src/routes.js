import qs from 'qs';

const isPlainObject = (obj) =>
  obj !== null && typeof obj === 'object' && !Array.isArray(obj);

const isValidNamedParam = (value) =>
  value === true ||
  typeof value === 'number' ||
  (typeof value === 'string' && value.length !== 0);

/** @type {qs.IStringifyOptions} */
const stringifyOptions = {
  sort: (a, b) => a.localeCompare(b),
  arrayFormat: 'brackets',
};

const encodeQuery = (obj) =>
  qs.stringify(obj, { ...stringifyOptions, addQueryPrefix: true });

/** @type {qs.defaultEncoder} */
const doubleEncoder = (str, defaultEncoder, charset, type) =>
  defaultEncoder(
    defaultEncoder(str, defaultEncoder, charset, type),
    defaultEncoder,
    charset,
    type
  );

const encodeAnchor = (anchor) => {
  if (anchor == null || anchor === false) return '';

  return `#${
    typeof anchor === 'object'
      ? qs.stringify(anchor, stringifyOptions)
      : encodeURIComponent(anchor)
  }`;
};

const encodeParam = (param) => {
  // we don't encode Hash/Array named params
  if (typeof param === 'object') return '';

  return encodeURIComponent(param);
};

const encodeBlob = (blob) => {
  // remove surrounding slashes
  if (blob[0] === '/') blob = blob.substring(1);
  if (blob[blob.length - 1] === '/') blob = blob.substring(0, blob.length - 1);
  return blob;
};

const formatRoute = (parts, params, routeName = null) => {
  const newParts = [];

  const usedParams = new Set();
  for (const part of parts) {
    if (typeof part !== 'object') newParts.push(part);
    else if (Array.isArray(part)) {
      const [formattedPart, partUsedParams] = formatRoute(part, params);
      newParts.push(formattedPart);
      for (const p of partUsedParams) usedParams.add(p);
    } else {
      const value = params[part.name];
      // If we don't have all the required parts of this subpath, don't display any of it
      // e.g. don't display the subpath /:foo/bar/:buzz if either `foo` or `buzz` are missing
      if (!isValidNamedParam(value)) {
        if (routeName)
          throw new Error(
            `Missing required parameter '${part.name}' for route '${routeName}'`
          );
        else return ['', []];
      }

      usedParams.add(part.name);
      newParts.push(part.blob ? encodeBlob(value) : encodeParam(value));
    }
  }

  return [newParts.join(''), usedParams];
};

// Cache all the ASTs for the routes we use in this object
const routes = {};

let config = {};

export const registerRoutes = (nRoutes, nConfig) => {
  Object.assign(routes, nRoutes);
  if (nConfig) config = nConfig;
};

export const getPath = (name, params) => {
  let anchor, format;

  if (isPlainObject(params)) {
    // ignore `host`, and use `anchor` for url hash/anchor
    const { anchor: iAnchor, format: iFormat, host: _, ...newParams } = params;
    anchor = iAnchor;
    format = iFormat;
    params = newParams;
  } else if (isValidNamedParam(params)) {
    params = { id: params };
  } else {
    params = {};
  }

  const routeConfig = routes[name];
  if (!routeConfig) throw new Error(`Route not found: ${name}`);

  let pathname;
  // this route might be static aka a string
  if (typeof routeConfig === 'string') pathname = routeConfig;
  else {
    let usedParams;
    [pathname, usedParams] = formatRoute(routeConfig, params, name);
    for (const paramName of usedParams) delete params[paramName];
  }

  // leftover params are the query params
  return `${pathname}${
    typeof format === 'string' && format.length !== 0 ? `.${format}` : ''
  }${encodeQuery(params)}${encodeAnchor(anchor)}`;
};

export const getUrl = (name, params) => {
  const urlHost =
    (params && typeof params === 'object' && params.host) ||
    config.host ||
    (typeof window !== 'undefined' && window.location.origin);

  if (!urlHost)
    throw new Error(
      "Cannot determine url `host` from this method's params, `railsMacro` config, nor `window.location`"
    );

  return urlHost + getPath(name, params);
};

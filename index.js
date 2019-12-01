// Cache all the ASTs for the routes we use in this object
const routes = {};

// URL base (used in `.getUrl`)
let host;

const encodeQuery = obj => {
  const parts = [];
  let i = 0;
  for (const key in obj)
    parts.push(
      `${i++ === 0 ? '?' : '&'}${key}=${encodeURIComponent(obj[key])}`
    );
  return parts.join('');
};

const encodeBlob = blob => {
  if (blob[0] === '/') blob = blob.substring(1);
  if (blob[blob.length - 1] === '/') blob = blob.substring(0, blob.length - 1);
  return blob;
};

const formatRoute = (parts, params, routeName = null) => {
  const newParts = [];

  const usedParams = [];
  for (const part of parts) {
    if (typeof part !== 'object') newParts.push(part);
    else if (Array.isArray(part)) {
      const [formattedPart, partUsedParams] = formatRoute(part, params);
      newParts.push(formattedPart);
      usedParams.push(...partUsedParams);
    } else {
      const value = params[part.name];
      // If we don't have all the required parts of this subpath, don't display any of it
      // e.g. don't display the subpath /:foo/bar/:buzz if either `foo` or `buzz` are missing
      if (value == null || value === '') {
        if (routeName)
          throw new Error(
            `Missing required parameter '${part.name}' for route '${routeName}'`
          );
        else return ['', []];
      }

      usedParams.push(part.name);
      newParts.push(part.blob ? encodeBlob(value) : encodeURIComponent(value));
    }
  }

  return [newParts.join(''), usedParams];
};

exports.registerRoutes = (_routes, _host) => {
  Object.assign(routes, _routes);
  if (_host) host = _host;
};

exports.getPath = (name, params) => {
  if (params && typeof params !== 'object') params = { id: params };
  else params = { ...(params || {}) };

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

  const anchor = params.anchor != null ? `#${params.anchor}` : '';
  delete params.anchor;

  // leftover params are the query params
  return `${pathname}${encodeQuery(params)}${anchor}`;
};

exports.getUrl = (name, params) => {
  const urlHost =
    host || (typeof window !== 'undefined' && window.location.origin);

  if (!urlHost)
    throw new Error(
      'Cannot determine url host from config option `railsRoutesMacro.host` nor `window.location`'
    );

  return urlHost + exports.getPath(name, params);
};

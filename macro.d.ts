type RouteFnOptions =
  | ({
      anchor?: string | number;
      host?: string;
    } & Record<string, string | number | undefined | null>)
  | (string | number);

type RouteFn = (options?: RouteFnOptions) => string;

export const Routes: Record<string, RouteFn>;

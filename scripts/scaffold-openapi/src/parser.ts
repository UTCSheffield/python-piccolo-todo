/**
 * Parser for OpenAPI 3.1 schemas.
 * Fetches the schema from a URL and extracts endpoint metadata.
 */

export interface OpenAPISchema {
  endpoints: EndpointInfo[];
  title: string;
  description: string;
  version: string;
  apiUrl: string;
  components: Record<string, Record<string, unknown>>;
}

export interface EndpointInfo {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters: ParameterInfo[];
  requestBody?: RequestBodyInfo;
  responses: ResponseInfo;
  tags?: string[];
}

export interface ParameterInfo {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  schema: Record<string, unknown>;
  description?: string;
}

export interface RequestBodyInfo {
  required: boolean;
  content: Record<string, { schema: Record<string, unknown> }>;
}

export interface ResponseInfo {
  [statusCode: string]: {
    description: string;
    content?: Record<string, { schema: Record<string, unknown> }>;
  };
}

export async function parseOpenAPI(schemaUrl: string): Promise<OpenAPISchema> {
  const response = await fetch(schemaUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI schema: ${response.status} ${response.statusText}`);
  }

  const spec = (await response.json()) as Record<string, unknown>;

  if (!spec.openapi) {
    throw new Error('Invalid OpenAPI schema: missing "openapi" field');
  }

  const openApiVersion = spec.openapi as string;
  if (!openApiVersion.startsWith('3.1')) {
    console.warn(`⚠️  Schema version is ${openApiVersion}, this tool targets 3.1. Results may vary.`);
  }

  const endpoints: EndpointInfo[] = [];
  const paths = (spec.paths || {}) as Record<string, Record<string, unknown>>;
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    // Skip internal/docs paths
    if (pathKey.startsWith('/docs') || pathKey.startsWith('/redoc') || pathKey.startsWith('/openapi')) {
      continue;
    }

    for (const method of httpMethods) {
      if (!(method in pathItem)) continue;

      const operation = pathItem[method] as Record<string, unknown>;

      if (operation.deprecated === true) continue;

      const operationId =
        (operation.operationId as string) ||
        `${method}${pathKey.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const parameters: ParameterInfo[] = [];
      for (const param of (operation.parameters as unknown[]) || []) {
        const p = param as Record<string, unknown>;
        parameters.push({
          name: p.name as string,
          in: p.in as 'path' | 'query' | 'header',
          required: (p.required as boolean) || false,
          schema: (p.schema as Record<string, unknown>) || {},
          description: p.description as string | undefined,
        });
      }

      const rawBody = operation.requestBody as Record<string, unknown> | undefined;
      const requestBody: RequestBodyInfo | undefined = rawBody
        ? {
            required: (rawBody.required as boolean) || false,
            content: (rawBody.content as Record<string, { schema: Record<string, unknown> }>) || {},
          }
        : undefined;

      endpoints.push({
        path: pathKey,
        method: method.toUpperCase(),
        operationId,
        summary: operation.summary as string | undefined,
        description: operation.description as string | undefined,
        parameters,
        requestBody,
        responses: (operation.responses || {}) as ResponseInfo,
        tags: operation.tags as string[] | undefined,
      });
    }
  }

  const info = (spec.info || {}) as Record<string, unknown>;
  const servers = (spec.servers || []) as Record<string, unknown>[];
  const components = ((spec.components as Record<string, unknown>)?.schemas || {}) as Record<string, Record<string, unknown>>;

  return {
    endpoints,
    title: (info.title as string) || 'Generated App',
    description: (info.description as string) || '',
    version: (info.version as string) || '1.0.0',
    apiUrl: servers.length > 0 ? (servers[0].url as string) : '',
    components,
  };
}

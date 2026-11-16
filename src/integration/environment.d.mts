export const SERVER_ONLY_VARIABLES: readonly string[];
export interface IntegrationCapabilities { readonly identity?: boolean; readonly database?: boolean; readonly scheduler?: boolean; readonly ownerMetrics?: boolean; readonly allowLocalhost?: boolean; }
export interface EnvironmentIssue { readonly variable: string; readonly code: string; readonly message: string; }
export interface EnvironmentValidation { readonly valid: boolean; readonly mode: string; readonly capabilities: Readonly<{ identity: boolean; database: boolean; scheduler: boolean; ownerMetrics: boolean }>; readonly issues: readonly EnvironmentIssue[]; }
export function findClientSecretVariables(environment?: Readonly<Record<string, string | undefined>>): string[];
export function validateIntegrationEnvironment(environment?: Readonly<Record<string, string | undefined>>, options?: IntegrationCapabilities): EnvironmentValidation;

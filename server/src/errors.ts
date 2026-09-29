// Formatul comun al erorilor API (docs/faza4/FAZA_4_B2_API.md §1):
// { "error": { "code": "<COD>", "message": "<text RO>", "fields"?: {...} } }

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
    /** ID-ul de corelare, numai la 500 / 503. */
    correlationId?: string;
  };
};

export function apiError(
  code: string,
  message: string,
  extra: { fields?: Record<string, string>; correlationId?: string } = {},
): ApiErrorBody {
  return { error: { code, message, ...extra } };
}

export const checkId = 'start-script';
export const name = 'Start Script Present';
export const appliesTo = ['all'];

export async function check(context) {
  const { packageJson, repoType } = context;

  try {
    // Empty repos
    if (repoType === 'empty') {
      return { checkId, status: 'not-applicable', confidence: 'high', message: 'Empty repo \u2014 no start script needed', findings: [] };
    }

    // No package.json
    if (!packageJson) {
      return { checkId, status: 'check-it', confidence: 'low', message: 'No package.json found', findings: [] };
    }

    let scripts = packageJson.scripts;
    // Guard against malformed scripts field (string, array, null, etc.)
    if (typeof scripts !== 'object' || scripts === null || Array.isArray(scripts)) {
      scripts = {};
    }

    // Use 'in' operator to detect PRESENCE of key, not truthiness of value.
    // This catches empty strings "" and null values that are placeholders.
    const hasStart = 'start' in scripts;
    const hasServe = 'serve' in scripts;
    const hasStartProd = 'start:prod' in scripts;

    // UI library
    if (repoType === 'library') {
      if (hasStart || hasServe) {
        return { checkId, status: 'pass', confidence: 'high', message: `Library has start/serve script`, findings: [] };
      }
      return { checkId, status: 'not-applicable', confidence: 'high', message: 'UI library \u2014 start script not required', findings: [] };
    }

    // Get the actual script value from the first present key.
    // We use a list to avoid || short-circuiting past falsy values like "" or null.
    const entries = [
      ['start', scripts.start],
      ['serve', scripts.serve],
      ['start:prod', scripts['start:prod']]
    ];
    const found = entries.find(([key]) => key === 'start' ? hasStart : key === 'serve' ? hasServe : hasStartProd);

    if (found) {
      const scriptValue = found[1];

      // Non-string values (boolean, number) are malformed \u2014 treat as placeholder
      if (typeof scriptValue !== 'string') {
        return {
          checkId,
          status: 'check-it',
          confidence: 'medium',
          message: `Start script is not a string (got ${typeof scriptValue})`,
          findings: [{ file: 'package.json', issue: `Start script has invalid type: ${typeof scriptValue}` }]
        };
      }

      const trimmed = scriptValue.trim();

      // Empty, null, or whitespace-only = placeholder
      if (trimmed.length === 0) {
        return {
          checkId,
          status: 'check-it',
          confidence: 'medium',
          message: `Start script is empty or whitespace`,
          findings: [{ file: 'package.json', issue: 'Start script appears to be a placeholder (empty value)' }]
        };
      }

      // Short command or contains TODO (case-insensitive) = placeholder
      const hasTodo = /todo/i.test(trimmed);
      if (trimmed.length <= 3 || hasTodo) {
        return {
          checkId,
          status: 'check-it',
          confidence: 'medium',
          message: `Start script may be placeholder: "${trimmed}"`,
          findings: [{ file: 'package.json', issue: 'Start script appears to be a placeholder' }]
        };
      }

      // Valid command
      return { checkId, status: 'pass', confidence: 'high', message: `Start script found: "${trimmed}"`, findings: [] };
    }

    // No start/serve/start:prod script found at all
    return {
      checkId,
      status: 'fail',
      confidence: 'high',
      message: 'No start script found in package.json',
      findings: [{ file: 'package.json', issue: 'Missing "start" script \u2014 required for deployment' }]
    };

  } catch (err) {
    return { checkId, status: 'check-it', confidence: 'low', message: `Error: ${err.message}`, findings: [] };
  }
}

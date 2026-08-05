// Outils de parsing des réponses JSON des LLM, indépendants du transport.

export function parseJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error('LLM response was not valid JSON.');
  }
}

/**
 * Extrait la valeur (potentiellement partielle) du champ `reply` d'un JSON en
 * cours de génération, en décodant les échappements. Renvoie `null` tant que
 * le champ n'a pas commencé. Robuste aux fins de chaîne incomplètes.
 */
export function extractReplyValue(raw: string): string | null {
  const keyIndex = raw.indexOf('"reply"');

  if (keyIndex < 0) {
    return null;
  }

  let i = keyIndex + '"reply"'.length;

  while (i < raw.length && raw[i] !== ':') {
    i += 1;
  }
  if (i >= raw.length) {
    return null;
  }
  i += 1;

  while (i < raw.length && /\s/.test(raw[i] ?? '')) {
    i += 1;
  }
  if (raw[i] !== '"') {
    return null;
  }
  i += 1;

  let result = '';

  while (i < raw.length) {
    const char = raw[i];

    if (char === undefined) {
      break;
    }

    if (char === '\\') {
      const next = raw[i + 1];

      if (next === undefined) {
        break; // échappement incomplet en fin de flux
      }

      switch (next) {
        case 'n':
          result += '\n';
          break;
        case 't':
          result += '\t';
          break;
        case 'r':
          result += '\r';
          break;
        case 'b':
          result += '\b';
          break;
        case 'f':
          result += '\f';
          break;
        case '"':
          result += '"';
          break;
        case '\\':
          result += '\\';
          break;
        case '/':
          result += '/';
          break;
        case 'u': {
          const hex = raw.slice(i + 2, i + 6);

          if (hex.length < 4) {
            return result; // séquence unicode incomplète
          }

          const code = Number.parseInt(hex, 16);

          if (Number.isNaN(code)) {
            return result;
          }

          result += String.fromCharCode(code);
          i += 6;
          continue;
        }
        default:
          result += next;
      }

      i += 2;
      continue;
    }

    if (char === '"') {
      return result; // guillemet fermant de la valeur
    }

    result += char;
    i += 1;
  }

  return result;
}

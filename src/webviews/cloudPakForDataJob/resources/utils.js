const JOB_NAME_MAX_LENGTH = 100;
const JOB_DESCRIPTION_MAX_LENGTH = 300;
const STREAMS_JOB_NAME_MAX_LENGTH = 1024;
const STREAMS_JOB_NAME_REGEX = new RegExp(
  /[\^!#$%&'*+,/;<>=?@[\]`{|}~()\s\u0000-\u0019\u007F-\u009F\ud800-\uF8FF\uFFF0-\uFFFF]/
);

const buildJobNameRegex = () => {
  const zh = '\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF';
  const ja = '\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF';

  const ru = '\u0400-\u04FF\u0500-\u052F';
  const eu = '\u00C0-\u00F6\u00F8-\u017E';

  return new RegExp(`[^\\w\\s-${zh}${ja}${ru}${eu}]`, 'gi');
};

const validateJobName = (name) => {
  // Exceeds maximum length
  if (name.length > JOB_NAME_MAX_LENGTH) {
    return `The name must not exceed ${JOB_NAME_MAX_LENGTH} characters.`;
  }

  // Contains invalid characters
  if (buildJobNameRegex().test(name)) {
    return `The name can only contain alphanumeric, underscore, hyphen, and whitespace characters.`;
  }

  return false;
};

const validateJobDescription = (name) => {
  // Exceeds maximum length
  if (name.length > JOB_DESCRIPTION_MAX_LENGTH) {
    return `The description must not exceed ${JOB_DESCRIPTION_MAX_LENGTH} characters.`;
  }

  return false;
};

const validateStreamsJobName = (name) => {
  // Exceeds maximum length
  if (name.length > STREAMS_JOB_NAME_MAX_LENGTH) {
    return `The name must not exceed ${STREAMS_JOB_NAME_MAX_LENGTH} characters.`;
  }

  // Contains invalid characters
  if (STREAMS_JOB_NAME_REGEX.test(name)) {
    return `The name must contain alphanumeric characters. You cannot use the following
      characters: ^!#$%&'*+,/;<>=?@[]\`{|}~(). You also cannot use the following Unicode
      and hexadecimal characters: u0000; u0001-u001F; u007F-u009F; ud800-uF8FF; uFFF0-uFFFF; x{10000}-x{10FFFF}.`;
  }

  return false;
};

const processSubmissionTimeParams = (params) => {
  const sortedParams = params.sort((firstParam, secondParam) => {
    const { compositeName: firstCompositeName, name: firstName } = firstParam;
    const {
      compositeName: secondCompositeName,
      name: secondName
    } = secondParam;

    if (firstCompositeName === secondCompositeName) {
      return firstName.localeCompare(secondName);
    }
    return firstCompositeName.localeCompare(secondCompositeName);
  });
  const submissionTimeParams = [];
  sortedParams.forEach((param) => {
    const strippedDefaultValue = param.defaultValue
      ? param.defaultValue
          // Remove surrounding quotes/square brackets
          .replace(/^"|"$|^\[|\]$/g, '')
          // Unescape escape sequences
          .replace(/\\f/g, '\f') // form feed
          .replace(/\\n/g, '\n') // new line
          .replace(/\\r/g, '\r') // carriage return
          .replace(/\\t/g, '\t') // horizontal tab
          .replace(/\\v/g, '\v') // vertical tab
          .replace(/\\'/g, "'") // single quote
          .replace(/\\"/g, '"') // double quote
          .replace(/\\/g, '\\') // backslash
      : '';
    submissionTimeParams.push({
      name: `${param.compositeName}.${param.name}`,
      value: strippedDefaultValue
    });
  });
  return submissionTimeParams;
};

const initializeSubmissionParamsForSubmit = (submissionTimeValues) => {
  if (Array.isArray(submissionTimeValues)) {
    return submissionTimeValues.map((submissionTimeValue) => {
      const { compositeName, defaultValue, name } = submissionTimeValue;
      const strippedDefaultValue = defaultValue
        ? defaultValue.replace(/^"|"$|^\[|\]$/g, '')
        : '';
      return {
        ...submissionTimeValue,
        fqn: `${compositeName}.${name}`,
        defaultValue: strippedDefaultValue,
        value: strippedDefaultValue
      };
    });
  }
  return [];
};

const Utils = {
  validateJobName,
  validateJobDescription,
  validateStreamsJobName,
  processSubmissionTimeParams,
  initializeSubmissionParamsForSubmit
};

export default Utils;

import * as fs from 'fs';

const SPL_MSG_REGEX = /^(?:[0-9][\w-:.]+\s*)?([\w.]+(?:\/[\w.]+)?):(\d+):(\d+):\s+(\w{5}\d{4}[IWE])\s+((ERROR|WARN|INFO):.*)$/;

const SPL_NAMESPACE_REGEX = /^\s*(?:\bnamespace\b)\s+([a-z|A-Z|0-9|.|_]+)\s*;/gm;

const SPL_MAIN_COMPOSITE_REGEX = /.*?(?:\bcomposite\b)(?:\s*|\/\/.*?|\/\*.*?\*\/)+([a-z|A-Z|0-9|.|_]+)(?:\s*|\/\/.*?|\/\*.*?\*\/)*\{/gm;

const BUILD_ACTION = { DOWNLOAD: 0, SUBMIT: 1 };

function getFqnMainComposites(selectedFilePath) {
  let fileContents = '';
  if (selectedFilePath) {
    fileContents = fs.readFileSync(selectedFilePath, 'utf-8');
  }

  // Parse selected SPL file to find namespace and main composites
  const namespaces = [];
  let m = '';
  while ((m = SPL_NAMESPACE_REGEX.exec(fileContents)) !== null) { namespaces.push(m[1]); }
  const mainComposites = [];
  while ((m = SPL_MAIN_COMPOSITE_REGEX.exec(fileContents)) !== null) { mainComposites.push(m[1]); }

  let namespace = '';
  let fqn = '';
  if (namespaces && namespaces.length > 0) {
    fqn = `${namespaces[0]}::`;
    this.namespace = namespaces[0];
    namespace = namespaces[0];
  }
  if (mainComposites.length === 1) {
    fqn = `${fqn}${mainComposites[0]}`;
  }
  return { fqn, namespace, mainComposites };
}

/**
 * read VCAP_SERVICES env variable, process the file it refers to.
 * Expects VCAP JSON format,
 * eg: {"streaming-analytics":[{"name":"service-1","credentials":{apikey:...,v2_rest_url:...}}]}
 */
function parseV4ServiceCredentials(streamingAnalyticsCredentials) {
  const vcapServicesPath = process.env.VCAP_SERVICES;
  if (streamingAnalyticsCredentials && typeof (streamingAnalyticsCredentials) === 'string') {
    const serviceCreds = JSON.parse(streamingAnalyticsCredentials);
    if (serviceCreds && serviceCreds.apikey && serviceCreds.v2_rest_url) {
      return serviceCreds;
    }
  } else if (vcapServicesPath && typeof (vcapServicesPath) === 'string') {
    try {
      if (fs.existsSync(vcapServicesPath)) {
        const vcapServices = JSON.parse(fs.readFileSync(vcapServicesPath, 'utf8'));
        if (vcapServices.apikey && vcapServices.v2_rest_url) {
          return { apikey: vcapServices.apikey, v2_rest_url: vcapServices.v2_rest_url };
        }
        const streamingAnalytics = vcapServices['streaming-analytics'];
        if (streamingAnalytics && streamingAnalytics[0]) {
          const { credentials } = streamingAnalytics[0];
          if (credentials) {
            return { apikey: credentials.apikey, v2_rest_url: credentials.v2_rest_url };
          }
          console.log('Credentials not found in streaming-analytics service in VCAP');
        } else {
          console.log('streaming-analytics service not found in VCAP');
        }
      } else {
        console.log(`The VCAP file does not exist: ${vcapServicesPath}`);
      }
    } catch (error) {
      console.log(`Error processing VCAP file: ${vcapServicesPath}`, error);
    }
  }
  return {};
}

const StreamsUtils = {
  SPL_MAIN_COMPOSITE_REGEX,
  SPL_MSG_REGEX,
  SPL_NAMESPACE_REGEX,
  BUILD_ACTION,
  parseV4ServiceCredentials,
  getFqnMainComposites
};

export default StreamsUtils;

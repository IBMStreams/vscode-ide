import SwaggerParser from '@apidevtools/swagger-parser';

const parse = async (jsonApi, apiEndpointPath) => {
  try {
    const parser = new SwaggerParser();
    const api = await parser.dereference(jsonApi);
    let pathObj = api.paths[apiEndpointPath];
    pathObj = pathObj[Object.keys(pathObj)[0]];
    return pathObj;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to parse JSON API!');
  }
};

const ParseUtils = {
  parse
};

export default ParseUtils;

import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import {
  ROW_HEADER_ID,
  ROW_HEADER_ID_RENAMED,
  ROW_HEADER_STATUS,
  ROW_ID_PREFIX,
  STATUS
} from '.';

/**
 * Transform items
 * @param oldItems the items to transform
 * @param transformFunc the transform function
 */
const transform = (oldItems, transformFunc) => {
  let newItems = [...oldItems];
  if (newItems.length) {
    newItems = newItems.map((newItem) => transformFunc(newItem));
  }
  return newItems;
};

/**
 * Transform data items to table rows
 * @param data the data
 */
const transformData = (data) => {
  const transformFunc = (item) => {
    let tableRow = {};
    Object.keys(item).forEach((key) => {
      if (key === ROW_HEADER_ID) {
        // If the data has an id property, rename it so that it does not
        // clash with the DataTable's unique id
        tableRow = {
          ...tableRow,
          [ROW_HEADER_ID_RENAMED]: item[ROW_HEADER_ID]
        };
      } else {
        // Add all other keys to the row
        tableRow = { ...tableRow, [key]: item[key] };
      }
      // Assign each table row a unique id and initialize status
      tableRow = {
        [ROW_HEADER_ID]: `${ROW_ID_PREFIX}-${uuidv4()}`,
        [ROW_HEADER_STATUS]: { status: STATUS.NONE, detail: null },
        ...tableRow
      };
    });
    return tableRow;
  };
  return transform(data, transformFunc);
};

/**
 * Transform table rows to data items
 * @param tableRows the table rows
 */
const transformTableRows = (tableRows) => {
  const transformFunc = (item) => {
    let data = {};
    Object.keys(item).forEach((key) => {
      if (key === ROW_HEADER_ID_RENAMED) {
        // If the row has a renamed id property, rename it back to id
        data = { ...data, [ROW_HEADER_ID]: item[ROW_HEADER_ID_RENAMED] };
      } else if (key === ROW_HEADER_ID) {
        // Do nothing (do not copy the unique id property since is is used for table purposes only)
      } else {
        // Add all other keys to the data item
        data = { ...data, [key]: item[key] };
      }
    });
    return data;
  };
  return transform(tableRows, transformFunc);
};

/**
 * Remove status information from data
 * @param data the data
 */
const removeStatusInfo = (data) => {
  const newData = [...data];
  newData.forEach((item) => {
    // eslint-disable-next-line no-param-reassign
    delete item[ROW_HEADER_STATUS];
  });
  return newData;
};

/**
 * Transform JSON data to data
 * @param fileContents the file contents
 */
const transformDataFromJson = (fileContents) => {
  const result = { data: null, error: null };
  try {
    result.data = JSON.parse(fileContents);
  } catch (err) {
    let parseError = '';
    if (err && err.message) {
      const trimmedMessage = err.message.trim();
      parseError = ` ${trimmedMessage}${
        !trimmedMessage.endsWith('.') ? '.' : ''
      }`;
    }
    result.error = `The file is not a valid JSON file.${parseError}`;
  }
  return result;
};

/**
 * Transform data to JSON format
 * @param data the data
 */
const transformDataToJson = (data) =>
  JSON.stringify(removeStatusInfo(data), null, 2);

/**
 * Transform CSV data to data
 * @param fileContents the file contents
 */
const transformDataFromCsv = (fileContents) => {
  // TODO: assume file has headers and no quotes around values. need to handle case without headers? with quotes?
  // Remove byte order mark
  let csvStr = fileContents;
  if (csvStr.charCodeAt(0) === 0xfeff) {
    csvStr = fileContents.slice(1);
  }
  const { data, errors } = Papa.parse(csvStr, {
    comments: '#',
    dynamicTyping: true,
    header: true,
    skipEmptyLines: true
  });
  const result = {
    data: errors.length ? null : data,
    error: null
  };
  if (errors.length) {
    const trimmedMessage = errors[0].message.trim();
    const parseError = ` ${trimmedMessage}${
      !trimmedMessage.endsWith('.') ? '.' : ''
    }`;
    result.error = `The file is not a valid CSV file.${parseError}`;
  }
  return result;
};

/**
 * Transform data to CSV format
 * @param data the data
 */
const transformDataToCsv = (data) => Papa.unparse(removeStatusInfo(data));

const DataUtils = {
  transformData,
  transformTableRows,
  transformDataFromJson,
  transformDataToJson,
  transformDataFromCsv,
  transformDataToCsv
};

export default DataUtils;

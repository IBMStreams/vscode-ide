import {
  Add16,
  NotSent16,
  Save16,
  Send16,
  SendAlt16,
  TrashCan16
} from '@carbon/icons-react';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Dropdown,
  ListItem,
  Loading,
  Modal,
  Table,
  TableBatchAction,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectAll,
  TableSelectRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  TextInput,
  Tooltip,
  UnorderedList
} from 'carbon-components-react';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import noDataForTable from '../../images/noDataForTable.svg';
import noSearchResultsForTable from '../../images/noSearchResultsForTable.svg';
import {
  ACTION,
  DataUtils,
  ROW_HEADER_ID,
  ROW_HEADER_ID_ADD_NEW,
  ROW_HEADER_ID_RENAMED,
  ROW_HEADER_STATUS,
  ROW_ID_PREFIX,
  STATUS
} from '../../utils';
import { useApp } from '../App/context';
import { DefaultModalProps, ModalType, StatusModal } from '../StatusModal';
import OverflowTooltip from './OverflowTooltip';

const TupleTable = ({ receiveData, sendData, action, schema }) => {
  const { data, isLoading, setData, setIsLoading } = useApp();

  const [tableRows, setTableRows] = useState(DataUtils.transformData(data));
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRowValues, setNewRowValues] = useState({});
  const [
    isShowingDeleteConfirmationModal,
    setIsShowingDeleteConfirmationModal
  ] = useState(false);
  const [isSendingData, setIsSendingData] = useState(false);
  const [rowsSelected, setRowsSelected] = useState(null);
  const [isFiltered, setIsFiltered] = useState(false);
  const [modalProps, setModalProps] = useState(DefaultModalProps);
  const [inputValueError, setInputValueError] = useState(false);

  // Retrieve data on load
  useEffect(() => {
    async function init() {
      if (action === ACTION.RECEIVE) {
        const { data: responseData, error } = await receiveData();
        if (error) {
          setModalProps({
            isShowing: true,
            type: ModalType.Error,
            title: `Error retrieving the data`,
            description: error
          });
        } else {
          // Sort newest to oldest if retrieving data
          setData(
            action === ACTION.RECEIVE ? responseData.reverse() : responseData
          );
        }
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // When data changes (i.e., data is imported), update table rows
  useEffect(() => {
    setTableRows(DataUtils.transformData(data));
  }, [data]);

  const statusHeader =
    action === ACTION.SEND
      ? [{ key: ROW_HEADER_STATUS, header: 'Status', attr: null }]
      : [];
  const schemaHeaders = Object.keys(schema).map((key) => ({
    key: key === ROW_HEADER_ID ? ROW_HEADER_ID_RENAMED : key,
    header: key,
    attr: schema[key]
  }));
  const tableHeaders = [...statusHeader, ...schemaHeaders];

  const handleAdd = () => {
    if (isAddingNew) {
      const newTableRows = [...tableRows];
      newTableRows.shift();
      const newTableRow = {
        [ROW_HEADER_ID]: `${ROW_ID_PREFIX}-${uuidv4()}`,
        ...newRowValues
      };
      newTableRows.unshift(newTableRow);
      setTableRows(newTableRows);
      setData(DataUtils.transformTableRows(newTableRows));
      setIsAddingNew(false);
      setNewRowValues({});
    } else {
      const emptyRow = {};
      const emptyRowValues = {};
      tableHeaders.forEach(({ key, attr }) => {
        if (key === ROW_HEADER_STATUS) {
          emptyRow[key] = ROW_HEADER_STATUS;
          emptyRowValues[key] = { status: STATUS.NONE, detail: null };
        } else {
          emptyRow[key] = attr.enum ? attr.enum[0] : '';
          emptyRowValues[key] = attr.enum ? attr.enum[0] : null;
        }
      });
      emptyRow[ROW_HEADER_ID] = ROW_HEADER_ID_ADD_NEW;
      setTableRows([emptyRow, ...tableRows]);
      setIsAddingNew(true);
      setNewRowValues(emptyRowValues);
    }
  };

  const handleAddNewInputChange = (value, id) => {
    const newValues = { ...newRowValues };
    const schemaKey = id === ROW_HEADER_ID_RENAMED ? ROW_HEADER_ID : id;
    const schemaAttr = schema[schemaKey];
    let realValue = value.trim() === '' ? null : value;
    if (schemaAttr.type === 'boolean') {
      realValue = value === 'true';
    } else if (
      schemaAttr.type === 'object' ||
      schemaAttr.type === 'array' ||
      (schemaAttr.type === undefined && schemaAttr.properties)
    ) {
      // Object or array type
      try {
        realValue = JSON.parse(value);
        setInputValueError(false);
      } catch (err) {
        const jsonError = err && err.message ? ` ${err.message.trim()}` : '';
        setInputValueError({ id, error: jsonError });
      }
    } else if (schemaAttr?.description?.startsWith('SPL type: optional')) {
      realValue = value === 'null' || value.trim() === '' ? null : value;
    }
    newValues[id] = realValue;
    setNewRowValues(newValues);
  };

  const handleDeleteConfirmation = (selectedRows, hideBatchActions) => {
    setIsShowingDeleteConfirmationModal(true);
    setRowsSelected(selectedRows);
    hideBatchActions();
  };

  const handleDelete = () => {
    setIsShowingDeleteConfirmationModal(false);
    const rowIdsToDelete = rowsSelected.reduce((rows, row) => {
      if (row.id !== ROW_HEADER_ID_ADD_NEW) {
        rows.push(row.id);
      }
      return rows;
    }, []);
    const tableRowsToKeep = tableRows.filter(
      (tableRow) => !rowIdsToDelete.includes(tableRow.id)
    );
    setTableRows(tableRowsToKeep);
    setData(DataUtils.transformTableRows(tableRowsToKeep));
  };

  const handleSendAll = async () => {
    const dataToSend = { items: data };
    setIsSendingData(true);
    const { error } = await sendData(dataToSend);
    setIsSendingData(false);
    let status;
    const detail = { timestamp: new Date() };
    if (error) {
      status = STATUS.FAILED;
      detail.error = error;
      setModalProps({
        isShowing: true,
        type: ModalType.Error,
        title: `Error sending the data`,
        description: error
      });
    } else {
      status = STATUS.SENT;
      setModalProps({
        isShowing: true,
        type: ModalType.Success,
        title: `Successfully sent the data`,
        description: null
      });
    }

    // Update rows with status
    const newTableRows = [...tableRows];
    newTableRows.forEach((row) => {
      // eslint-disable-next-line no-param-reassign
      row[ROW_HEADER_STATUS] = { status, detail };
    });
    setTableRows(newTableRows);
    setData(DataUtils.transformTableRows(newTableRows));
  };

  const handleSend = async (selectedRows, hideBatchActions) => {
    const rowsToSend = selectedRows.reduce((rows, row) => {
      if (row.id !== ROW_HEADER_ID_ADD_NEW) {
        rows.push(tableRows.find((tableRow) => tableRow.id === row.id));
      }
      return rows;
    }, []);
    const dataToSend = {
      items: DataUtils.transformTableRows(rowsToSend)
    };
    const { error } = await sendData(dataToSend);
    let status;
    const detail = { timestamp: new Date() };
    if (error) {
      status = STATUS.FAILED;
      detail.error = error;
      setModalProps({
        isShowing: true,
        type: ModalType.Error,
        title: `Error sending the data`,
        description: error
      });
    } else {
      status = STATUS.SENT;
      setModalProps({
        isShowing: true,
        type: ModalType.Success,
        title: `Successfully sent the data`,
        description: null
      });
    }
    hideBatchActions();

    // Update rows with status
    const newTableRows = [...tableRows];
    selectedRows.forEach((row) => {
      const matchingTableRowIndex = tableRows.findIndex(
        (tableRow) => tableRow.id === row.id
      );
      newTableRows[matchingTableRowIndex][ROW_HEADER_STATUS] = {
        status,
        detail
      };
    });
    setTableRows(newTableRows);
    setData(DataUtils.transformTableRows(newTableRows));
  };

  const getSchemaInfo = (key) => {
    const schemaKey = key === ROW_HEADER_ID_RENAMED ? ROW_HEADER_ID : key;
    const info = Object.keys(schema[schemaKey]).map((prop) => {
      let propValue = schema[schemaKey][prop];
      let isJson = false;
      if (
        Array.isArray(propValue) ||
        Object.prototype.toString.call(propValue) === '[object Object]'
      ) {
        propValue = JSON.stringify(propValue, null, 2);
        isJson = true;
      }
      return (
        <ListItem key={prop}>
          <strong>{prop}</strong>: {isJson ? <pre>{propValue}</pre> : propValue}
        </ListItem>
      );
    });
    return info;
  };

  const numRows = isAddingNew ? tableRows.length - 1 : tableRows.length;

  return (
    <>
      <Loading active={isSendingData} description="Sending data..." />
      <StatusModal
        isShowingModal={modalProps.isShowing}
        onClose={() => setModalProps(DefaultModalProps)}
        type={modalProps.type}
        title={modalProps.title}
        description={modalProps.description}
      />
      <div className="table-container">
        <Modal
          danger
          modalHeading="Are you sure you want to delete the selected rows?"
          onRequestClose={() => setIsShowingDeleteConfirmationModal(false)}
          onRequestSubmit={() => handleDelete()}
          open={isShowingDeleteConfirmationModal}
          primaryButtonText="Delete"
          secondaryButtonText="Cancel"
          size="sm"
        />
        {isLoading ? (
          <DataTableSkeleton rowCount={10} showHeader={false} />
        ) : (
          <DataTable
            rows={tableRows}
            headers={tableHeaders}
            stickyHeader
            isSortable
          >
            {({
              rows,
              headers,
              getHeaderProps,
              getRowProps,
              getSelectionProps,
              getToolbarProps,
              getBatchActionProps,
              onInputChange,
              selectedRows,
              getTableProps,
              getTableContainerProps
            }) => (
              <TableContainer className="table" {...getTableContainerProps()}>
                <TableToolbar {...getToolbarProps()}>
                  <TableBatchActions
                    {...getBatchActionProps()}
                    totalSelected={
                      isAddingNew
                        ? getBatchActionProps().totalSelected - 1
                        : getBatchActionProps().totalSelected
                    }
                  >
                    <TableBatchAction
                      // prettier-ignore
                      onClick={() =>
                    handleDeleteConfirmation(selectedRows, getBatchActionProps().onCancel)}
                      renderIcon={TrashCan16}
                      tabIndex={
                        getBatchActionProps().shouldShowBatchActions ? 0 : -1
                      }
                    >
                      Delete
                    </TableBatchAction>
                    <Button
                      disabled={
                        rows.length === 0 ||
                        (rows.length === 1 ? isAddingNew : false)
                      }
                      iconDescription="Send"
                      kind="primary"
                      onClick={() =>
                        handleSend(selectedRows, getBatchActionProps().onCancel)
                      }
                      renderIcon={Send16}
                      size="small"
                      tabIndex={
                        getBatchActionProps().shouldShowBatchActions ? -1 : 0
                      }
                    >
                      Send
                    </Button>
                  </TableBatchActions>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      onChange={(e) => {
                        setIsFiltered(e.target.value !== '');
                        onInputChange(e);
                      }}
                      tabIndex={
                        getBatchActionProps().shouldShowBatchActions ? -1 : 0
                      }
                    />
                    {action === ACTION.SEND && isAddingNew && (
                      <Button
                        kind="ghost"
                        onClick={() => {
                          const newTableRows = [...tableRows];
                          newTableRows.shift();
                          setTableRows(newTableRows);
                          setIsAddingNew(false);
                          setNewRowValues({});
                          getBatchActionProps().onCancel();
                        }}
                        size="small"
                        tabIndex={
                          getBatchActionProps().shouldShowBatchActions ? -1 : 0
                        }
                      >
                        Cancel
                      </Button>
                    )}
                    {action === ACTION.SEND && (
                      <>
                        <Button
                          disabled={
                            isAddingNew &&
                            (!!inputValueError ||
                              Object.keys(newRowValues).some((key) => {
                                const schemaKey =
                                  key === ROW_HEADER_ID_RENAMED
                                    ? ROW_HEADER_ID
                                    : key;
                                const isOptionalType = schema[
                                  schemaKey
                                ]?.description?.startsWith(
                                  'SPL type: optional'
                                );
                                if (key !== ROW_HEADER_STATUS) {
                                  if (isOptionalType) {
                                    return false;
                                  }
                                  if (newRowValues[key] === null) {
                                    return true;
                                  }
                                }
                                return false;
                              }))
                          }
                          iconDescription={isAddingNew ? 'Save' : 'Add'}
                          kind="secondary"
                          onClick={handleAdd}
                          renderIcon={isAddingNew ? Save16 : Add16}
                          size="small"
                          tabIndex={
                            getBatchActionProps().shouldShowBatchActions
                              ? -1
                              : 0
                          }
                        >
                          {isAddingNew ? 'Save' : 'Add'}
                        </Button>
                        <Button
                          disabled={
                            rows.length === 0 ||
                            (rows.length === 1 ? isAddingNew : false) ||
                            isAddingNew
                          }
                          iconDescription="Send all"
                          kind="primary"
                          onClick={handleSendAll}
                          renderIcon={Send16}
                          size="small"
                          tabIndex={
                            getBatchActionProps().shouldShowBatchActions
                              ? -1
                              : 0
                          }
                        >
                          Send all
                        </Button>
                      </>
                    )}
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {/* eslint-disable-next-line no-nested-ternary */}
                      {action === ACTION.SEND ? (
                        rows.length &&
                        (rows.length === 1 ? !isAddingNew : true) ? (
                          <TableSelectAll {...getSelectionProps()} />
                        ) : (
                          <th className="table-container__select-placeholder">
                            <div />
                          </th>
                        )
                      ) : null}
                      {headers.map((header, index) => {
                        let tooltipDirection;
                        if (
                          (action === ACTION.RECEIVE && index === 0) ||
                          (action === ACTION.SEND && index === 1)
                        ) {
                          tooltipDirection = 'right';
                        } else if (index === headers.length - 1) {
                          tooltipDirection = 'left';
                        } else {
                          tooltipDirection = 'top';
                        }
                        return (
                          <TableHeader
                            key={header.key}
                            className={
                              header.key === ROW_HEADER_STATUS
                                ? 'table-container__status'
                                : null
                            }
                            {...getHeaderProps({ header })}
                          >
                            {header.key !== ROW_HEADER_STATUS ? (
                              <Tooltip
                                className="table-container__schema-tooltip"
                                direction={tooltipDirection}
                                showIcon={false}
                                triggerClassName="table-container__schema-tooltip-trigger"
                                triggerText={header.header}
                              >
                                <UnorderedList>
                                  {getSchemaInfo(header.key)}
                                </UnorderedList>
                              </Tooltip>
                            ) : (
                              header.header
                            )}
                          </TableHeader>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody className="table-container__table-body">
                    {rows.length ? (
                      rows.map((row, i) => {
                        let firstCellComponent = null;
                        if (action === ACTION.SEND) {
                          firstCellComponent =
                            row.id === ROW_HEADER_ID_ADD_NEW ? (
                              <td className="table-container__select-placeholder">
                                <div />
                              </td>
                            ) : (
                              <TableSelectRow {...getSelectionProps({ row })} />
                            );
                        }
                        return (
                          // eslint-disable-next-line react/no-array-index-key
                          <TableRow key={i} {...getRowProps({ row })}>
                            {firstCellComponent}
                            {row.cells.map((cell) => {
                              const {
                                id,
                                info: { header },
                                value
                              } = cell;
                              if (header === ROW_HEADER_STATUS) {
                                let statusTooltip = null;
                                const { status, detail } = value;
                                if (status === STATUS.FAILED) {
                                  statusTooltip = (
                                    <Tooltip
                                      align="end"
                                      className="table-container__status-tooltip"
                                      direction="right"
                                      iconDescription="Failed to send"
                                      renderIcon={NotSent16}
                                      showIcon
                                      triggerClassName="table-container__status-icon"
                                    >
                                      <strong>Time</strong>
                                      {`: ${detail.timestamp.toLocaleString()}`}
                                      <br />
                                      <strong>Error</strong>
                                      {`: ${detail.error}`}
                                    </Tooltip>
                                  );
                                } else if (status === STATUS.SENT) {
                                  statusTooltip = (
                                    <Tooltip
                                      align="end"
                                      className="table-container__status-tooltip"
                                      direction="right"
                                      iconDescription="Sent"
                                      renderIcon={SendAlt16}
                                      showIcon
                                      triggerClassName="table-container__status-icon"
                                    >
                                      <strong>Time</strong>
                                      {`: ${detail.timestamp.toLocaleString()}`}
                                    </Tooltip>
                                  );
                                }
                                return (
                                  <TableCell
                                    className="table-container__status"
                                    key={id}
                                  >
                                    {statusTooltip}
                                  </TableCell>
                                );
                              }
                              const cellSchema =
                                header === ROW_HEADER_ID_RENAMED
                                  ? schema[ROW_HEADER_ID]
                                  : schema[header];
                              let dropdownItems = null;
                              if (cellSchema.enum) {
                                dropdownItems = cellSchema.enum.map(
                                  (enumValue) => ({
                                    label: enumValue
                                  })
                                );
                              } else if (cellSchema.type === 'boolean') {
                                dropdownItems = ['true', 'false'].map(
                                  (bool) => ({
                                    label: bool
                                  })
                                );
                              }
                              const addNewComponent = dropdownItems ? (
                                <Dropdown
                                  id={`dropdown-${id}`}
                                  items={dropdownItems}
                                  label=""
                                  light
                                  onChange={(e) => {
                                    handleAddNewInputChange(
                                      e.selectedItem.label,
                                      header
                                    );
                                  }}
                                  selectedItem={dropdownItems.find(
                                    (item) =>
                                      item.label === newRowValues[header]
                                  )}
                                  size="sm"
                                />
                              ) : (
                                <TextInput
                                  id={`text-input-${id}`}
                                  labelText=""
                                  light
                                  onChange={(e) =>
                                    handleAddNewInputChange(
                                      e.target.value,
                                      header
                                    )
                                  }
                                  size="sm"
                                  warn={
                                    inputValueError &&
                                    inputValueError.id === header
                                  }
                                  warnText={
                                    inputValueError &&
                                    inputValueError.id === header
                                      ? inputValueError.error
                                      : null
                                  }
                                />
                              );
                              return (
                                <TableCell
                                  className={
                                    row.id === ROW_HEADER_ID_ADD_NEW
                                      ? 'table-container__add-new-input'
                                      : null
                                  }
                                  key={id}
                                >
                                  {row.id === ROW_HEADER_ID_ADD_NEW ? (
                                    addNewComponent
                                  ) : (
                                    <OverflowTooltip
                                      direction="bottom"
                                      tooltipText={value}
                                    >
                                      {value}
                                    </OverflowTooltip>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })
                    ) : (
                      <tr className="table-container__no-data-row">
                        <td className="table-container__no-data-cell">
                          <div className="table-container__no-data-container">
                            <div className="table-container__no-data-image">
                              <img
                                src={
                                  isFiltered
                                    ? noSearchResultsForTable
                                    : noDataForTable
                                }
                                alt="No data"
                              />
                            </div>
                            <div className="table-container__no-data-message">
                              {isFiltered
                                ? 'There were no results found.'
                                : 'There is no data.'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
        )}
        <footer className="table-footer">
          <div className="table-footer__label">Data set:</div>
          <div className="table-footer__value">{`${numRows} row${
            numRows === 1 ? '' : 's'
          }`}</div>
        </footer>
      </div>
    </>
  );
};

TupleTable.propTypes = {
  receiveData: PropTypes.func.isRequired,
  sendData: PropTypes.func.isRequired,
  action: PropTypes.string.isRequired,
  schema: PropTypes.object.isRequired
};

export default TupleTable;
